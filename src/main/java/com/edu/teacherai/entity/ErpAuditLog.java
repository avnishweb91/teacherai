package com.edu.teacherai.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "erp_audit_logs", indexes = {
        @Index(name = "idx_erp_audit_school", columnList = "schoolId,createdAt")
})
public class ErpAuditLog {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false) private Long schoolId;
    @Column(nullable = false) private Long userId;
    @Column(nullable = false, length = 30) private String action;
    @Column(nullable = false, length = 40) private String moduleType;
    private Long recordId;
    @Column(nullable = false, updatable = false) private LocalDateTime createdAt = LocalDateTime.now();

    public ErpAuditLog() { }
    public ErpAuditLog(Long schoolId, Long userId, String action, String moduleType, Long recordId) {
        this.schoolId = schoolId; this.userId = userId; this.action = action; this.moduleType = moduleType; this.recordId = recordId;
    }
    public Long getId() { return id; }
    public Long getSchoolId() { return schoolId; }
    public Long getUserId() { return userId; }
    public String getAction() { return action; }
    public String getModuleType() { return moduleType; }
    public Long getRecordId() { return recordId; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
