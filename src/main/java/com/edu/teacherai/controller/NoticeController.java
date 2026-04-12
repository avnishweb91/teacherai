package com.edu.teacherai.controller;

import com.edu.teacherai.dto.NoticeRequest;
import com.edu.teacherai.service.NoticeService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notice")
public class NoticeController {

    private final NoticeService service;

    public NoticeController(NoticeService service) {
        this.service = service;
    }

    @PostMapping("/generate")
    public ResponseEntity<String> generate(
            @RequestBody NoticeRequest req,
            Authentication auth) {
        return ResponseEntity.ok(service.generateNotice(req));
    }
}
