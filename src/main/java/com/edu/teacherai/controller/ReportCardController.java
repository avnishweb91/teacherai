package com.edu.teacherai.controller;

import com.edu.teacherai.dto.ReportCardRequest;
import com.edu.teacherai.entity.User;
import com.edu.teacherai.repository.UserRepository;
import com.edu.teacherai.service.PlanValidationService;
import com.edu.teacherai.service.ReportCardService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/reportcard")
public class ReportCardController {

    private final ReportCardService service;
    private final PlanValidationService planValidationService;
    private final UserRepository userRepo;

    public ReportCardController(ReportCardService service,
                                PlanValidationService planValidationService,
                                UserRepository userRepo) {
        this.service = service;
        this.planValidationService = planValidationService;
        this.userRepo = userRepo;
    }

    @PostMapping("/remark")
    public ResponseEntity<String> generateRemark(
            @RequestBody ReportCardRequest req,
            Authentication auth) {

        if (auth == null || auth.getName() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not authenticated");
        }

        User user = userRepo.findByMobile(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        planValidationService.validate(user, "REPORTCARD");

        String remark = service.generateRemark(req);

        planValidationService.logUsage(user, "REPORTCARD");

        return ResponseEntity.ok(remark);
    }
}
