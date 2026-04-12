package com.edu.teacherai;

import com.edu.teacherai.config.JwtUtil;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;

@TestConfiguration
public class TestSecurityConfig {

    @Bean
    public JwtUtil jwtUtil() {
        // 32+ chars → 256+ bits → safe for HS256
        return new JwtUtil("Test-JWT-Secret-Key-For-TeacherAI-256Bits!!");
    }
}
