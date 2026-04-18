package com.edu.teacherai.controller;

import com.edu.teacherai.dto.DoubtRequest;
import com.edu.teacherai.entity.User;
import com.edu.teacherai.repository.UserRepository;
import com.edu.teacherai.service.DoubtAiService;
import com.edu.teacherai.service.PlanValidationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@SuppressWarnings("unused")
@RestController
@RequestMapping("/api/doubt")
public class DoubtController {

    private final DoubtAiService doubtAiService;
    private final PlanValidationService planValidationService;
    private final UserRepository userRepo;

    public DoubtController(DoubtAiService doubtAiService,
                           PlanValidationService planValidationService,
                           UserRepository userRepo) {
        this.doubtAiService = doubtAiService;
        this.planValidationService = planValidationService;
        this.userRepo = userRepo;
    }

    @PostMapping("/solve")
    public ResponseEntity<?> solve(@RequestBody DoubtRequest req, Authentication auth) {
        User user = userRepo.findByMobile(auth.getName()).orElseThrow();
        planValidationService.validate(user, "DOUBT");
        String answer = doubtAiService.solveDoubt(req);
        planValidationService.logUsage(user, "DOUBT");
        return ResponseEntity.ok(answer);
    }
}
