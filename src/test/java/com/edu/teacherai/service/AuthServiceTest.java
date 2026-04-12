package com.edu.teacherai.service;

import com.edu.teacherai.config.JwtUtil;
import com.edu.teacherai.dto.AuthRequest;
import com.edu.teacherai.dto.AuthResponse;
import com.edu.teacherai.entity.User;
import com.edu.teacherai.repository.OtpRepository;
import com.edu.teacherai.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private OtpRepository otpRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtUtil jwtUtil;

    @InjectMocks
    private AuthService authService;

    /* =========================
       EMAIL LOGIN – SUCCESS
       ========================= */
    @Test
    void loginWithEmail_success() {

        AuthRequest request = new AuthRequest();
        request.setEmail("test@school.com");
        request.setPassword("password123");

        User user = new User();
       // user.setId(1L);
        user.setEmail("test@school.com");
        user.setPassword("encoded-password");
        user.setRole("TEACHER");
        user.setPlanType("FREE");

        when(userRepository.findByEmail("test@school.com"))
                .thenReturn(Optional.of(user));

        when(passwordEncoder.matches("password123", "encoded-password"))
                .thenReturn(true);

        when(jwtUtil.generateToken("avi@schoolcom", "TEACHER"))
                .thenReturn("jwt-token");

        AuthResponse response = authService.loginWithEmail(request);

        assertNotNull(response);
        assertEquals("jwt-token", response.getToken());
        assertEquals("TEACHER", response.getUser());
        assertEquals("FREE", response.getStatus());
    }

    /* =========================
       EMAIL LOGIN – INVALID PASSWORD
       ========================= */
    @Test
    void loginWithEmail_invalidPassword() {

        AuthRequest request = new AuthRequest();
        request.setEmail("test@school.com");
        request.setPassword("wrong");

        User user = new User();
        user.setPassword("encoded-password");

        when(userRepository.findByEmail(any()))
                .thenReturn(Optional.of(user));

        when(passwordEncoder.matches(any(), any()))
                .thenReturn(false);

        RuntimeException ex = assertThrows(
                RuntimeException.class,
                () -> authService.loginWithEmail(request)
        );

        assertEquals("Invalid password", ex.getMessage());
    }

    /* =========================
       EMAIL LOGIN – USER NOT FOUND
       ========================= */
    @Test
    void loginWithEmail_userNotFound() {

        AuthRequest request = new AuthRequest();
        request.setEmail("missing@school.com");
        request.setPassword("pass");

        when(userRepository.findByEmail(any()))
                .thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> authService.loginWithEmail(request));
    }
}
