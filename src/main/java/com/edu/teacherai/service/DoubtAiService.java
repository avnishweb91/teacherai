package com.edu.teacherai.service;

import com.edu.teacherai.dto.DoubtRequest;
import com.edu.teacherai.dto.OpenAiRequest;
import com.edu.teacherai.dto.OpenAiResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Service
public class DoubtAiService {

    private static final Logger log = LoggerFactory.getLogger(DoubtAiService.class);

    @Value("${openai.api.key}")
    private String apiKey;

    @Value("${openai.api.url}")
    private String apiUrl;

    private final RestTemplate restTemplate;

    public DoubtAiService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public String solveDoubt(DoubtRequest req) {

        String prompt = """
            A teacher is asking a subject-matter question to prepare for their class.

            Subject: %s
            Class Level: %s
            Language: %s
            Teacher's Question: %s

            Instructions:
            - Give a clear, accurate, teacher-friendly explanation
            - Structure the answer as:
              1. Simple explanation (2-3 lines)
              2. Detailed explanation with key concepts
              3. Example or analogy to help explain to students
              4. Common student misconceptions to watch out for (if any)
              5. How to teach this topic effectively (1-2 tips)
            - Use %s language
            - Tailor depth to Class %s level
            - Be concise but thorough
            """.formatted(
                req.getSubject(),
                req.getGrade(),
                req.getLanguage(),
                req.getQuestion(),
                req.getLanguage(),
                req.getGrade()
        );

        return callOpenAi(prompt, "You are an expert educator helping teachers understand concepts deeply so they can teach better.");
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
            log.error("OpenAI doubt request failed: {}", e.getMessage());
            throw new RuntimeException("OpenAI request failed: " + e.getMessage());
        }
    }
}
