package com.edu.teacherai.repository;

import com.edu.teacherai.entity.ParentContact;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ParentContactRepository extends JpaRepository<ParentContact, Long> {
    List<ParentContact> findByUserId(Long userId);
    Optional<ParentContact> findByUserIdAndStudentId(Long userId, Long studentId);
    void deleteByUserIdAndStudentId(Long userId, Long studentId);
}
