package com.edu.teacherai.service;

import org.springframework.stereotype.Service;


@SuppressWarnings("unused")
@Service
public class BoardRuleService {

    public String examPatternRules(String board, String examType) {

        if ("CBSE".equalsIgnoreCase(board)) {
            return """
            CBSE Exam Pattern Rules:
            - Formal academic tone
            - Competency-based questions
            - Mix of MCQ, Short, Long answers
            - Marks distribution must be clear
            """;
        }

        if ("ICSE".equalsIgnoreCase(board)) {
            return """
            ICSE Exam Pattern Rules:
            - Descriptive and analytical questions
            - English language precision
            - Avoid overly short answers
            """;
        }

        if ("BIHAR".equalsIgnoreCase(board)) {
            return """
            Bihar Board Exam Pattern Rules:
            - Simple language
            - Direct questions
            - Avoid complex case studies
            """;
        }

        return "";
    }
}
