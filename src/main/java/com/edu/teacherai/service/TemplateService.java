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
                Analyze this image of a document template/form used in an Indian school.
                This could be a timetable, attendance sheet, report card, circular, mark sheet, or any other school document.

                IMPORTANT: Even if the document is mostly a table (like a timetable or routine chart),
                you MUST detect its structure. Table cells that are empty or contain dashes are fillable.

                Return ONLY this JSON (no markdown, no explanation):
                {
                  "documentType": "e.g. Class Timetable / Attendance Sheet / Report Card",
                  "fields": [
                    {"key": "snake_case_key", "label": "Human Readable Label", "type": "text|date|number|textarea"}
                  ],
                  "hasTable": true or false,
                  "tableColumns": ["Col1", "Col2", ...],
                  "tableRowHeaders": ["Row1", "Row2", ...],
                  "design": {
                    "titleText": "exact main title text visible in the document",
                    "headerBgColor": "hex color of table header row background e.g. #1a237e",
                    "headerTextColor": "hex color of table header text e.g. #ffffff",
                    "altRowBgColor": "hex color for alternating row background, empty string if none",
                    "borderColor": "hex color of table borders e.g. #3949ab",
                    "pageBgColor": "hex color of page/background e.g. #ffffff"
                  }
                }
                Rules:
                - fields = header-level info like School Name, Class, Section, Date, Teacher Name etc. Can be empty array [] if none.
                - tableColumns = ALL column headers in the table (e.g. for timetable: ["Day","Period 1","Period 2",...])
                - tableRowHeaders = the fixed row labels in the leftmost column (e.g. ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"] for a timetable). Empty array [] if rows have no fixed labels.
                - hasTable must be true if there is ANY grid, table, or schedule structure in the document
                - For design colors: pick the actual colors you see. If unsure use #374151 for header, #ffffff for text.
                - Include ALL columns and ALL row headers you can see
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
        resp.tableRowHeaders = (List<String>) map.getOrDefault("tableRowHeaders", List.of());

        List<Map<String, String>> rawFields = (List<Map<String, String>>) map.getOrDefault("fields", List.of());
        resp.fields = rawFields.stream().map(f -> {
            TemplateParseResponse.TemplateField tf = new TemplateParseResponse.TemplateField();
            tf.key = f.getOrDefault("key", "field_" + UUID.randomUUID().toString().substring(0, 6));
            tf.label = f.getOrDefault("label", tf.key);
            tf.type = f.getOrDefault("type", "text");
            return tf;
        }).toList();

        Map<String, Object> rawDesign = (Map<String, Object>) map.get("design");
        if (rawDesign != null) {
            TemplateParseResponse.DesignInfo d = new TemplateParseResponse.DesignInfo();
            d.titleText       = (String) rawDesign.getOrDefault("titleText", resp.documentType);
            d.headerBgColor   = (String) rawDesign.getOrDefault("headerBgColor", "#374151");
            d.headerTextColor = (String) rawDesign.getOrDefault("headerTextColor", "#ffffff");
            d.altRowBgColor   = (String) rawDesign.getOrDefault("altRowBgColor", "");
            d.borderColor     = (String) rawDesign.getOrDefault("borderColor", "#d1d5db");
            d.pageBgColor     = (String) rawDesign.getOrDefault("pageBgColor", "#ffffff");
            resp.design = d;
        }

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
