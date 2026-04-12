package com.edu.teacherai.controller;

import com.edu.teacherai.dto.PlannerRequest;
import com.edu.teacherai.service.PlannerAiService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@SuppressWarnings("unused")
@RestController
@RequestMapping("/api/planner")
public class PlannerController {

    private final PlannerAiService plannerAiService;

    public PlannerController(PlannerAiService plannerAiService) {
        this.plannerAiService = plannerAiService;
    }

    @PostMapping("/generate")
    public ResponseEntity<String> generate(
            @RequestBody PlannerRequest req,
            Authentication auth) {

        String json = plannerAiService.generatePlanner(req);
        return ResponseEntity.ok(json);
    }
}
