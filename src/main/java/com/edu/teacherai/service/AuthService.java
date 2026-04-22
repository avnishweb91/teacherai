package com.edu.teacherai.service;

import com.edu.teacherai.config.JwtUtil;
import com.edu.teacherai.dto.AuthRequest;
import com.edu.teacherai.dto.AuthResponse;
import com.edu.teacherai.dto.RegisterRequest;
import com.edu.teacherai.entity.OtpToken;
import com.edu.teacherai.entity.User;
import com.edu.teacherai.repository.OtpRepository;
import com.edu.teacherai.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.beans.factory.annotation.Value;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Random;
import java.util.UUID;

@Service
public class AuthService {

        private final UserRepository userRepo;
        private final OtpRepository otpRepo;
        private final JwtUtil jwtUtil;
        private final PasswordEncoder passwordEncoder;
        private final SmsService smsService;
        private final EmailService emailService;
        private final com.edu.teacherai.repository.SchoolRepository schoolRepo;

        @Value("${google.client.id:}")
        private String googleClientId;

        @Value("${app.frontend.url:https://smartboard.co.in}")
        private String frontendUrl;

        public AuthService(
                UserRepository userRepo,
                OtpRepository otpRepo,
                JwtUtil jwtUtil,
                PasswordEncoder passwordEncoder,
                SmsService smsService,
                EmailService emailService,
                com.edu.teacherai.repository.SchoolRepository schoolRepo
        ) {
            this.userRepo = userRepo;
            this.otpRepo = otpRepo;
            this.jwtUtil = jwtUtil;
            this.passwordEncoder = passwordEncoder;
            this.smsService = smsService;
            this.emailService = emailService;
            this.schoolRepo = schoolRepo;
        }

        /* ======================
           SEND OTP
           ====================== */
        public void sendOtp(String mobile) {

            String otp = String.valueOf(100000 + new Random().nextInt(900000));
            otpRepo.deleteByMobile(mobile);

            otpRepo.save(new OtpToken(
                    null,
                    mobile,
                    passwordEncoder.encode(otp),   // store hashed OTP
                    LocalDateTime.now().plusMinutes(5)
            ));

            smsService.sendOtp(mobile, otp);       // send plain OTP via SMS
        }

        /* ======================
           VERIFY OTP
           ====================== */
        @Transactional
        public AuthResponse verifyOtp(Map<String, String> req) {

            String mobile = req.get("mobile");
            String otp = req.get("otp");

            if (mobile == null || mobile.isBlank() || otp == null || otp.isBlank()) {
                throw new RuntimeException("Mobile and OTP are required");
            }

            OtpToken token = otpRepo.findByMobile(mobile)
                    .orElseThrow(() -> new RuntimeException("OTP not found"));

            if (token.getExpiry().isBefore(LocalDateTime.now())) {
                otpRepo.deleteByMobile(mobile);     // clean up expired token
                throw new RuntimeException("OTP expired");
            }

            if (!passwordEncoder.matches(otp, token.getOtp())) {  // compare against hash
                throw new RuntimeException("Invalid OTP");
            }

            // OTP is valid → delete it (important)
            otpRepo.deleteByMobile(mobile);

            User user = userRepo.findByMobile(mobile).orElse(null);

            // 🔹 NEW USER → ASK FRONTEND TO REGISTER
            if (user == null) {
                return new AuthResponse(
                        null,
                        null,
                        "REGISTER_REQUIRED"
                );
            }

            // 🔹 EXISTING USER → LOGIN
            String jwt = jwtUtil.generateToken(user.getMobile(), user.getRole());


            return new AuthResponse(
                    jwt,
                    user,
                    "LOGIN"
            );
        }


    /* ======================
           REGISTER
           ====================== */
    public AuthResponse register(RegisterRequest req) {

        // Check email uniqueness
        if (req.getEmail() != null && !req.getEmail().isBlank()
                && userRepo.findByEmail(req.getEmail()).isPresent()) {
            throw new RuntimeException("Email already registered");
        }

        // Mobile is optional — generate synthetic identifier if not provided
        String mobile = (req.getMobile() != null && !req.getMobile().isBlank())
                ? req.getMobile()
                : "email_" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);

        if (userRepo.findByMobile(mobile).isPresent()) {
            throw new RuntimeException("Mobile already registered");
        }

        User user = new User();
        // resolve school invite if provided
        Long schoolId = null;
        String planType = "FREE";
        if (req.getInviteCode() != null && !req.getInviteCode().isBlank()) {
            com.edu.teacherai.entity.School school = schoolRepo.findByInviteCode(req.getInviteCode().trim().toUpperCase())
                    .orElseThrow(() -> new RuntimeException("Invalid invite code"));

            // Expire trial if time is up
            if ("TRIAL".equals(school.getSubscriptionStatus())
                    && school.getTrialEndsAt() != null
                    && school.getTrialEndsAt().isBefore(LocalDateTime.now())) {
                school.setSubscriptionStatus("EXPIRED");
                schoolRepo.save(school);
            }

            if ("EXPIRED".equals(school.getSubscriptionStatus())) {
                throw new RuntimeException("This school's trial has expired. Please ask your school admin to upgrade the plan.");
            }
            if ("TRIAL".equals(school.getSubscriptionStatus())) {
                long teacherCount = userRepo.countBySchoolId(school.getId());
                if (teacherCount >= 5) {
                    throw new RuntimeException("This school has reached the 5-teacher trial limit. Please ask your school admin to upgrade the plan.");
                }
            }

            schoolId = school.getId();
            planType = "SCHOOL";
        }

