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

        @Value("${google.client.id:}")
        private String googleClientId;

        public AuthService(
                UserRepository userRepo,
                OtpRepository otpRepo,
                JwtUtil jwtUtil,
                PasswordEncoder passwordEncoder,
                SmsService smsService,
                EmailService emailService
        ) {
            this.userRepo = userRepo;
            this.otpRepo = otpRepo;
            this.jwtUtil = jwtUtil;
            this.passwordEncoder = passwordEncoder;
            this.smsService = smsService;
            this.emailService = emailService;
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
        user.setName(req.getName());
        user.setMobile(mobile);
        user.setEmail(req.getEmail());
        user.setPassword(passwordEncoder.encode(req.getPassword()));
        user.setBoardPreference(req.getBoardPreference());
        user.setRole("TEACHER");
        user.setPlanType("FREE");

        userRepo.save(user);

        emailService.sendWelcome(user.getEmail(), user.getName());

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
        }

        String jwt = jwtUtil.generateToken(user.getMobile(), user.getRole());
        return new AuthResponse(jwt, user, "LOGIN");
    }


}
