package com.edu.teacherai.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "student_profiles", uniqueConstraints = @UniqueConstraint(columnNames = {"schoolId", "admissionNo"}))
public class StudentProfile {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false) private Long schoolId;
    @Column(nullable = false) private String admissionNo;
    @Column(nullable = false) private String fullName;
    private LocalDate dateOfBirth;
    private String gender;
    private String className;
    private String section;
    private String status = "ACTIVE";
    private String address;
    private String documentKey;
    @Column(nullable = false, updatable = false) private LocalDateTime createdAt = LocalDateTime.now();

    public Long getId() { return id; }
    public Long getSchoolId() { return schoolId; } public void setSchoolId(Long v) { schoolId = v; }
    public String getAdmissionNo() { return admissionNo; } public void setAdmissionNo(String v) { admissionNo = v; }
    public String getFullName() { return fullName; } public void setFullName(String v) { fullName = v; }
    public LocalDate getDateOfBirth() { return dateOfBirth; } public void setDateOfBirth(LocalDate v) { dateOfBirth = v; }
    public String getGender() { return gender; } public void setGender(String v) { gender = v; }
    public String getClassName() { return className; } public void setClassName(String v) { className = v; }
    public String getSection() { return section; } public void setSection(String v) { section = v; }
    public String getStatus() { return status; } public void setStatus(String v) { status = v; }
    public String getAddress() { return address; } public void setAddress(String v) { address = v; }
    public String getDocumentKey() { return documentKey; } public void setDocumentKey(String v) { documentKey = v; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
