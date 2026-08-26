package com.edu.teacherai.controller;

import com.edu.teacherai.dto.AuthResponse;
import com.edu.teacherai.dto.StudentRegisterRequest;
import com.edu.teacherai.service.StudentAuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/** Public authentication API for the SmartBoard Learn student experience. */
@RestController
@RequestMapping("/api/student")
public class StudentAuthController {
    private final StudentAuthService studentAuthService;

    public StudentAuthController(StudentAuthService studentAuthService) {
        this.studentAuthService = studentAuthService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@RequestBody StudentRegisterRequest request) {
        return ResponseEntity.ok(studentAuthService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody Map<String, String> request) {
        return ResponseEntity.ok(studentAuthService.login(request.get("studentId"), request.get("password")));
    }

    @PostMapping("/google")
    public ResponseEntity<AuthResponse> google(@RequestBody Map<String, String> request) {
        return ResponseEntity.ok(studentAuthService.googleLogin(request.get("idToken")));
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, String>> handleAuthError(RuntimeException error) {
        return ResponseEntity.badRequest().body(Map.of("message", error.getMessage()));
    }
}
