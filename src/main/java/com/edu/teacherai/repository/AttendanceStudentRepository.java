package com.edu.teacherai.repository;

import com.edu.teacherai.entity.AttendanceStudent;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface AttendanceStudentRepository extends JpaRepository<AttendanceStudent, Long> {
    List<AttendanceStudent> findByUserIdOrderByClassNameAscSectionAscRollNoAscNameAsc(Long userId);
    Optional<AttendanceStudent> findByIdAndUserId(Long id, Long userId);
    void deleteByIdAndUserId(Long id, Long userId);
}
