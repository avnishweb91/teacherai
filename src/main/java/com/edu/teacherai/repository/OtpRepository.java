package com.edu.teacherai.repository;

import com.edu.teacherai.entity.OtpToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

public interface OtpRepository extends JpaRepository<OtpToken, Long> {

    Optional<OtpToken> findByMobile(String mobile);

    @Transactional
    void deleteByMobile(String mobile);
}
