package com.edu.teacherai.repository;

import com.edu.teacherai.entity.UsageLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;

public interface UsageRepository extends JpaRepository<UsageLog, Long> {

    long countByUserIdAndFeatureAndUsageDate(
            Long userId,
            String feature,
            LocalDate date
    );
}
