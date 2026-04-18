package com.edu.teacherai.service;

import com.edu.teacherai.entity.User;
import com.edu.teacherai.plan.PlanRules;
import com.edu.teacherai.repository.UsageRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;

@Service
public class PlanValidationService {

    private final UsageRepository usageRepo;

    public PlanValidationService(UsageRepository usageRepo) {
        this.usageRepo = usageRepo;
    }

    public void validate(User user, String feature) {

        if ("ADMIN".equals(user.getRole()) || "SCHOOL_ADMIN".equals(user.getRole()) || PlanRules.isUnlimited(user.getPlanType())) {
            return;
        }

        long usedToday = usageRepo.countByUserIdAndFeatureAndUsageDate(
                user.getId(),
                feature,
                LocalDate.now()
        );

        int limit = PlanRules.limitFor(feature);

        if (usedToday >= limit) {
            throw new ResponseStatusException(HttpStatus.PAYMENT_REQUIRED, "PLAN_LIMIT_EXCEEDED");
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
