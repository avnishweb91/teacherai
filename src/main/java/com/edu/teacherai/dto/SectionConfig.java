package com.edu.teacherai.dto;

import lombok.Data;

@Data
public class SectionConfig {

    private String sectionLabel;
    // A, B, C, D, E

    private String questionType;
    // MCQ, SHORT, LONG, ASSERTION, REASONING, PUZZLE

    private int questionCount;

    private int marksPerQuestion;

    public String getSectionLabel() {
        return sectionLabel;
    }

    public void setSectionLabel(String sectionLabel) {
        this.sectionLabel = sectionLabel;
    }

    public String getQuestionType() {
        return questionType;
    }

    public void setQuestionType(String questionType) {
        this.questionType = questionType;
    }

    public int getQuestionCount() {
        return questionCount;
    }

    public void setQuestionCount(int questionCount) {
        this.questionCount = questionCount;
    }

    public int getMarksPerQuestion() {
        return marksPerQuestion;
    }

    public void setMarksPerQuestion(int marksPerQuestion) {
        this.marksPerQuestion = marksPerQuestion;
    }
}
