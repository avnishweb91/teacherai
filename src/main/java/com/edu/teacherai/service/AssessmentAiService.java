package com.edu.teacherai.service;

import com.edu.teacherai.dto.AssessmentRequest;
import com.edu.teacherai.dto.OpenAiRequest;
import com.edu.teacherai.dto.OpenAiResponse;
import com.edu.teacherai.dto.SectionConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Service
public class AssessmentAiService {

    private static final Logger log = LoggerFactory.getLogger(AssessmentAiService.class);

    @Value("${openai.api.key}")
    private String apiKey;

    @Value("${openai.api.url}")
    private String apiUrl;

    private final RestTemplate restTemplate;

    public AssessmentAiService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    /* =========================================================
       GENERATE QUESTION PAPER
       ========================================================= */
    public String generateAssessment(AssessmentRequest req) {

        int grade = Integer.parseInt(req.getGrade());

        String pedagogyRules = getPedagogyRulesByGrade(grade);
        String examPatternRules = getExamPatternRules(req.getExamType());
        String sectionRules = buildSectionRules(req.getSections());

        String prompt = """
            You are an experienced %s school teacher and professional exam paper setter.
            
            IMPORTANT — READ CAREFULLY:
            The following HEADER FORMAT is FIXED and MUST be printed FIRST.
            - Do NOT change labels
            - Do NOT change order
            - Do NOT reword anything
            - Do NOT remove underscores
            - ONLY replace the VALUES based on inputs
            
            ================ Questions Paper =================
            
            **Class:** %s  
            **Subject:** %s  
            **Topic:** %s  
            **Date:** ___________  
            **Time:** ___________  
             
            
            ================================================================
            
            Generate a %s question paper STRICTLY following %s syllabus guidelines.
            Language of the paper MUST be: %s
            
            ================ PEDAGOGY RULES ================
            %s
            
            ================ EXAM PATTERN RULES ============
            %s
            
            ================ SECTION STRUCTURE ==============
            %s
            
            MANDATORY RULES:
            - Match the cognitive level of Class %s students
            - Follow official exam tone and structure of %s
            - Clearly number all questions
            - Start sections AFTER the header
            - Do NOT repeat the header again
            - Do NOT include answers
            """.formatted(
                req.getSyllabus(),           // teacher identity
                req.getGrade(),              // Class
                req.getSubject(),            // Subject
                req.getTopic(),              // Topic
                req.getExamType(),           // Exam type
                req.getSyllabus(),           // Board
                req.getLanguage(),           // Language
                pedagogyRules,
                examPatternRules,
                sectionRules,
                req.getGrade(),
                req.getSyllabus()
        );


        return callOpenAi(prompt, "You are a strict and accurate exam paper generator.");
    }

    /* =========================================================
       PEDAGOGY RULES
       ========================================================= */
    private String getPedagogyRulesByGrade(int grade) {

        if (grade <= 2) {
            return """
        - VERY simple language
        - NO long answers
        - Image-based, oral or one-word questions only
        - Counting, matching, object identification
        """;
                } else if (grade <= 5) {
                    return """
        - Simple language
        - At least 2–3 image-based questions
        - Image format MUST be:
          [IMAGE_TAG: apple_count_3]
        - Focus on observation and recall
        """;
                } else if (grade <= 8) {
                    return """
        - Concept-based questions
        - Mix of factual and reasoning
        """;
                } else if (grade <= 10) {
                    return """
        - Application-based questions
        - Analytical thinking
        """;
                } else {
                    return """
        - HOTS questions
        - Case-based & analytical questions
        """;
                }
    }

    /* =========================================================
       EXAM PATTERN RULES
       ========================================================= */
    private String getExamPatternRules(String examType) {

        if (examType == null) return "";

        String normalized = examType.toUpperCase();

        if (normalized.contains("UNIT")) {
            return """
            - Short syllabus
            - Mostly MCQs & short answers
            
            """;
                    }
                    if (normalized.contains("MONTH")) {
                        return """
            - Balanced difficulty
            - One limited long answer
           
            """;
                    }
                    if (normalized.contains("MID")) {
                        return """
            - Balanced sections
            - Conceptual understanding
            
            """;
                    }
                    if (normalized.contains("FINAL")) {
                        return """
            - Full syllabus coverage
            - Analytical & application-based
            
            """;
                    }

                    return "";
                }

    /* =========================================================
       SECTION RULES (A–E)
       ========================================================= */
    private String buildSectionRules(List<SectionConfig> sections) {

        if (sections == null || sections.isEmpty()) {
            return "- Teacher has not defined custom sections";
        }

        StringBuilder sb = new StringBuilder();

        for (SectionConfig s : sections) {
            sb.append("""
                SECTION %s:
                - Question Type: %s
                - Number of Questions: %d
                - Marks per Question: %d
                
                """.formatted(
                    s.getSectionLabel(),
                    s.getQuestionType(),
                    s.getQuestionCount(),
                    s.getMarksPerQuestion()
            ));
        }

        return sb.toString();
    }

    /* =========================================================
       ANSWER KEY
       ========================================================= */
    public String generateAnswerKey(String questionPaper, String language) {

        String prompt = """
            Generate a COMPLETE answer key.
            
            Rules:
            - Language: %s
            - Keep EXACT numbering
            - MCQs: correct option
            - Short answers: 2–3 lines
            - Long answers: structured
            - ONLY answers
            
            QUESTION PAPER:
            %s
            """.formatted(language, questionPaper);

        return callOpenAi(prompt, "You generate accurate answer keys.");
    }

    /* =========================================================
       OPENAI CALL
       ========================================================= */
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

            return response.getBody()
                    .choices
                    .get(0)
                    .message
                    .content;

        } catch (Exception e) {
            log.error("OpenAI request failed: {}", e.getMessage());
            throw new RuntimeException("OpenAI request failed: " + e.getMessage());
        }
    }
}
