package com.edu.teacherai.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "lesson_videos")
public class LessonVideo {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false) private String title;
    @Column(nullable = false) private String grade;
    @Column(nullable = false) private String subject;
    @Column(nullable = false) private String chapter;
    @Column(nullable = false, unique = true, length = 700) private String storageKey;
    @Column(nullable = false) private String contentType;
    private long sizeBytes;
    @Column(nullable = false) private LocalDateTime createdAt = LocalDateTime.now();

    public Long getId() { return id; }
    public String getTitle() { return title; } public void setTitle(String v) { title = v; }
    public String getGrade() { return grade; } public void setGrade(String v) { grade = v; }
    public String getSubject() { return subject; } public void setSubject(String v) { subject = v; }
    public String getChapter() { return chapter; } public void setChapter(String v) { chapter = v; }
    public String getStorageKey() { return storageKey; } public void setStorageKey(String v) { storageKey = v; }
    public String getContentType() { return contentType; } public void setContentType(String v) { contentType = v; }
    public long getSizeBytes() { return sizeBytes; } public void setSizeBytes(long v) { sizeBytes = v; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
