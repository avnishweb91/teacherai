package com.edu.teacherai.repository;

import com.edu.teacherai.entity.ErpRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ErpRecordRepository extends JpaRepository<ErpRecord, Long> {
    List<ErpRecord> findBySchoolIdAndModuleTypeOrderByUpdatedAtDesc(Long schoolId, String moduleType);
    Optional<ErpRecord> findByIdAndSchoolIdAndModuleType(Long id, Long schoolId, String moduleType);
    long countBySchoolIdAndModuleType(Long schoolId, String moduleType);
}
