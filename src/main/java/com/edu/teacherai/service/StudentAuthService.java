package com.edu.teacherai.service;

import com.edu.teacherai.config.JwtUtil;
import com.edu.teacherai.dto.AuthResponse;
import com.edu.teacherai.dto.StudentRegisterRequest;
import com.edu.teacherai.entity.User;
import com.edu.teacherai.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Locale;
import java.util.UUID;

@Service
public class StudentAuthService {
    private final UserRepository users;
    private final PasswordEncoder passwords;
    private final JwtUtil jwt;
    @Value("${google.client.id:}") private String googleClientId;

    public StudentAuthService(UserRepository users, PasswordEncoder passwords, JwtUtil jwt) {
        this.users = users;
        this.passwords = passwords;
        this.jwt = jwt;
    }

    public AuthResponse register(StudentRegisterRequest request) {
        if (request.getName() == null || request.getName().isBlank()) throw new RuntimeException("Student name is required");
        if (request.getEmail() == null || request.getEmail().isBlank()) throw new RuntimeException("Email is required");
        if (request.getPassword() == null || request.getPassword().length() < 6) throw new RuntimeException("Password must be at least 6 characters");
        if (users.findByEmailIgnoreCase(request.getEmail().trim()).isPresent()) throw new RuntimeException("This email is already registered");

        User student = new User();
        student.setName(request.getName().trim());
        student.setEmail(request.getEmail().trim().toLowerCase(Locale.ROOT));
        student.setMobile(nextStudentId());
        student.setPassword(passwords.encode(request.getPassword()));
        student.setBoardPreference(request.getGrade() == null ? "Class 7" : request.getGrade());
        student.setRole("STUDENT");
        student.setPlanType("FREE");
        users.save(student);
        return response(student);
    }

    public AuthResponse login(String studentId, String password) {
        if (studentId == null || password == null) throw new RuntimeException("Student ID and password are required");
        User student = users.findByMobile(studentId.trim().toUpperCase(Locale.ROOT))
                .orElseThrow(() -> new RuntimeException("Student account not found"));
        if (!"STUDENT".equals(student.getRole()) || student.getPassword() == null || !passwords.matches(password, student.getPassword())) throw new RuntimeException("Invalid Student ID or password");
        return response(student);
    }

    public AuthResponse googleLogin(String idToken) {
        if (idToken == null || idToken.isBlank()) throw new RuntimeException("Google token is required");
        try {
            HttpRequest request = HttpRequest.newBuilder().uri(URI.create("https://oauth2.googleapis.com/tokeninfo?id_token=" + idToken)).GET().build();
            HttpResponse<String> response = HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) throw new RuntimeException("Invalid Google token");
            JsonNode payload = new ObjectMapper().readTree(response.body());
            if (!googleClientId.isBlank() && !googleClientId.equals(payload.path("aud").asText())) throw new RuntimeException("Token audience mismatch");
            String email = payload.path("email").asText();
            if (email.isBlank()) throw new RuntimeException("Email not available from Google");
            User student = users.findByEmailIgnoreCase(email).orElse(null);
            if (student == null) {
                student = new User(); student.setName(payload.path("name").asText("Student")); student.setEmail(email.toLowerCase(Locale.ROOT));
                student.setMobile(nextStudentId()); student.setRole("STUDENT"); student.setPlanType("FREE"); users.save(student);
            }
            if (!"STUDENT".equals(student.getRole())) throw new RuntimeException("This email is linked to a teacher account. Use the teacher login.");
            return response(student);
        } catch (RuntimeException e) { throw e; }
        catch (Exception e) { throw new RuntimeException("Google sign-in failed"); }
    }

    private String nextStudentId() {
        String id;
        do { id = "SB-" + UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase(Locale.ROOT); }
        while (users.findByMobile(id).isPresent());
        return id;
    }
    private AuthResponse response(User student) { return new AuthResponse(jwt.generateToken(student.getMobile(), student.getRole()), student, "LOGIN"); }
}
