package com.edu.teacherai.controller;

import com.edu.teacherai.dto.TemplateParseRequest;
import com.edu.teacherai.dto.TemplateParseResponse;
import com.edu.teacherai.service.TemplateService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/template")
public class TemplateController {

    private final TemplateService templateService;

    public TemplateController(TemplateService templateService) {
        this.templateService = templateService;
    }

    @PostMapping("/parse")
    public ResponseEntity<TemplateParseResponse> parse(
            @RequestBody TemplateParseRequest req,
            Authentication auth) {

        TemplateParseResponse response = templateService.parseTemplate(req);
        return ResponseEntity.ok(response);
    }
}