        user.setName(req.getName());
        user.setMobile(mobile);
        user.setEmail(req.getEmail());
        user.setPassword(passwordEncoder.encode(req.getPassword()));
        user.setBoardPreference(req.getBoardPreference());
        user.setRole("TEACHER");
        user.setSchoolId(schoolId);
        user.setPlanType(planType);

        userRepo.save(user);

        emailService.sendWelcome(user.getEmail(), user.getName());
        emailService.sendNewUserAlert(user.getName(), user.getEmail(), user.getMobile(), "Email / OTP");

        String jwt = jwtUtil.generateToken(user.getMobile(), user.getRole());

        return new AuthResponse(
                jwt,
                user,
                "LOGIN"
        );
    }


    /* ======================
           EMAIL LOGIN
           ====================== */
    public AuthResponse loginWithEmail(AuthRequest req) {

        User user = userRepo.findByEmail(req.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getPassword() == null ||
                !passwordEncoder.matches(req.getPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid email or password");
        }

        String jwt = jwtUtil.generateToken(user.getMobile(), user.getRole());

        return new AuthResponse(jwt, user, "LOGIN");
    }


    /* ======================
           FORGOT PASSWORD
           ====================== */
    public void forgotPassword(String email) {
        User user = userRepo.findByEmail(email).orElse(null);
        // Always return success to avoid email enumeration
        if (user == null || user.getPassword() == null) return;

        String token = UUID.randomUUID().toString();
        user.setResetToken(token);
        user.setResetTokenExpiry(LocalDateTime.now().plusHours(1));
        userRepo.save(user);

        String link = frontendUrl + "/reset-password?token=" + token;
        emailService.sendPasswordReset(user.getEmail(), user.getName(), link);
    }

    /* ======================
           RESET PASSWORD
           ====================== */
    @Transactional
    public void resetPassword(String token, String newPassword) {
        if (token == null || token.isBlank()) throw new RuntimeException("Invalid token");
        if (newPassword == null || newPassword.length() < 6) throw new RuntimeException("Password must be at least 6 characters");

        User user = userRepo.findByResetToken(token)
                .orElseThrow(() -> new RuntimeException("Invalid or expired reset link"));

        if (user.getResetTokenExpiry() == null || user.getResetTokenExpiry().isBefore(LocalDateTime.now())) {
            user.setResetToken(null);
            user.setResetTokenExpiry(null);
            userRepo.save(user);
            throw new RuntimeException("Reset link has expired. Please request a new one.");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setResetToken(null);
        user.setResetTokenExpiry(null);
        userRepo.save(user);
    }

    /* ======================
           GOOGLE LOGIN
           ====================== */
    @Transactional
    public AuthResponse googleLogin(String idToken) {

        // 1. Verify id_token with Google's tokeninfo endpoint
        JsonNode payload;
        try {
            HttpClient client = HttpClient.newHttpClient();
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://oauth2.googleapis.com/tokeninfo?id_token=" + idToken))
                    .GET()
                    .build();
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                throw new RuntimeException("Invalid Google token");
            }
            payload = new ObjectMapper().readTree(response.body());
        } catch (Exception e) {
            throw new RuntimeException("Google token verification failed: " + e.getMessage());
        }

        // 2. Validate audience matches our client ID (security check)
        if (!googleClientId.isBlank()) {
            String aud = payload.path("aud").asText("");
            if (!googleClientId.equals(aud)) {
                throw new RuntimeException("Token audience mismatch");
            }
        }

        // 3. Extract user info
        String email = payload.path("email").asText();
        String name  = payload.path("name").asText("Teacher");
        String sub   = payload.path("sub").asText(); // unique Google user ID

        if (email == null || email.isBlank()) {
            throw new RuntimeException("Email not available from Google");
        }

        // 4. Find existing user by email, or create new one
        User user = userRepo.findByEmail(email).orElse(null);

        boolean isNew = false;
        if (user == null) {
            // New user — create account (mobile = synthetic google_<sub>)
            user = new User();
            user.setName(name);
            user.setEmail(email);
            user.setMobile("google_" + sub);   // synthetic unique mobile
            user.setRole("TEACHER");
            user.setPlanType("FREE");
            userRepo.save(user);
            isNew = true;
        }

        if (isNew) {
            emailService.sendWelcome(user.getEmail(), user.getName());
            emailService.sendNewUserAlert(user.getName(), user.getEmail(), user.getMobile(), "Google");
        }

        String jwt = jwtUtil.generateToken(user.getMobile(), user.getRole());
        return new AuthResponse(jwt, user, "LOGIN");
    }


}
