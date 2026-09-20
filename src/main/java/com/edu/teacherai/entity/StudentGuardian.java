package com.edu.teacherai.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "student_guardians", uniqueConstraints = @UniqueConstraint(columnNames = {"studentId", "guardianId"}))
public class StudentGuardian {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false) private Long schoolId;
    @Column(nullable = false) private Long studentId;
    @Column(nullable = false) private Long guardianId;
    @Column(nullable = false) private String relationshipType;
    private boolean primaryContact;

    public Long getId() { return id; }
    public Long getSchoolId() { return schoolId; } public void setSchoolId(Long v) { schoolId = v; }
    public Long getStudentId() { return studentId; } public void setStudentId(Long v) { studentId = v; }
    public Long getGuardianId() { return guardianId; } public void setGuardianId(Long v) { guardianId = v; }
    public String getRelationshipType() { return relationshipType; } public void setRelationshipType(String v) { relationshipType = v; }
    public boolean isPrimaryContact() { return primaryContact; } public void setPrimaryContact(boolean v) { primaryContact = v; }
}
