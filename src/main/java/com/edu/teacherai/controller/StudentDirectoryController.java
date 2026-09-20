package com.edu.teacherai.controller;

import com.edu.teacherai.service.StudentDirectoryService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/student-directory")
public class StudentDirectoryController {
    private final StudentDirectoryService service;
    public StudentDirectoryController(StudentDirectoryService service) { this.service = service; }

    @GetMapping("/students") public ResponseEntity<?> students(Authentication auth) { return ResponseEntity.ok(service.students(auth.getName())); }
    @PostMapping("/students") public ResponseEntity<?> createStudent(@RequestBody Map<String, Object> body, Authentication auth) { return ResponseEntity.ok(service.createStudent(auth.getName(), body)); }
    @PostMapping("/guardians") public ResponseEntity<?> createGuardian(@RequestBody Map<String, Object> body, Authentication auth) { return ResponseEntity.ok(service.createGuardian(auth.getName(), body)); }
    @PostMapping("/students/{studentId}/guardians/{guardianId}") public ResponseEntity<?> link(@PathVariable Long studentId, @PathVariable Long guardianId, @RequestBody(required = false) Map<String, Object> body, Authentication auth) { return ResponseEntity.ok(service.link(auth.getName(), studentId, guardianId, body == null ? Map.of() : body)); }
    @GetMapping("/students/{studentId}") public ResponseEntity<?> profile(@PathVariable Long studentId, Authentication auth) { return ResponseEntity.ok(service.profile(auth.getName(), studentId)); }
}
