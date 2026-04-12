package com.edu.teacherai.service;

import com.edu.teacherai.dto.OpenAiRequest;
import com.edu.teacherai.dto.OpenAiResponse;
import com.edu.teacherai.dto.PlannerRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class PlannerAiService {

    private static final Logger log = LoggerFactory.getLogger(PlannerAiService.class);

    private final RestTemplate restTemplate;

    @Value("${openai.api.key}")
    private String apiKey;

    @Value("${openai.api.url}")
    private String apiUrl;

    private static final DateTimeFormatter DAY_FMT = DateTimeFormatter.ofPattern("d MMM");

    public PlannerAiService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    /* ── Build school day list for the month ── */
    private List<String> getSchoolDays(int year, int month, Set<Integer> holidayDays) {
        LocalDate start = LocalDate.of(year, month, 1);
        LocalDate end   = start.withDayOfMonth(start.lengthOfMonth());
        List<String> days = new ArrayList<>();
        for (LocalDate d = start; !d.isAfter(end); d = d.plusDays(1)) {
            DayOfWeek dow = d.getDayOfWeek();
            if (dow != DayOfWeek.SATURDAY && dow != DayOfWeek.SUNDAY) {
                days.add(d.format(DAY_FMT));
            }
        }
        return days;
    }

    /* ── Parse holiday list ["2:Gandhi Jayanti", "14:Festival break"] ── */
    private Map<String, String> parseHolidays(List<String> holidays, int year, int month) {
        Map<String, String> map = new LinkedHashMap<>();
        if (holidays == null) return map;
        for (String h : holidays) {
            if (h == null || !h.contains(":")) continue;
            String[] parts = h.split(":", 2);
            try {
                int day = Integer.parseInt(parts[0].trim());
                String name = parts[1].trim();
                LocalDate d = LocalDate.of(year, month, day);
                map.put(d.format(DAY_FMT), name);
            } catch (Exception ignored) {}
        }
        return map;
    }

    /* ── Main generate method ── */
    public String generatePlanner(PlannerRequest req) {

        // 1. Collect holiday days (by day number)
        Set<Integer> holidayDayNums = new HashSet<>();
        Map<String, String> holidayMap = parseHolidays(req.getHolidays(), req.getYear(), req.getMonth());
        if (req.getHolidays() != null) {
            for (String h : req.getHolidays()) {
                if (h != null && h.contains(":")) {
                    try { holidayDayNums.add(Integer.parseInt(h.split(":")[0].trim())); }
                    catch (Exception ignored) {}
                }
            }
        }

        // 2. Get all weekdays in month
        List<String> schoolDays = getSchoolDays(req.getYear(), req.getMonth(), holidayDayNums);

        // 3. Build holiday annotation
        StringBuilder holidayNotes = new StringBuilder();
        for (Map.Entry<String, String> e : holidayMap.entrySet()) {
            holidayNotes.append("- ").append(e.getKey()).append(" → ").append(e.getValue()).append("\n");
        }

        // 4. Custom topic hints
        String langHint  = notEmpty(req.getLanguageTopics(),  "age-appropriate language activities");
        String cogHint   = notEmpty(req.getCognitiveTopics(), "number/shape/concept activities");
        String artHint   = notEmpty(req.getCreativeTopics(),  "drawing, colouring, clay, craft");
        String physHint  = notEmpty(req.getPhysicalTopics(),  "running, jumping, balancing, games");
        String socialHint= notEmpty(req.getSocialTopics(),    "sharing, kindness, teamwork, respect");

        // 5. Build prompt
        String monthName = LocalDate.of(req.getYear(), req.getMonth(), 1)
                .getMonth().getDisplayName(java.time.format.TextStyle.FULL, Locale.ENGLISH);

        String prompt = """
You are an experienced %s school curriculum planner.

Generate a DAY-WISE monthly planner for:
  Class/Grade : %s
  Board       : %s
  Month       : %s %d

School days this month (weekdays only):
%s

Holidays (mark these with "—" in all activity columns):
%s

COLUMNS to fill for each school day:
1. Assembly       — alternate between "Prayer & Thought" (odd school days) and "Prayer & Rhyme" (even school days)
2. Language Dev   — topics: %s
3. Cognitive Dev  — topics: %s
4. Next Time      — cycle through: Recap → Practice → Reinforce → Revision → Assessment → Recall
5. Creative Art   — topics: %s
6. Physical Dev   — topics: %s
7. Social Growth  — topics: %s

RULES:
- Activities must be age-appropriate for %s students.
- Progress logically through the month (introduce → practice → revise → assess).
- For holidays: set isHoliday=true and all activity fields to "—".
- Return ONLY a valid JSON array, no markdown, no explanation.

EXACT JSON FORMAT (one object per school day):
[
  {
    "date": "1 %s",
    "isHoliday": false,
    "holidayName": "",
    "assembly": "Prayer & Thought",
    "language": "Alphabet revision",
    "cognitive": "Counting 1–50",
    "nextTime": "Recap",
    "creativeArt": "Colouring (Fruits)",
    "physical": "Free play",
    "social": "Greeting habits"
  }
]
""".formatted(
                req.getBoard(), req.getGrade(), req.getBoard(),
                monthName, req.getYear(),
                String.join("\n", schoolDays),
                holidayNotes.isEmpty() ? "None" : holidayNotes,
                langHint, cogHint, artHint, physHint, socialHint,
                req.getGrade(),
                monthName.substring(0, 3)
        );

        OpenAiRequest aiReq = new OpenAiRequest();
        aiReq.model = "gpt-4o-mini";
        aiReq.messages = List.of(
                Map.of("role", "system", "content", "You are a school curriculum expert. Return only valid JSON."),
                Map.of("role", "user", "content", prompt)
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        try {
            ResponseEntity<OpenAiResponse> response = restTemplate.exchange(
                    apiUrl, HttpMethod.POST,
                    new HttpEntity<>(aiReq, headers),
                    OpenAiResponse.class
            );

            if (response.getBody() == null ||
                    response.getBody().choices == null ||
                    response.getBody().choices.isEmpty()) {
                throw new RuntimeException("Empty response from OpenAI");
            }

            String content = response.getBody().choices.get(0).message.content;
            if (content == null || content.isBlank()) throw new RuntimeException("Blank AI response");

            // Strip markdown code fences if present
            content = content.trim();
            if (content.startsWith("```")) {
                content = content.replaceAll("^```[a-z]*\\n?", "").replaceAll("```$", "").trim();
            }

            return content;

        } catch (Exception e) {
            log.error("Planner generation failed", e);
            throw new RuntimeException("Failed to generate planner: " + e.getMessage());
        }
    }

    private String notEmpty(String val, String fallback) {
        return (val != null && !val.isBlank()) ? val : fallback;
    }
}
