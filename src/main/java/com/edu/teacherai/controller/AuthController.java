package com.edu.teacherai.controller;

import com.edu.teacherai.dto.AuthRequest;
import com.edu.teacherai.dto.AuthResponse;
import com.edu.teacherai.dto.RegisterRequest;
import com.edu.teacherai.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@SuppressWarnings("unused")
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@RequestBody RegisterRequest req) {
        return ResponseEntity.ok(authService.register(req));
    }

    /* =========================
       STEP 1: SEND OTP (MOBILE)
       ========================= */
    @PostMapping("/send-otp")
    public ResponseEntity<String> sendOtp(@RequestBody Map<String, String> req) {

        String mobile = req.get("mobile");
        if (mobile == null || mobile.isBlank()) {
            return ResponseEntity.badRequest().body("Mobile number is required");
        }
        // Accept 10-digit numbers or E.164 format (+91XXXXXXXXXX)
        String digits = mobile.startsWith("+91") ? mobile.substring(3) : mobile;
        if (!digits.matches("\\d{10}")) {
            return ResponseEntity.badRequest().body("Invalid mobile number. Must be 10 digits.");
        }

        try {
            authService.sendOtp(mobile);
            return ResponseEntity.ok("OTP sent successfully");
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Send OTP failed: " + e.getMessage());
        }
    }

    /* =========================
       STEP 2: VERIFY OTP (LOGIN / SIGNUP)
       ========================= */
    @PostMapping("/verify-otp")
    public ResponseEntity<AuthResponse> verifyOtp(@RequestBody Map<String, String> req) {

        AuthResponse response = authService.verifyOtp(req);
        return ResponseEntity.ok(response);
    }

    /* =========================
       EMAIL + PASSWORD LOGIN
       ========================= */
    @PostMapping("/login-email")
    public ResponseEntity<AuthResponse> loginWithEmail(
            @RequestBody AuthRequest request) {

        AuthResponse response = authService.loginWithEmail(request);
        return ResponseEntity.ok(response);
    }

    /* =========================
       GOOGLE OAUTH LOGIN
       ========================= */
    @PostMapping("/google")
    public ResponseEntity<AuthResponse> googleLogin(@RequestBody Map<String, String> req) {
        String idToken = req.get("idToken");
        if (idToken == null || idToken.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        AuthResponse response = authService.googleLogin(idToken);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of("status", "ok"));
    }
}
