package com.edu.teacherai.repository;
import com.edu.teacherai.entity.StudentProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
public interface StudentProfileRepository extends JpaRepository<StudentProfile, Long> {
    List<StudentProfile> findBySchoolIdOrderByClassNameAscSectionAscFullNameAsc(Long schoolId);
    Optional<StudentProfile> findByIdAndSchoolId(Long id, Long schoolId);
}
