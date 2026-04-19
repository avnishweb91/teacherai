package com.edu.teacherai.repository;

import com.edu.teacherai.entity.AttendanceRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.List;

public interface AttendanceRecordRepository extends JpaRepository<AttendanceRecord, Long> {

    List<AttendanceRecord> findByUserIdAndDate(Long userId, LocalDate date);

    List<AttendanceRecord> findByUserIdAndDateBetween(Long userId, LocalDate from, LocalDate to);

    @Modifying
    @Query("DELETE FROM AttendanceRecord r WHERE r.userId = :userId AND r.studentId = :studentId")
    void deleteByUserIdAndStudentId(@Param("userId") Long userId, @Param("studentId") Long studentId);

    @Modifying
    @Query("DELETE FROM AttendanceRecord r WHERE r.userId = :userId AND r.studentId = :studentId AND r.date = :date")
    void deleteByUserIdAndStudentIdAndDate(@Param("userId") Long userId,
                                           @Param("studentId") Long studentId,
                                           @Param("date") LocalDate date);
}
