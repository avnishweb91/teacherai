package com.edu.teacherai.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "users") // avoid reserved keyword conflicts
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    @Column(unique = true, nullable = false)
    private String mobile;

    @Column(unique = true)
    private String email;

    private String password; // nullable for OTP users

    @Column(nullable = false)
    private String role; // TEACHER / SCHOOL_ADMIN / ADMIN

    private Long schoolId; // null for individual teachers

    private String boardPreference; // CBSE / ICSE / Bihar Board

    @Column(nullable = false)
    private String planType; // FREE / PRO / SCHOOL

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private String resetToken;
    private LocalDateTime resetTokenExpiry;

    /* =========================
       CONSTRUCTORS
       ========================= */

    public User() {
        this.createdAt = LocalDateTime.now();
        this.planType = "FREE";
        this.role = "TEACHER";
    }

    public User(String mobile) {
        this.mobile = mobile;
        this.role = "TEACHER";
        this.planType = "FREE";
        this.createdAt = LocalDateTime.now();
    }

    public User(String name, String mobile, String email, String role, String planType) {
        this.name = name;
        this.mobile = mobile;
        this.email = email;
        this.role = role;
        this.planType = planType;
        this.createdAt = LocalDateTime.now();
    }

    /* =========================
       GETTERS
       ========================= */

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getMobile() {
        return mobile;
    }

    public String getEmail() {
        return email;
    }

    public String getPassword() {
        return password;
    }

    public String getRole() {
        return role;
    }

    public Long getSchoolId() { return schoolId; }
    public void setSchoolId(Long schoolId) { this.schoolId = schoolId; }

    public String getBoardPreference() {
        return boardPreference;
    }

    public String getPlanType() {
        return planType;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    /* =========================
       SETTERS
       ========================= */

    public void setName(String name) {
        this.name = name;
    }

    public void setMobile(String mobile) {
        this.mobile = mobile;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public void setBoardPreference(String boardPreference) {
        this.boardPreference = boardPreference;
    }

    public void setPlanType(String planType) {
        this.planType = planType;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public String getResetToken() { return resetToken; }
    public void setResetToken(String resetToken) { this.resetToken = resetToken; }
    public LocalDateTime getResetTokenExpiry() { return resetTokenExpiry; }
    public void setResetTokenExpiry(LocalDateTime resetTokenExpiry) { this.resetTokenExpiry = resetTokenExpiry; }
}
