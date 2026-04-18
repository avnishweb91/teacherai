package com.edu.teacherai.controller;

import com.edu.teacherai.dto.WorksheetRequest;
import com.edu.teacherai.entity.User;
import com.edu.teacherai.repository.UserRepository;
import com.edu.teacherai.service.PlanValidationService;
import com.edu.teacherai.service.WorksheetAiService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@SuppressWarnings("unused")
@RestController
@RequestMapping("/api/worksheet")
public class WorksheetController {

    private final WorksheetAiService worksheetAiService;
    private final PlanValidationService planValidationService;
    private final UserRepository userRepo;

    public WorksheetController(WorksheetAiService worksheetAiService,
                               PlanValidationService planValidationService,
                               UserRepository userRepo) {
        this.worksheetAiService = worksheetAiService;
        this.planValidationService = planValidationService;
        this.userRepo = userRepo;
    }

    @PostMapping("/generate")
    public ResponseEntity<?> generate(@RequestBody WorksheetRequest req, Authentication auth) {
        User user = userRepo.findByMobile(auth.getName()).orElseThrow();
        planValidationService.validate(user, "WORKSHEET");
        String worksheet = worksheetAiService.generateWorksheet(req);
        planValidationService.logUsage(user, "WORKSHEET");
        return ResponseEntity.ok(worksheet);
    }
}
