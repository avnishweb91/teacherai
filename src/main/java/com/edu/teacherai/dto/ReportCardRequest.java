package com.edu.teacherai.dto;

import java.util.Map;

public class ReportCardRequest {
    private String studentName;
    private String rollNo;
    private String grade;
    private String section;
    private String term;
    private int year;
    private Map<String, Integer> subjectMarks; // subject -> marks obtained
    private int maxMarks;                       // max marks per subject
    private double attendance;                  // attendance percentage
    private String teacherName;
    private String schoolName;

    public String getStudentName()             { return studentName; }
    public void setStudentName(String v)       { this.studentName = v; }

    public String getRollNo()                  { return rollNo; }
    public void setRollNo(String v)            { this.rollNo = v; }

    public String getGrade()                   { return grade; }
    public void setGrade(String v)             { this.grade = v; }

    public String getSection()                 { return section; }
    public void setSection(String v)           { this.section = v; }

    public String getTerm()                    { return term; }
    public void setTerm(String v)              { this.term = v; }

    public int getYear()                       { return year; }
    public void setYear(int v)                 { this.year = v; }

    public Map<String, Integer> getSubjectMarks()          { return subjectMarks; }
    public void setSubjectMarks(Map<String, Integer> v)    { this.subjectMarks = v; }

    public int getMaxMarks()                   { return maxMarks; }
    public void setMaxMarks(int v)             { this.maxMarks = v; }

    public double getAttendance()              { return attendance; }
    public void setAttendance(double v)        { this.attendance = v; }

    public String getTeacherName()             { return teacherName; }
    public void setTeacherName(String v)       { this.teacherName = v; }

    public String getSchoolName()              { return schoolName; }
    public void setSchoolName(String v)        { this.schoolName = v; }
}
