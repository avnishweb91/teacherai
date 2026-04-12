package com.edu.teacherai.dto;

import java.util.List;

public class AssessmentRequest {

    private String syllabus;
    private String examType;

    private String subject;
    private String grade;
    private String topic;
    private String difficulty;
    private String language;

    private int mcqCount;
    private int shortCount;
    private int longCount;

    private int totalMarks;

    private int durationMinutes;

    private List<SectionConfig> sections;

    public String getSubject() {
        return subject;
    }

    public void setSubject(String subject) {
        this.subject = subject;
    }

    public String getGrade() {
        return grade;
    }

    public void setGrade(String grade) {
        this.grade = grade;
    }

    public String getTopic() {
        return topic;
    }

    public void setTopic(String topic) {
        this.topic = topic;
    }

    public String getDifficulty() {
        return difficulty;
    }

    public void setDifficulty(String difficulty) {
        this.difficulty = difficulty;
    }

    public String getLanguage() {
        return language;
    }

    public void setLanguage(String language) {
        this.language = language;
    }

    public int getMcqCount() {
        return mcqCount;
    }

    public void setMcqCount(int mcqCount) {
        this.mcqCount = mcqCount;
    }

    public int getShortCount() {
        return shortCount;
    }

    public void setShortCount(int shortCount) {
        this.shortCount = shortCount;
    }

    public int getLongCount() {
        return longCount;
    }

    public void setLongCount(int longCount) {
        this.longCount = longCount;
    }

    public String getSyllabus() {
        return syllabus;
    }

    public void setSyllabus(String syllabus) {
        this.syllabus = syllabus;
    }

    public String getExamType() {
        return examType;
    }

    public void setExamType(String examType) {
        this.examType = examType;
    }

    public int getTotalMarks() {
        return totalMarks;
    }

    public void setTotalMarks(int totalMarks) {
        this.totalMarks = totalMarks;
    }

    public int getDurationMinutes() {
        return durationMinutes;
    }

    public void setDurationMinutes(int durationMinutes) {
        this.durationMinutes = durationMinutes;
    }

    public List<SectionConfig> getSections() {
        return sections;
    }

    public void setSections(List<SectionConfig> sections) {
        this.sections = sections;
    }
}
