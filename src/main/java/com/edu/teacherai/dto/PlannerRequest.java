package com.edu.teacherai.dto;

import java.util.List;

public class PlannerRequest {

    private String grade;           // LKG, UKG, Class 1 … Class 12
    private String board;           // CBSE, ICSE, Bihar Board
    private int month;              // 1–12
    private int year;
    private List<String> holidays;  // e.g. ["2:Gandhi Jayanti", "14:Festival break"]

    // Optional custom activity hints per column (comma-separated topics)
    private String languageTopics;
    private String cognitiveTopics;
    private String creativeTopics;
    private String physicalTopics;
    private String socialTopics;

    /* ── Getters / Setters ── */

    public String getGrade()                { return grade; }
    public void setGrade(String grade)      { this.grade = grade; }

    public String getBoard()                { return board; }
    public void setBoard(String board)      { this.board = board; }

    public int getMonth()                   { return month; }
    public void setMonth(int month)         { this.month = month; }

    public int getYear()                    { return year; }
    public void setYear(int year)           { this.year = year; }

    public List<String> getHolidays()               { return holidays; }
    public void setHolidays(List<String> holidays)  { this.holidays = holidays; }

    public String getLanguageTopics()                   { return languageTopics; }
    public void setLanguageTopics(String languageTopics){ this.languageTopics = languageTopics; }

    public String getCognitiveTopics()                    { return cognitiveTopics; }
    public void setCognitiveTopics(String cognitiveTopics){ this.cognitiveTopics = cognitiveTopics; }

    public String getCreativeTopics()                   { return creativeTopics; }
    public void setCreativeTopics(String creativeTopics){ this.creativeTopics = creativeTopics; }

    public String getPhysicalTopics()                   { return physicalTopics; }
    public void setPhysicalTopics(String physicalTopics){ this.physicalTopics = physicalTopics; }

    public String getSocialTopics()                 { return socialTopics; }
    public void setSocialTopics(String socialTopics){ this.socialTopics = socialTopics; }
}
