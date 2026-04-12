package com.edu.teacherai.controller;

import com.edu.teacherai.dto.LessonRequest;
import com.edu.teacherai.entity.LessonPlan;
import com.edu.teacherai.entity.User;
import com.edu.teacherai.repository.LessonPlanRepository;
import com.edu.teacherai.repository.UserRepository;
import com.edu.teacherai.service.LessonAiService;
import com.edu.teacherai.service.PlanValidationService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;

@SuppressWarnings("unused")
@RestController
@RequestMapping("/api/lesson")
public class LessonController {

    private final LessonAiService service;
    private final LessonPlanRepository repo;
    private final UserRepository userRepo;
    private final PlanValidationService planValidationService;

    public LessonController(LessonAiService service,
                            LessonPlanRepository repo,
                            UserRepository userRepo, PlanValidationService planValidationService) {
        this.service = service;
        this.repo = repo;
        this.userRepo = userRepo;
        this.planValidationService = planValidationService;
    }

    @PostMapping("/generate")
    public LessonPlan generate(@RequestBody LessonRequest req,
                               Authentication auth) {

        if (auth == null || auth.getName() == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "User not authenticated"
            );
        }

        User user = userRepo.findByMobile(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Teacher not found"
                ));

        String content;
        try {
            content = service.generateLesson(req);
        } catch (Exception e) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "lesson generation failed"
            );
        }

        LessonPlan plan = new LessonPlan();
        plan.setSubject(req.getSubject());
        plan.setGrade(req.getGrade());
        plan.setTopic(req.getTopic());
        plan.setContent(content);
        plan.setCreatedDate(LocalDate.now());
        plan.setUser(user);
        LessonPlan saved = repo.save(plan);

        // ✅ Log usage AFTER success
        planValidationService.logUsage(user, "LESSON");

        // ✅ RETURN RESPONSE
        return saved;
    }
}
