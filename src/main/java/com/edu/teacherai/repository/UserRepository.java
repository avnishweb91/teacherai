package com.edu.teacherai.repository;

import com.edu.teacherai.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByMobile(String mobile);
    Optional<User> findByEmail(String email);
    Optional<User> findByResetToken(String resetToken);
    java.util.List<User> findBySchoolId(Long schoolId);
    long countBySchoolId(Long schoolId);
}
