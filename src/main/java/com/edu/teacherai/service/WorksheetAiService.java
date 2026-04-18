package com.edu.teacherai.service;

import com.edu.teacherai.dto.OpenAiRequest;
import com.edu.teacherai.dto.OpenAiResponse;
import com.edu.teacherai.dto.WorksheetRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Service
public class WorksheetAiService {

    private static final Logger log = LoggerFactory.getLogger(WorksheetAiService.class);

    @Value("${openai.api.key}")
    private String apiKey;

    @Value("${openai.api.url}")
    private String apiUrl;

    private final RestTemplate restTemplate;

    public WorksheetAiService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public String generateWorksheet(WorksheetRequest req) {

        String prompt = """
            You are an experienced %s school teacher creating a classroom worksheet.

            ============= WORKSHEET HEADER (print exactly) =============
            **Class:** %s
            **Subject:** %s
            **Topic:** %s
            **Name:** ___________________________  **Date:** ___________
            **Roll No:** ________  **Section:** ________
            ============================================================

            Generate a %s worksheet for Class %s students on the topic "%s".

            RULES:
            - Worksheet Type: %s
            - Difficulty: %s
            - Language: %s
            - Number of questions: %d
            - Board/Syllabus: %s
            - Leave blank spaces for students to fill answers
            - Number all questions clearly
            - At the end, add a section: "Answer Key" with correct answers
            - Format must be clean and print-ready
            - Do NOT include the answer key inline — put it after all questions
            """.formatted(
                req.getSyllabus(),
                req.getGrade(), req.getSubject(), req.getTopic(),
                req.getSubject(),
                req.getGrade(), req.getTopic(),
                req.getWorksheetType(),
                req.getDifficulty(),
                req.getLanguage(),
                req.getQuestionCount(),
                req.getSyllabus()
        );

        return callOpenAi(prompt, "You are a professional worksheet creator for Indian school teachers.");
    }

    private String callOpenAi(String prompt, String systemRole) {
        OpenAiRequest request = new OpenAiRequest();
        request.model = "gpt-4o-mini";
        request.messages = List.of(
                Map.of("role", "system", "content", systemRole),
                Map.of("role", "user", "content", prompt)
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        try {
            ResponseEntity<OpenAiResponse> response =
                    restTemplate.exchange(apiUrl, HttpMethod.POST,
                            new HttpEntity<>(request, headers),
                            OpenAiResponse.class);
            return response.getBody().choices.get(0).message.content;
        } catch (Exception e) {
            log.error("OpenAI worksheet request failed: {}", e.getMessage());
            throw new RuntimeException("OpenAI request failed: " + e.getMessage());
        }
    }
}
