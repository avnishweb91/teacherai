package com.edu.teacherai.service;

import com.edu.teacherai.config.OpenAiProperties;
import com.edu.teacherai.dto.LessonRequest;
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
public class LessonAiService {

    private static final Logger log = LoggerFactory.getLogger(LessonAiService.class);

    private final RestTemplate restTemplate;
    private final OpenAiProperties props;

    @Value("${openai.api.key}")
    private String apiKey;
    @Value("${openai.api.url}")
    private String apiUrl;

    public LessonAiService(RestTemplate restTemplate, OpenAiProperties props) {
        this.restTemplate = restTemplate;
        this.props = props;

        log.info("OpenAI key loaded = {}", props.getKey() != null);
        log.info("OpenAI URL = {}", props.getUrl());
    }

    public String generateLesson(LessonRequest req) {

        String prompt = """
        You are an experienced %s school teacher.

        Generate a structured lesson plan STRICTLY in %s.

        Class: %s
        Subject: %s
        Topic: %s
        Duration: %d minutes

        Include:
        - Learning objectives
        - Explanation with examples
        - Activity
        - Homework
        - Assessment questions
        """.formatted(
                req.getSyllabus(),
                req.getLanguage(),
                req.getGrade(),
                req.getSubject(),
                req.getTopic(),
                req.getDuration()
        );

        OpenAiRequest request = new OpenAiRequest();
        request.model = "gpt-4o-mini";
        request.messages = List.of(
                Map.of("role", "system", "content", "You are a school teacher."),
                Map.of("role", "user", "content", prompt)
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        try {
            ResponseEntity<OpenAiResponse> response =
                    restTemplate.exchange(
                            apiUrl,
                            HttpMethod.POST,
                            new HttpEntity<>(request, headers),
                            OpenAiResponse.class
                    );

            if (response.getBody() == null ||
                    response.getBody().choices == null ||
                    response.getBody().choices.isEmpty()) {
                throw new RuntimeException("Empty response from OpenAI");
            }

            // ✅ THIS IS THE LINE YOU ASKED ABOUT
            String content = response.getBody().choices.get(0).message.content;

            // ✅ SAFETY CHECK (MANDATORY)
            if (content == null || content.isBlank()) {
                throw new RuntimeException("Empty AI response");
            }

            return content;

        } catch (Exception e) {
            log.error("OpenAI lesson generation failed", e);
            return fallbackLesson();
        }
    }


    private String fallbackLesson() {
        log.warn("Returning fallback lesson");

        return """
        Lesson Plan (Fallback)

        Learning Objectives:
        - Understand the topic fundamentals

        Explanation:
        Teacher explains concept using examples.

        Activity:
        Classroom discussion.

        Homework:
        Practice questions from textbook.

        Assessment:
        Short quiz and oral questions.
        """;
    }
}
