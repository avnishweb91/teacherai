package com.edu.teacherai.controller;

import com.edu.teacherai.dto.AnswerKeyRequest;
import com.edu.teacherai.dto.AssessmentRequest;
import com.edu.teacherai.entity.User;
import com.edu.teacherai.repository.UserRepository;
import com.edu.teacherai.service.AssessmentAiService;
import com.edu.teacherai.service.PlanValidationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@SuppressWarnings("unused")
@RestController
@RequestMapping("/api/assessment")
public class AssessmentController {

    private final AssessmentAiService assessmentAiService;

    private final PlanValidationService planValidationService;

    private final UserRepository userRepo;

    public AssessmentController(AssessmentAiService assessmentAiService, PlanValidationService planValidationService, UserRepository userRepo) {
        this.assessmentAiService = assessmentAiService;
        this.planValidationService = planValidationService;
        this.userRepo = userRepo;
    }

    @PostMapping("/generate")
    public ResponseEntity<?> generate(
            @RequestBody AssessmentRequest req,
            Authentication auth) {

        User user = userRepo.findByMobile(auth.getName()).orElseThrow();

        planValidationService.validate(user, "ASSESSMENT");

        String paper = assessmentAiService.generateAssessment(req);

        planValidationService.logUsage(user, "ASSESSMENT");

        return ResponseEntity.ok(paper);
    }


    @PostMapping("/answer-key")
    public String generateAnswerKey(@RequestBody AnswerKeyRequest req) {
        return assessmentAiService.generateAnswerKey(
                req.getQuestionPaper(),
                req.getLanguage()
        );
    }

}
