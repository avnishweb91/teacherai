package com.edu.teacherai.service;

import com.edu.teacherai.dto.TemplateParseRequest;
import com.edu.teacherai.dto.TemplateParseResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Service
public class TemplateService {

    private static final Logger log = LoggerFactory.getLogger(TemplateService.class);

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${openai.api.key}")
    private String apiKey;
    @Value("${openai.api.url}")
    private String apiUrl;

    public TemplateService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public TemplateParseResponse parseTemplate(TemplateParseRequest req) {
        String systemPrompt = """
            You are an expert at analyzing document templates used in Indian schools.
            Your job is to identify all fillable fields in a given document/form.
            Always respond with ONLY valid JSON — no explanation, no markdown, no code fences.
            """;

        String userPrompt = buildUserPrompt(req);
        List<Map<String, Object>> messages = buildMessages(req, systemPrompt, userPrompt);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", "gpt-4o");
        body.put("messages", messages);
        body.put("temperature", 0.2);
        body.put("max_tokens", 1200);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                    apiUrl, HttpMethod.POST,
                    new HttpEntity<>(body, headers),
                    Map.class
            );

            if (response.getBody() == null) throw new RuntimeException("Empty OpenAI response");

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> choices = (List<Map<String, Object>>) response.getBody().get("choices");
            if (choices == null || choices.isEmpty()) throw new RuntimeException("No choices in response");

            @SuppressWarnings("unchecked")
            Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
            String content = (String) message.get("content");

            return parseJsonResponse(content.trim());

        } catch (Exception e) {
            log.error("Template parsing failed", e);
            return fallbackResponse(req.fileType);
        }
    }

    private String buildUserPrompt(TemplateParseRequest req) {
        if ("image".equals(req.fileType)) {
            return """
                Analyze this image of a document template/form.
                Identify every blank field, labeled space, or data entry point.
                Return ONLY this JSON structure:
                {
                  "documentType": "brief description of what this document is",
                  "fields": [
                    {"key": "snake_case_key", "label": "Human Readable Label", "type": "text|date|number|textarea"}
                  ],
                  "hasTable": true or false,
                  "tableColumns": ["Column1", "Column2"]
                }
                Rules:
                - key must be unique snake_case
                - type "date" for any date field, "number" for marks/roll number, "textarea" for multi-line content, "text" for everything else
                - tableColumns only if hasTable is true, otherwise empty array []
                - Include ALL visible blank fields
                """;
        } else {
            return """
                Analyze this document template content and identify every fillable field, blank space, or placeholder.
                Document content:
                ---
                %s
                ---
                Return ONLY this JSON structure:
                {
                  "documentType": "brief description of what this document is",
                  "fields": [
                    {"key": "snake_case_key", "label": "Human Readable Label", "type": "text|date|number|textarea"}
                  ],
                  "hasTable": true or false,
                  "tableColumns": ["Column1", "Column2"]
                }
                Rules:
                - key must be unique snake_case
                - type "date" for any date field, "number" for marks/roll number, "textarea" for multi-line content, "text" for everything else
                - tableColumns only if hasTable is true, otherwise empty array []
                - Treat underscores (___), blank lines after labels, and [FIELD] markers as fillable fields
                - Include ALL fields you find
                """.formatted(req.textContent != null ? req.textContent : "");
        }
    }

    private List<Map<String, Object>> buildMessages(TemplateParseRequest req, String systemPrompt, String userPrompt) {
        List<Map<String, Object>> messages = new ArrayList<>();

        Map<String, Object> systemMsg = new LinkedHashMap<>();
        systemMsg.put("role", "system");
        systemMsg.put("content", systemPrompt);
        messages.add(systemMsg);

        Map<String, Object> userMsg = new LinkedHashMap<>();
        userMsg.put("role", "user");

        if ("image".equals(req.fileType) && req.base64Image != null && !req.base64Image.isBlank()) {
            String mime = req.mimeType != null ? req.mimeType : "image/jpeg";
            List<Map<String, Object>> contentParts = new ArrayList<>();

            Map<String, Object> textPart = new LinkedHashMap<>();
            textPart.put("type", "text");
            textPart.put("text", userPrompt);
            contentParts.add(textPart);

            Map<String, Object> imagePart = new LinkedHashMap<>();
            imagePart.put("type", "image_url");
            Map<String, String> imageUrl = new LinkedHashMap<>();
            imageUrl.put("url", "data:" + mime + ";base64," + req.base64Image);
            imageUrl.put("detail", "high");
            imagePart.put("image_url", imageUrl);
            contentParts.add(imagePart);

            userMsg.put("content", contentParts);
        } else {
            userMsg.put("content", userPrompt);
        }

        messages.add(userMsg);
        return messages;
    }

    @SuppressWarnings("unchecked")
    private TemplateParseResponse parseJsonResponse(String json) throws Exception {
        String clean = json;
        if (clean.startsWith("```")) {
            clean = clean.replaceAll("```[a-z]*\\n?", "").replace("```", "").trim();
        }
        Map<String, Object> map = objectMapper.readValue(clean, Map.class);

        TemplateParseResponse resp = new TemplateParseResponse();
        resp.documentType = (String) map.getOrDefault("documentType", "Document");
        resp.hasTable = Boolean.TRUE.equals(map.get("hasTable"));
        resp.tableColumns = (List<String>) map.getOrDefault("tableColumns", List.of());

        List<Map<String, String>> rawFields = (List<Map<String, String>>) map.getOrDefault("fields", List.of());
        resp.fields = rawFields.stream().map(f -> {
            TemplateParseResponse.TemplateField tf = new TemplateParseResponse.TemplateField();
            tf.key = f.getOrDefault("key", "field_" + UUID.randomUUID().toString().substring(0, 6));
            tf.label = f.getOrDefault("label", tf.key);
            tf.type = f.getOrDefault("type", "text");
            return tf;
        }).toList();

        return resp;
    }

    private TemplateParseResponse fallbackResponse(String fileType) {
        TemplateParseResponse resp = new TemplateParseResponse();
        resp.documentType = "Document";
        resp.hasTable = false;
        resp.tableColumns = List.of();

        TemplateParseResponse.TemplateField f1 = new TemplateParseResponse.TemplateField();
        f1.key = "teacher_name"; f1.label = "Teacher Name"; f1.type = "text";

        TemplateParseResponse.TemplateField f2 = new TemplateParseResponse.TemplateField();
        f2.key = "school_name"; f2.label = "School Name"; f2.type = "text";

        TemplateParseResponse.TemplateField f3 = new TemplateParseResponse.TemplateField();
        f3.key = "date"; f3.label = "Date"; f3.type = "date";

        resp.fields = List.of(f1, f2, f3);
        return resp;
    }
}
