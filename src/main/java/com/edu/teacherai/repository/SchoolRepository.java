package com.edu.teacherai.repository;

import com.edu.teacherai.entity.School;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface SchoolRepository extends JpaRepository<School, Long> {
    Optional<School> findByInviteCode(String inviteCode);
    Optional<School> findByAdminEmail(String adminEmail);
    boolean existsByAdminEmail(String adminEmail);
}
