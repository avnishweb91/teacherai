package com.edu.teacherai.service;

import com.edu.teacherai.entity.*;
import com.edu.teacherai.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;

@Service
public class StudentDirectoryService {
    private final UserRepository userRepo;
    private final StudentProfileRepository studentRepo;
    private final GuardianRepository guardianRepo;
    private final StudentGuardianRepository linkRepo;

    public StudentDirectoryService(UserRepository userRepo, StudentProfileRepository studentRepo, GuardianRepository guardianRepo, StudentGuardianRepository linkRepo) {
        this.userRepo = userRepo; this.studentRepo = studentRepo; this.guardianRepo = guardianRepo; this.linkRepo = linkRepo;
    }

    private User user(String mobile) { return userRepo.findByMobile(mobile).orElseThrow(() -> new IllegalArgumentException("User not found")); }
    private Long school(String mobile) { Long id = user(mobile).getSchoolId(); if (id == null) throw new IllegalStateException("School account required"); return id; }
    private void manager(User u) { if (!"SCHOOL_ADMIN".equals(u.getRole()) && !"ADMIN".equals(u.getRole())) throw new SecurityException("Only school administrators can manage students"); }

    public List<StudentProfile> students(String mobile) { return studentRepo.findBySchoolIdOrderByClassNameAscSectionAscFullNameAsc(school(mobile)); }

    @Transactional
    public StudentProfile createStudent(String mobile, Map<String, Object> input) {
        User u = user(mobile); manager(u); Long school = school(mobile);
        String admissionNo = text(input, "admissionNo"); String name = text(input, "fullName");
        if (admissionNo.isBlank() || name.isBlank()) throw new IllegalArgumentException("Admission number and student name are required");
        StudentProfile student = new StudentProfile(); student.setSchoolId(school); student.setAdmissionNo(admissionNo); student.setFullName(name);
        student.setClassName(text(input, "className")); student.setSection(text(input, "section")); student.setGender(text(input, "gender")); student.setAddress(text(input, "address"));
        if (!text(input, "dateOfBirth").isBlank()) student.setDateOfBirth(LocalDate.parse(text(input, "dateOfBirth")));
        return studentRepo.save(student);
    }

    @Transactional
    public Guardian createGuardian(String mobile, Map<String, Object> input) {
        User u = user(mobile); manager(u); Long school = school(mobile);
        String name = text(input, "fullName"); if (name.isBlank()) throw new IllegalArgumentException("Guardian name is required");
        Guardian guardian = new Guardian(); guardian.setSchoolId(school); guardian.setFullName(name); guardian.setPhone(text(input, "phone")); guardian.setEmail(text(input, "email")); guardian.setAddress(text(input, "address"));
        if (input.containsKey("notificationOptIn")) guardian.setNotificationOptIn(Boolean.parseBoolean(String.valueOf(input.get("notificationOptIn"))));
        return guardianRepo.save(guardian);
    }

    @Transactional
    public StudentGuardian link(String mobile, Long studentId, Long guardianId, Map<String, Object> input) {
        User u = user(mobile); manager(u); Long school = school(mobile);
        studentRepo.findByIdAndSchoolId(studentId, school).orElseThrow(() -> new IllegalArgumentException("Student not found"));
        guardianRepo.findByIdAndSchoolId(guardianId, school).orElseThrow(() -> new IllegalArgumentException("Guardian not found"));
        StudentGuardian link = new StudentGuardian(); link.setSchoolId(school); link.setStudentId(studentId); link.setGuardianId(guardianId); link.setRelationshipType(text(input, "relationshipType")); link.setPrimaryContact(Boolean.parseBoolean(String.valueOf(input.getOrDefault("primaryContact", false))));
        return linkRepo.save(link);
    }

    public Map<String, Object> profile(String mobile, Long studentId) {
        Long school = school(mobile); StudentProfile student = studentRepo.findByIdAndSchoolId(studentId, school).orElseThrow(() -> new IllegalArgumentException("Student not found"));
        List<Map<String, Object>> guardians = linkRepo.findBySchoolIdAndStudentId(school, studentId).stream().map(link -> guardianRepo.findByIdAndSchoolId(link.getGuardianId(), school).map(g -> Map.<String, Object>of("id", g.getId(), "fullName", g.getFullName(), "phone", g.getPhone() == null ? "" : g.getPhone(), "email", g.getEmail() == null ? "" : g.getEmail(), "relationshipType", link.getRelationshipType(), "primaryContact", link.isPrimaryContact())).orElse(Map.of())).toList();
        return Map.of("student", student, "guardians", guardians);
    }

    private String text(Map<String, Object> input, String key) { Object value = input == null ? null : input.get(key); return value == null ? "" : value.toString().trim(); }
}
