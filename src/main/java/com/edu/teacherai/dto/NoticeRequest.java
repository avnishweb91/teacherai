package com.edu.teacherai.dto;

public class NoticeRequest {
    private String schoolName;
    private String principalName;
    private String teacherName;
    private String noticeType;      // PTM, Fee Reminder, Exam Schedule, etc.
    private String targetClass;     // "All Classes" or specific class
    private String keyDetails;      // event date, venue, amount, etc.
    private String tone;            // Formal / Friendly
    private String language;        // English / Hindi
    private String circularNo;
    private String noticeDate;      // formatted date string
    private String extraInstructions;

    public String getSchoolName()           { return schoolName; }
    public void setSchoolName(String v)     { this.schoolName = v; }

    public String getPrincipalName()        { return principalName; }
    public void setPrincipalName(String v)  { this.principalName = v; }

    public String getTeacherName()          { return teacherName; }
    public void setTeacherName(String v)    { this.teacherName = v; }

    public String getNoticeType()           { return noticeType; }
    public void setNoticeType(String v)     { this.noticeType = v; }

    public String getTargetClass()          { return targetClass; }
    public void setTargetClass(String v)    { this.targetClass = v; }

    public String getKeyDetails()           { return keyDetails; }
    public void setKeyDetails(String v)     { this.keyDetails = v; }

    public String getTone()                 { return tone; }
    public void setTone(String v)           { this.tone = v; }

    public String getLanguage()             { return language; }
    public void setLanguage(String v)       { this.language = v; }

    public String getCircularNo()           { return circularNo; }
    public void setCircularNo(String v)     { this.circularNo = v; }

    public String getNoticeDate()           { return noticeDate; }
    public void setNoticeDate(String v)     { this.noticeDate = v; }

    public String getExtraInstructions()           { return extraInstructions; }
    public void setExtraInstructions(String v)     { this.extraInstructions = v; }
}
