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
       GOOGLE OAUTH LOGIN (id_token — popup flow, kept for backwards compat)
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

    /* =========================
       GOOGLE OAUTH CALLBACK (auth-code — redirect flow, mobile-safe)
       ========================= */
    @PostMapping("/google/callback")
    public ResponseEntity<?> googleCallback(@RequestBody Map<String, String> req) {
        String code = req.get("code");
        String redirectUri = req.get("redirectUri");
        if (code == null || code.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Missing authorization code"));
        }
        try {
            AuthResponse response = authService.googleLoginWithCode(code, redirectUri);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(@RequestBody Map<String, String> req) {
        String email = req.get("email");
        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email is required"));
        }
        authService.forgotPassword(email.trim().toLowerCase());
        return ResponseEntity.ok(Map.of("message", "If this email is registered, a reset link has been sent."));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(@RequestBody Map<String, String> req) {
        try {
            authService.resetPassword(req.get("token"), req.get("password"));
            return ResponseEntity.ok(Map.of("message", "Password reset successfully."));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of("status", "ok"));
    }
}
