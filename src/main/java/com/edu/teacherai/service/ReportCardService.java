package com.edu.teacherai.service;

import com.edu.teacherai.dto.OpenAiRequest;
import com.edu.teacherai.dto.OpenAiResponse;
import com.edu.teacherai.dto.ReportCardRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;
import java.util.StringJoiner;

@Service
public class ReportCardService {

    private static final Logger log = LoggerFactory.getLogger(ReportCardService.class);

    private final RestTemplate restTemplate;

    @Value("${openai.api.key}")
    private String apiKey;
    @Value("${openai.api.url}")
    private String apiUrl;

    public ReportCardService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public String generateRemark(ReportCardRequest req) {

        // Build subject performance summary
        StringJoiner subjectLines = new StringJoiner(", ");
        int totalObtained = 0;
        int totalMax = 0;
        String bestSubject = null;
        int bestScore = -1;
        String weakSubject = null;
        int weakScore = Integer.MAX_VALUE;

        if (req.getSubjectMarks() != null) {
            for (Map.Entry<String, Integer> e : req.getSubjectMarks().entrySet()) {
                String sub = e.getKey();
                int marks = e.getValue();
                int max = req.getMaxMarks() > 0 ? req.getMaxMarks() : 100;
                int pct = (int) Math.round((marks * 100.0) / max);
                subjectLines.add(sub + ": " + marks + "/" + max + " (" + pct + "%)");
                totalObtained += marks;
                totalMax += max;
                if (marks > bestScore) { bestScore = marks; bestSubject = sub; }
                if (marks < weakScore) { weakScore = marks; weakSubject = sub; }
            }
        }

        int overallPct = totalMax > 0 ? (int) Math.round((totalObtained * 100.0) / totalMax) : 0;

        String prompt = """
            You are a caring, experienced class teacher writing a personalized remark for a student's report card.

            Student: %s | Class: %s-%s | Term: %s %d
            Subjects: %s
            Overall: %d%% | Attendance: %.1f%%

            Write a warm, personalized 3–4 sentence remark for this student's report card.
            - Address the student by first name
            - Mention their strongest subject (%s) positively
            - Gently encourage improvement in %s if needed
            - Include an observation about attendance if it is below 80%%
            - End with an encouraging, motivating sentence
            - Write in formal, school report card tone
            - Do NOT use bullet points or headings — plain paragraph only
            """.formatted(
                req.getStudentName(),
                req.getGrade(), req.getSection(),
                req.getTerm(), req.getYear(),
                subjectLines.toString(),
                overallPct, req.getAttendance(),
                bestSubject != null ? bestSubject : "all subjects",
                weakSubject != null ? weakSubject : "weaker areas"
        );

        OpenAiRequest request = new OpenAiRequest();
        request.model = "gpt-4o-mini";
        request.messages = List.of(
                Map.of("role", "system", "content", "You are a school class teacher writing report card remarks."),
                Map.of("role", "user", "content", prompt)
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        try {
            ResponseEntity<OpenAiResponse> response = restTemplate.exchange(
                    apiUrl, HttpMethod.POST,
                    new HttpEntity<>(request, headers),
                    OpenAiResponse.class
            );

            if (response.getBody() == null
                    || response.getBody().choices == null
                    || response.getBody().choices.isEmpty()) {
                throw new RuntimeException("Empty response from OpenAI");
            }

            String content = response.getBody().choices.get(0).message.content;
            if (content == null || content.isBlank()) throw new RuntimeException("Blank AI content");
            return content.trim();

        } catch (Exception e) {
            log.error("ReportCard remark generation failed", e);
            return fallbackRemark(req.getStudentName(), overallPct);
        }
    }

    private String fallbackRemark(String name, int pct) {
        String firstName = name != null && name.contains(" ") ? name.split(" ")[0] : name;
        if (pct >= 85) {
            return firstName + " has performed exceptionally well this term, demonstrating a thorough understanding across all subjects. " +
                   "The consistent effort and dedication shown in class is truly commendable. " +
                   "With this level of commitment, " + firstName + " is well on track to achieve outstanding results. Keep up the excellent work!";
        } else if (pct >= 60) {
            return firstName + " has shown satisfactory progress this term and demonstrates a good understanding of most subjects. " +
                   "With continued focus and regular practice, there is great potential for further improvement. " +
                   "I encourage " + firstName + " to revise regularly and ask questions in class. Wishing you continued success!";
        } else {
            return firstName + " has shown effort this term and there is room for significant improvement. " +
                   "I encourage " + firstName + " to dedicate more time to studies and seek help whenever needed. " +
                   "With consistent hard work and determination, I am confident in the ability to improve. Keep going — every effort counts!";
        }
    }
}
