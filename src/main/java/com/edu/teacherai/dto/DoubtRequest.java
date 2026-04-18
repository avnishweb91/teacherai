package com.edu.teacherai.dto;

public class DoubtRequest {
    private String subject;
    private String grade;
    private String question;
    private String language;

    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }
    public String getGrade() { return grade; }
    public void setGrade(String grade) { this.grade = grade; }
    public String getQuestion() { return question; }
    public void setQuestion(String question) { this.question = question; }
    public String getLanguage() { return language; }
    public void setLanguage(String language) { this.language = language; }
}
