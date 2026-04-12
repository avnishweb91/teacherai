package com.edu.teacherai.dto;

public class AnswerKeyRequest {
    private String questionPaper;
    private String language;

    public String getQuestionPaper() {
        return questionPaper;
    }

    public void setQuestionPaper(String questionPaper) {
        this.questionPaper = questionPaper;
    }

    public String getLanguage() {
        return language;
    }

    public void setLanguage(String language) {
        this.language = language;
    }
}
