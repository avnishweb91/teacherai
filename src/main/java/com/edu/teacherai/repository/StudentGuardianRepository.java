package com.edu.teacherai.repository;
import com.edu.teacherai.entity.StudentGuardian;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface StudentGuardianRepository extends JpaRepository<StudentGuardian, Long> {
    List<StudentGuardian> findBySchoolIdAndStudentId(Long schoolId, Long studentId);
    List<StudentGuardian> findBySchoolIdAndGuardianId(Long schoolId, Long guardianId);
}
