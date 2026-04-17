package com.edu.teacherai.controller;

import com.edu.teacherai.entity.User;
import com.edu.teacherai.repository.UsageRepository;
import com.edu.teacherai.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@SuppressWarnings("unused")
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final UserRepository userRepo;
    private final UsageRepository usageRepo;

    @Value("${admin.setup.secret:}")
    private String adminSetupSecret;

    private static final int PRO_PRICE    = 199;
    private static final int SCHOOL_PRICE = 999;

    public AdminController(UserRepository userRepo, UsageRepository usageRepo) {
        this.userRepo  = userRepo;
        this.usageRepo = usageRepo;
    }

    /* ── One-time admin promotion (public endpoint, secret-gated) ── */
    @PostMapping("/setup")
    public Map<String, String> setupAdmin(@RequestBody Map<String, String> body) {
        String secret = body.get("secret");
        String email  = body.get("email");
        String mobile = body.get("mobile");

        if (adminSetupSecret == null || adminSetupSecret.isBlank()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Setup not configured");
        }
        if (!adminSetupSecret.equals(secret)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Invalid secret");
        }

        // Prefer email lookup, fall back to mobile
        User user;
        if (email != null && !email.isBlank()) {
            user = userRepo.findByEmail(email)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        } else {
            user = userRepo.findByMobile(mobile)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        }

        user.setRole("ADMIN");
        userRepo.save(user);

        return Map.of("message", "User " + mobile + " promoted to ADMIN");
    }

    private void requireAdmin(Authentication auth) {
        if (auth == null || auth.getAuthorities().stream()
                .noneMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin access required");
        }
    }

    /* ── Overall stats ── */
    @GetMapping("/stats")
    public Map<String, Object> getStats(Authentication auth) {
        requireAdmin(auth);

        List<User> all = userRepo.findAll();

        long free   = all.stream().filter(u -> "FREE".equals(u.getPlanType())).count();
        long pro    = all.stream().filter(u -> "PRO".equals(u.getPlanType())).count();
        long school = all.stream().filter(u -> "SCHOOL".equals(u.getPlanType())).count();

        long mrr = (pro * PRO_PRICE) + (school * SCHOOL_PRICE);

        LocalDate today = LocalDate.now();
        LocalDate weekAgo = today.minusDays(6);

        long newToday = all.stream()
                .filter(u -> u.getCreatedAt() != null && u.getCreatedAt().toLocalDate().equals(today))
                .count();
        long newThisWeek = all.stream()
                .filter(u -> u.getCreatedAt() != null && !u.getCreatedAt().toLocalDate().isBefore(weekAgo))
                .count();

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalUsers",    all.size());
        stats.put("freeUsers",     free);
        stats.put("proUsers",      pro);
        stats.put("schoolUsers",   school);
        stats.put("estimatedMrr",  mrr);
        stats.put("newUsersToday", newToday);
        stats.put("newThisWeek",   newThisWeek);
        return stats;
    }

    /* ── User list ── */
    @GetMapping("/users")
    public List<Map<String, Object>> getUsers(Authentication auth) {
        requireAdmin(auth);

        return userRepo.findAll().stream()
                .sorted(Comparator.comparing(User::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(u -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id",        u.getId());
                    m.put("name",      u.getName());
                    m.put("mobile",    u.getMobile());
                    m.put("email",     u.getEmail());
                    m.put("planType",  u.getPlanType());
                    m.put("role",      u.getRole());
                    m.put("board",     u.getBoardPreference());
                    m.put("createdAt", u.getCreatedAt() != null ? u.getCreatedAt().toLocalDate().toString() : null);
                    return m;
                })
                .collect(Collectors.toList());
    }

    /* ── Usage analytics — last N days ── */
    @GetMapping("/usage")
    public Map<String, Object> getUsage(
            Authentication auth,
            @RequestParam(defaultValue = "7") int days) {
        requireAdmin(auth);

        LocalDate from = LocalDate.now().minusDays(days - 1);
        List<Object[]> rows = usageRepo.findDailyUsageSince(from);

        // Build date range
        List<String> dates = new ArrayList<>();
        for (int i = 0; i < days; i++) {
            dates.add(from.plusDays(i).toString());
        }

        // feature → { date → count }
        Map<String, Map<String, Long>> byFeature = new LinkedHashMap<>();
        for (Object[] row : rows) {
            String feature = (String) row[0];
            String date    = row[1].toString();
            long   count   = ((Number) row[2]).longValue();
            byFeature.computeIfAbsent(feature, k -> new LinkedHashMap<>()).put(date, count);
        }

        // Flatten into series with zeros for missing dates
        List<Map<String, Object>> series = new ArrayList<>();
        for (Map.Entry<String, Map<String, Long>> entry : byFeature.entrySet()) {
            List<Long> counts = dates.stream()
                    .map(d -> entry.getValue().getOrDefault(d, 0L))
                    .collect(Collectors.toList());
            Map<String, Object> s = new LinkedHashMap<>();
            s.put("feature", entry.getKey());
            s.put("counts",  counts);
            series.add(s);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("dates",  dates);
        result.put("series", series);
        return result;
    }
}
