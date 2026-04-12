package com.edu.teacherai.controller;

import com.edu.teacherai.dto.ReportCardRequest;
import com.edu.teacherai.service.ReportCardService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reportcard")
public class ReportCardController {

    private final ReportCardService service;

    public ReportCardController(ReportCardService service) {
        this.service = service;
    }

    @PostMapping("/remark")
    public ResponseEntity<String> generateRemark(
            @RequestBody ReportCardRequest req,
            Authentication auth) {
        String remark = service.generateRemark(req);
        return ResponseEntity.ok(remark);
    }
}
