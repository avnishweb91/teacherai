package com.edu.teacherai.controller;

import com.edu.teacherai.dto.NoticeRequest;
import com.edu.teacherai.entity.User;
import com.edu.teacherai.repository.UserRepository;
import com.edu.teacherai.service.NoticeService;
import com.edu.teacherai.service.PlanValidationService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/notice")
public class NoticeController {

    private final NoticeService service;
    private final PlanValidationService planValidationService;
    private final UserRepository userRepo;

    public NoticeController(NoticeService service,
                            PlanValidationService planValidationService,
                            UserRepository userRepo) {
        this.service = service;
        this.planValidationService = planValidationService;
        this.userRepo = userRepo;
    }

    @PostMapping("/generate")
    public ResponseEntity<String> generate(
            @RequestBody NoticeRequest req,
            Authentication auth) {

        if (auth == null || auth.getName() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not authenticated");
        }

        User user = userRepo.findByMobile(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        planValidationService.validate(user, "NOTICE");

        String result = service.generateNotice(req);

        planValidationService.logUsage(user, "NOTICE");

        return ResponseEntity.ok(result);
    }
}
