package com.edu.teacherai.service;

import com.edu.teacherai.config.JwtUtil;
import com.edu.teacherai.dto.AuthRequest;
import com.edu.teacherai.dto.AuthResponse;
import com.edu.teacherai.dto.RegisterRequest;
import com.edu.teacherai.entity.OtpToken;
import com.edu.teacherai.entity.User;
import com.edu.teacherai.repository.OtpRepository;
import com.edu.teacherai.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Random;

@Service
public class AuthService {

        private final UserRepository userRepo;
        private final OtpRepository otpRepo;
        private final JwtUtil jwtUtil;
        private final PasswordEncoder passwordEncoder;

        public AuthService(
                UserRepository userRepo,
                OtpRepository otpRepo,
                JwtUtil jwtUtil,
                PasswordEncoder passwordEncoder
        ) {
            this.userRepo = userRepo;
            this.otpRepo = otpRepo;
            this.jwtUtil = jwtUtil;
            this.passwordEncoder = passwordEncoder;
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
                    otp,
                    LocalDateTime.now().plusMinutes(5)
            ));

            System.out.println("DEV OTP: " + otp);
        }

        /* ======================
           VERIFY OTP
           ====================== */
        @Transactional
        public AuthResponse verifyOtp(Map<String, String> req) {

            String mobile = req.get("mobile");
            String otp = req.get("otp");

            OtpToken token = otpRepo.findByMobile(mobile)
                    .orElseThrow(() -> new RuntimeException("OTP not found"));

            if (token.getExpiry().isBefore(LocalDateTime.now())) {
                throw new RuntimeException("OTP expired");
            }

            if (!token.getOtp().equals(otp)) {
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

        if (userRepo.findByMobile(req.getMobile()).isPresent()) {
            throw new RuntimeException("Mobile already registered");
        }

        User user = new User();
        user.setName(req.getName());
        user.setMobile(req.getMobile());
        user.setEmail(req.getEmail());
        user.setPassword(passwordEncoder.encode(req.getPassword()));
        user.setBoardPreference(req.getBoardPreference());
        user.setRole("TEACHER");
        user.setPlanType("FREE");

        userRepo.save(user);

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


        return new AuthResponse(
                jwt,
                user,
                "LOGIN"   // ✅ IMPORTANT
        );
    }


}
