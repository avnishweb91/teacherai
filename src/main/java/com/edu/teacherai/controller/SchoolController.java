package com.edu.teacherai.controller;

import com.edu.teacherai.dto.AuthResponse;
import com.edu.teacherai.dto.SchoolRegisterRequest;
import com.edu.teacherai.entity.User;
import com.edu.teacherai.repository.UserRepository;
import com.edu.teacherai.service.SchoolService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@SuppressWarnings("unused")
@RestController
@RequestMapping("/api/school")
public class SchoolController {

    private final SchoolService schoolService;
    private final UserRepository userRepo;

    public SchoolController(SchoolService schoolService, UserRepository userRepo) {
        this.schoolService = schoolService;
        this.userRepo = userRepo;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@RequestBody SchoolRegisterRequest req) {
        return ResponseEntity.ok(schoolService.registerSchool(req));
    }

    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> dashboard(Authentication auth) {
        User admin = userRepo.findByMobile(auth.getName()).orElseThrow();
        if (admin.getSchoolId() == null) return ResponseEntity.badRequest().build();
        return ResponseEntity.ok(schoolService.getSchoolDashboard(admin.getSchoolId()));
    }

    @DeleteMapping("/teacher/{teacherId}")
    public ResponseEntity<Void> removeTeacher(@PathVariable Long teacherId, Authentication auth) {
        User admin = userRepo.findByMobile(auth.getName()).orElseThrow();
        if (admin.getSchoolId() == null) return ResponseEntity.badRequest().build();
        schoolService.removeTeacher(admin.getSchoolId(), teacherId);
        return ResponseEntity.ok().build();
    }
}
