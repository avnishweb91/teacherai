package com.edu.teacherai.service;

import com.edu.teacherai.config.JwtUtil;
import com.edu.teacherai.dto.AuthResponse;
import com.edu.teacherai.dto.SchoolRegisterRequest;
import com.edu.teacherai.entity.School;
import com.edu.teacherai.entity.User;
import com.edu.teacherai.repository.SchoolRepository;
import com.edu.teacherai.repository.UsageRepository;
import com.edu.teacherai.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class SchoolService {

    private final SchoolRepository schoolRepo;
    private final UserRepository userRepo;
    private final UsageRepository usageRepo;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final EmailService emailService;

    public SchoolService(SchoolRepository schoolRepo, UserRepository userRepo,
                         UsageRepository usageRepo, PasswordEncoder passwordEncoder,
                         JwtUtil jwtUtil, EmailService emailService) {
        this.schoolRepo = schoolRepo;
        this.userRepo = userRepo;
        this.usageRepo = usageRepo;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.emailService = emailService;
    }

    @Transactional
    public AuthResponse registerSchool(SchoolRegisterRequest req) {
        if (schoolRepo.existsByAdminEmail(req.getAdminEmail())) {
            throw new RuntimeException("A school is already registered with this email");
        }
        if (userRepo.findByEmail(req.getAdminEmail()).isPresent()) {
            throw new RuntimeException("Email already registered");
        }

        // Create school
        School school = new School();
        school.setName(req.getSchoolName());
        school.setAddress(req.getAddress());
        school.setPhone(req.getPhone());
        school.setAdminEmail(req.getAdminEmail());
        schoolRepo.save(school);

        // Create school admin user
        User admin = new User();
        admin.setName(req.getAdminName());
        admin.setEmail(req.getAdminEmail());
        admin.setMobile("school_" + school.getId() + "_" + System.currentTimeMillis());
        admin.setPassword(passwordEncoder.encode(req.getAdminPassword()));
        admin.setRole("SCHOOL_ADMIN");
        admin.setPlanType("SCHOOL");
        admin.setSchoolId(school.getId());
        userRepo.save(admin);

        emailService.sendWelcome(admin.getEmail(), admin.getName());

        String jwt = jwtUtil.generateToken(admin.getMobile(), admin.getRole());
        return new AuthResponse(jwt, admin, "LOGIN");
    }

    public Map<String, Object> getSchoolDashboard(Long schoolId) {
        School school = schoolRepo.findById(schoolId)
                .orElseThrow(() -> new RuntimeException("School not found"));

        List<User> teachers = userRepo.findBySchoolId(schoolId).stream()
                .filter(u -> "TEACHER".equals(u.getRole()))
                .toList();

        List<Long> teacherIds = teachers.stream().map(User::getId).toList();

        long totalUsage = teacherIds.isEmpty() ? 0 : usageRepo.countByUserIdIn(teacherIds);

        Map<String, Long> usageByFeature = new HashMap<>();
        if (!teacherIds.isEmpty()) {
            usageRepo.countByFeatureForUsers(teacherIds)
                    .forEach(row -> usageByFeature.put((String) row[0], (Long) row[1]));
        }

        Map<String, Object> result = new HashMap<>();
        result.put("school", Map.of(
                "id", school.getId(),
                "name", school.getName(),
                "address", school.getAddress() != null ? school.getAddress() : "",
                "phone", school.getPhone() != null ? school.getPhone() : "",
                "inviteCode", school.getInviteCode(),
                "createdAt", school.getCreatedAt()
        ));
        result.put("teacherCount", teachers.size());
        result.put("teachers", teachers.stream().map(t -> Map.of(
                "id", t.getId(),
                "name", t.getName(),
                "email", t.getEmail() != null ? t.getEmail() : "",
                "planType", t.getPlanType(),
                "createdAt", t.getCreatedAt()
        )).toList());
        result.put("totalUsage", totalUsage);
        result.put("usageByFeature", usageByFeature);

        // Weekly activity — last 7 days
        Map<String, Long> weeklyActivity = new LinkedHashMap<>();
        LocalDate today = LocalDate.now();
        for (int i = 6; i >= 0; i--) weeklyActivity.put(today.minusDays(i).toString(), 0L);
        if (!teacherIds.isEmpty()) {
            usageRepo.findDailyTotalsForUsers(teacherIds, today.minusDays(6))
                    .forEach(row -> weeklyActivity.put(row[0].toString(), (Long) row[1]));
        }
        result.put("weeklyActivity", weeklyActivity);

        long activeThisWeek = teacherIds.isEmpty() ? 0
                : usageRepo.countActiveUsersForUsersSince(teacherIds, today.minusDays(6));
        result.put("activeThisWeek", activeThisWeek);

        return result;
    }

    @Transactional
    public void removeTeacher(Long schoolId, Long teacherId) {
        User teacher = userRepo.findById(teacherId)
                .orElseThrow(() -> new RuntimeException("Teacher not found"));
        if (!schoolId.equals(teacher.getSchoolId())) {
            throw new RuntimeException("Teacher does not belong to your school");
        }
        teacher.setSchoolId(null);
        teacher.setPlanType("FREE");
        userRepo.save(teacher);
    }
}
