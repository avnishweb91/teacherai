package com.edu.teacherai.repository;

import com.edu.teacherai.entity.UsageLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface UsageRepository extends JpaRepository<UsageLog, Long> {

    long countByUserIdAndFeatureAndUsageDate(Long userId, String feature, LocalDate date);

    @Query("SELECT u.feature, u.usageDate, COUNT(u) FROM UsageLog u " +
           "WHERE u.usageDate >= :from " +
           "GROUP BY u.feature, u.usageDate " +
           "ORDER BY u.usageDate ASC")
    List<Object[]> findDailyUsageSince(@Param("from") LocalDate from);
}
