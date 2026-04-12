package com.edu.teacherai.service;

import com.edu.teacherai.entity.User;
import com.edu.teacherai.plan.PlanRules;
import com.edu.teacherai.repository.UsageRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;

@Service
public class PlanValidationService {

    private final UsageRepository usageRepo;

    public PlanValidationService(UsageRepository usageRepo) {
        this.usageRepo = usageRepo;
    }

    public void validate(User user, String feature) {

        if (PlanRules.isUnlimited(user.getPlanType())) {
            return;
        }

        long usedToday = usageRepo.countByUserIdAndFeatureAndUsageDate(
                user.getId(),
                feature,
                LocalDate.now()
        );

        int limit = feature.equals("LESSON")
                ? PlanRules.FREE_LESSON_LIMIT
                : PlanRules.FREE_ASSESSMENT_LIMIT;

        if (usedToday >= limit) {
            throw new RuntimeException("PLAN_LIMIT_EXCEEDED");
        }
    }

    public void logUsage(User user, String feature) {
        usageRepo.save(
                new com.edu.teacherai.entity.UsageLog(
                        user.getId(),
                        feature,
                        LocalDate.now()
                )
        );
    }
}
