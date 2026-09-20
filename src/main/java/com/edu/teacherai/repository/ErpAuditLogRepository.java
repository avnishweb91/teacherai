package com.edu.teacherai.repository;

import com.edu.teacherai.entity.ErpAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ErpAuditLogRepository extends JpaRepository<ErpAuditLog, Long> {
    List<ErpAuditLog> findTop100BySchoolIdOrderByCreatedAtDesc(Long schoolId);
}
