package com.edu.teacherai.service;

import com.edu.teacherai.dto.NoticeRequest;
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
public class NoticeService {

    private static final Logger log = LoggerFactory.getLogger(NoticeService.class);

    private final RestTemplate restTemplate;

    @Value("${openai.api.key}")
    private String apiKey;
    @Value("${openai.api.url}")
    private String apiUrl;

    public NoticeService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public String generateNotice(NoticeRequest req) {

        String langInstruction = "Hindi".equalsIgnoreCase(req.getLanguage())
                ? "Write the entire notice in Hindi (Devanagari script)."
                : "Write the entire notice in formal English.";

        String toneInstruction = "Friendly".equalsIgnoreCase(req.getTone())
                ? "Use a warm, friendly yet professional tone."
                : "Use a strictly formal, official tone.";

        String prompt = """
            You are a school administrator writing an official parent circular/notice.

            School: %s
            Notice Type: %s
            Addressed to: Parents of %s
            Date: %s
            Key Details provided by teacher: %s
            %s
            %s
            %s

            Write ONLY the body of the notice — starting from "Dear Parent," and ending before the sign-off.
            Do NOT include school name header, circular number, date line, address line, or sign-off — those are added separately.
            Use clear paragraphs. No bullet points unless listing items (like exam schedule).
            Keep it concise — 3 to 5 paragraphs maximum.
            End with a polite request for acknowledgement slip to be returned.
            """.formatted(
                req.getSchoolName(),
                req.getNoticeType(),
                req.getTargetClass() != null ? req.getTargetClass() : "All Classes",
                req.getNoticeDate(),
                req.getKeyDetails() != null ? req.getKeyDetails() : "Not specified",
                langInstruction,
                toneInstruction,
                req.getExtraInstructions() != null && !req.getExtraInstructions().isBlank()
                        ? "Additional instructions: " + req.getExtraInstructions() : ""
        );

        OpenAiRequest request = new OpenAiRequest();
        request.model = "gpt-4o-mini";
        request.messages = List.of(
                Map.of("role", "system", "content", "You are a school administrator drafting official parent notices."),
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
                throw new RuntimeException("Empty OpenAI response");
            }

            String content = response.getBody().choices.get(0).message.content;
            if (content == null || content.isBlank()) throw new RuntimeException("Blank AI content");
            return content.trim();

        } catch (Exception e) {
            log.error("Notice generation failed", e);
            return fallbackNotice(req);
        }
    }

    private String fallbackNotice(NoticeRequest req) {
        return """
            Dear Parent,

            We wish to inform you about an important matter regarding %s.

            %s

            We request all parents to take note of the above and cooperate with the school administration.

            Kindly sign and return the acknowledgement slip below at the earliest.

            Thank you for your continued support.
            """.formatted(
                req.getNoticeType() != null ? req.getNoticeType() : "school activities",
                req.getKeyDetails() != null ? req.getKeyDetails() : "Please contact the school office for further details."
        );
    }
}
