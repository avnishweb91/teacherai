package com.edu.teacherai.dto;

public class WorksheetRequest {
    private String syllabus;
    private String subject;
    private String grade;
    private String topic;
    private String difficulty;
    private String worksheetType;
    private String language;
    private int questionCount;

    public String getSyllabus() { return syllabus; }
    public void setSyllabus(String syllabus) { this.syllabus = syllabus; }
    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }
    public String getGrade() { return grade; }
    public void setGrade(String grade) { this.grade = grade; }
    public String getTopic() { return topic; }
    public void setTopic(String topic) { this.topic = topic; }
    public String getDifficulty() { return difficulty; }
    public void setDifficulty(String difficulty) { this.difficulty = difficulty; }
    public String getWorksheetType() { return worksheetType; }
    public void setWorksheetType(String worksheetType) { this.worksheetType = worksheetType; }
    public String getLanguage() { return language; }
    public void setLanguage(String language) { this.language = language; }
    public int getQuestionCount() { return questionCount; }
    public void setQuestionCount(int questionCount) { this.questionCount = questionCount; }
}
