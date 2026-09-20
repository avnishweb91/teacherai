package com.edu.teacherai.repository;
import com.edu.teacherai.entity.Guardian;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface GuardianRepository extends JpaRepository<Guardian, Long> { Optional<Guardian> findByIdAndSchoolId(Long id, Long schoolId); }
