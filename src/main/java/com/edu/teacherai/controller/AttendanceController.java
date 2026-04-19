package com.edu.teacherai.controller;

import com.edu.teacherai.entity.AttendanceRecord;
import com.edu.teacherai.entity.AttendanceStudent;
import com.edu.teacherai.entity.User;
import com.edu.teacherai.repository.AttendanceRecordRepository;
import com.edu.teacherai.repository.AttendanceStudentRepository;
import com.edu.teacherai.repository.ParentContactRepository;
import com.edu.teacherai.repository.UserRepository;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/attendance")
public class AttendanceController {

    private final AttendanceStudentRepository studentRepo;
    private final AttendanceRecordRepository recordRepo;
    private final ParentContactRepository contactRepo;
    private final UserRepository userRepo;

    public AttendanceController(AttendanceStudentRepository studentRepo,
                                AttendanceRecordRepository recordRepo,
                                ParentContactRepository contactRepo,
                                UserRepository userRepo) {
        this.studentRepo = studentRepo;
        this.recordRepo = recordRepo;
        this.contactRepo = contactRepo;
        this.userRepo = userRepo;
    }

    private Long userId(Authentication auth) {
        return userRepo.findByMobile(auth.getName())
                .map(User::getId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    }

    /* ── Students ── */

    @GetMapping("/students")
    public List<AttendanceStudent> getStudents(Authentication auth) {
        return studentRepo.findByUserIdOrderByClassNameAscSectionAscRollNoAscNameAsc(userId(auth));
    }

    @PostMapping("/students")
    public AttendanceStudent addStudent(@RequestBody AttendanceStudent body, Authentication auth) {
        body.setId(null);
        body.setUserId(userId(auth));
        return studentRepo.save(body);
    }

    @PostMapping("/students/bulk")
    public List<AttendanceStudent> bulkAddStudents(@RequestBody List<AttendanceStudent> students, Authentication auth) {
        Long uid = userId(auth);
        students.forEach(s -> { s.setId(null); s.setUserId(uid); });
        return studentRepo.saveAll(students);
    }

    @DeleteMapping("/students/{id}")
    @Transactional
    public ResponseEntity<Void> deleteStudent(@PathVariable Long id, Authentication auth) {
        Long uid = userId(auth);
        studentRepo.findByIdAndUserId(id, uid)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        recordRepo.deleteByUserIdAndStudentId(uid, id);
        contactRepo.deleteByUserIdAndStudentId(uid, id);
        studentRepo.deleteByIdAndUserId(id, uid);
        return ResponseEntity.noContent().build();
    }

    /* ── Records ── */

    @GetMapping("/records")
    public Map<String, String> getRecordsForDate(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            Authentication auth) {
        Long uid = userId(auth);
        Map<String, String> result = new LinkedHashMap<>();
        recordRepo.findByUserIdAndDate(uid, date)
                .forEach(r -> result.put(String.valueOf(r.getStudentId()), r.getStatus()));
        return result;
    }

    @PostMapping("/records")
    @Transactional
    public ResponseEntity<Void> saveRecords(@RequestBody Map<String, Object> body, Authentication auth) {
        Long uid = userId(auth);
        String dateStr = (String) body.get("date");
        @SuppressWarnings("unchecked")
        Map<String, String> records = (Map<String, String>) body.get("records");

        if (dateStr == null || records == null)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "date and records required");

        LocalDate date = LocalDate.parse(dateStr);

        records.forEach((studentIdStr, status) -> {
            Long studentId = Long.parseLong(studentIdStr);
            Optional<AttendanceRecord> existing = recordRepo.findByUserIdAndDate(uid, date)
                    .stream().filter(r -> r.getStudentId().equals(studentId)).findFirst();

            if (status == null || status.isBlank()) {
                existing.ifPresent(r -> recordRepo.deleteById(r.getId()));
            } else {
                AttendanceRecord rec = existing.orElse(new AttendanceRecord());
                rec.setUserId(uid);
                rec.setStudentId(studentId);
                rec.setDate(date);
                rec.setStatus(status);
                recordRepo.save(rec);
            }
        });
        return ResponseEntity.ok().build();
    }

    @GetMapping("/records/year")
    public Map<String, Map<String, String>> getYearRecords(
            @RequestParam int year,
            Authentication auth) {
        Long uid = userId(auth);
        LocalDate from = LocalDate.of(year, 1, 1);
        LocalDate to = LocalDate.of(year, 12, 31);

        Map<String, Map<String, String>> result = new TreeMap<>();
        recordRepo.findByUserIdAndDateBetween(uid, from, to).forEach(r -> {
            String dateKey = r.getDate().toString();
            result.computeIfAbsent(dateKey, k -> new LinkedHashMap<>())
                    .put(String.valueOf(r.getStudentId()), r.getStatus());
        });
        return result;
    }

    @GetMapping("/records/month")
    public Map<String, Map<String, String>> getMonthRecords(
            @RequestParam int year,
            @RequestParam int month,
            Authentication auth) {
        Long uid = userId(auth);
        LocalDate from = LocalDate.of(year, month, 1);
        LocalDate to = from.withDayOfMonth(from.lengthOfMonth());

        Map<String, Map<String, String>> result = new TreeMap<>();
        recordRepo.findByUserIdAndDateBetween(uid, from, to).forEach(r -> {
            String dateKey = r.getDate().toString();
            result.computeIfAbsent(dateKey, k -> new LinkedHashMap<>())
                    .put(String.valueOf(r.getStudentId()), r.getStatus());
        });
        return result;
    }
}
