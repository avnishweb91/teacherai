package com.edu.teacherai.service;

import com.edu.teacherai.entity.ErpRecord;
import com.edu.teacherai.entity.User;
import com.edu.teacherai.repository.ErpRecordRepository;
import com.edu.teacherai.repository.UserRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class ErpService {
    private static final Set<String> MODULES = Set.of(
            "ADMISSIONS", "STUDENTS", "FEES", "TRANSPORT", "LIBRARY",
            "INVENTORY", "STAFF", "PAYROLL", "LEAVE", "COMMUNICATION", "REPORTS"
    );

    private final ErpRecordRepository recordRepo;
    private final UserRepository userRepo;
    private final ObjectMapper mapper;

    public ErpService(ErpRecordRepository recordRepo, UserRepository userRepo, ObjectMapper mapper) {
        this.recordRepo = recordRepo;
        this.userRepo = userRepo;
        this.mapper = mapper;
    }

    public Set<String> modules() { return MODULES; }

    public User currentUser(String mobile) {
        return userRepo.findByMobile(mobile).orElseThrow(() -> new RuntimeException("User not found"));
    }

    private Long schoolId(String mobile) {
        User user = currentUser(mobile);
        if (user.getSchoolId() == null) throw new IllegalStateException("ERP access requires a school account");
        return user.getSchoolId();
    }

    public List<Map<String, Object>> list(String mobile, String module, String query) {
        String normalized = normalize(module);
        Long schoolId = schoolId(mobile);
        return recordRepo.findBySchoolIdAndModuleTypeOrderByUpdatedAtDesc(schoolId, normalized).stream()
                .map(this::toMap)
                .filter(r -> query == null || query.isBlank() ||
                        r.toString().toLowerCase(Locale.ROOT).contains(query.toLowerCase(Locale.ROOT)))
                .toList();
    }

    @Transactional
    public Map<String, Object> create(String mobile, String module, Map<String, Object> input) {
        User user = currentUser(mobile);
        Long schoolId = requireSchool(user);
        String normalized = normalize(module);
        ErpRecord record = new ErpRecord();
        record.setSchoolId(schoolId);
        record.setModuleType(normalized);
        record.setCreatedBy(user.getId());
        apply(record, input);
        return toMap(recordRepo.save(record));
    }

    @Transactional
    public Map<String, Object> update(String mobile, String module, Long id, Map<String, Object> input) {
        User user = currentUser(mobile);
        String normalized = normalize(module);
        ErpRecord record = recordRepo.findByIdAndSchoolIdAndModuleType(id, requireSchool(user), normalized)
                .orElseThrow(() -> new RuntimeException("ERP record not found"));
        apply(record, input);
        return toMap(recordRepo.save(record));
    }

    @Transactional
    public void delete(String mobile, String module, Long id) {
        User user = currentUser(mobile);
        ErpRecord record = recordRepo.findByIdAndSchoolIdAndModuleType(id, requireSchool(user), normalize(module))
                .orElseThrow(() -> new RuntimeException("ERP record not found"));
        recordRepo.delete(record);
    }

    public Map<String, Long> summary(String mobile) {
        Long schoolId = schoolId(mobile);
        Map<String, Long> counts = new LinkedHashMap<>();
        MODULES.stream().sorted().forEach(module -> counts.put(module, recordRepo.countBySchoolIdAndModuleType(schoolId, module)));
        return counts;
    }

    @Transactional
    public Map<String, Object> createFeeInvoice(String mobile, Map<String, Object> input) {
        Map<String, Object> data = new LinkedHashMap<>(input == null ? Map.of() : input);
        String invoiceNo = "INV-" + java.time.Year.now().getValue() + "-" + String.format("%05d", System.nanoTime() % 100000);
        data.put("invoiceNo", invoiceNo);
        data.put("paymentStatus", "DUE");
        data.put("issuedAt", java.time.LocalDateTime.now().toString());
        data.put("title", "Fee invoice — " + data.getOrDefault("studentName", "Student"));
        return create(mobile, "FEES", data);
    }

    @Transactional
    public Map<String, Object> receipt(String mobile, Long id, Map<String, Object> input) {
        User user = currentUser(mobile);
        ErpRecord record = recordRepo.findByIdAndSchoolIdAndModuleType(id, requireSchool(user), "FEES")
                .orElseThrow(() -> new RuntimeException("Fee invoice not found"));
        Map<String, Object> data = readData(record);
        data.put("paymentStatus", "PAID");
        data.put("paidAt", java.time.LocalDateTime.now().toString());
        data.put("receiptNo", "REC-" + java.time.Year.now().getValue() + "-" + String.format("%05d", System.nanoTime() % 100000));
        if (input != null) data.putAll(input);
        record.setStatus("PAID");
        writeData(record, data);
        return toMap(recordRepo.save(record));
    }

    @Transactional
    public Map<String, Object> calculatePayroll(String mobile, Map<String, Object> input) {
        Map<String, Object> data = new LinkedHashMap<>(input == null ? Map.of() : input);
        double basic = number(data.get("basicSalary"));
        double allowances = number(data.get("allowances"));
        double deductions = number(data.get("deductions"));
        data.put("grossSalary", basic + allowances);
        data.put("netSalary", basic + allowances - deductions);
        data.put("calculatedAt", java.time.LocalDateTime.now().toString());
        data.put("title", "Payroll — " + data.getOrDefault("staffName", "Staff"));
        return create(mobile, "PAYROLL", data);
    }

    @Transactional
    public Map<String, Object> assignTransport(String mobile, Map<String, Object> input) {
        Map<String, Object> data = new LinkedHashMap<>(input == null ? Map.of() : input);
        data.put("assignmentType", "STUDENT_ROUTE");
        data.put("title", "Route assignment — " + data.getOrDefault("studentName", "Student"));
        return create(mobile, "TRANSPORT", data);
    }

    @Transactional
    public Map<String, Object> calculateLibraryFine(String mobile, Map<String, Object> input) {
        Map<String, Object> data = new LinkedHashMap<>(input == null ? Map.of() : input);
        long finePerDay = Math.max(1, Math.round(number(data.getOrDefault("finePerDay", 5))));
        long overdueDays = 0;
        try {
            java.time.LocalDate due = java.time.LocalDate.parse(String.valueOf(data.get("dueDate")));
            java.time.LocalDate returned = java.time.LocalDate.parse(String.valueOf(data.getOrDefault("returnedDate", java.time.LocalDate.now())));
            overdueDays = Math.max(0, java.time.temporal.ChronoUnit.DAYS.between(due, returned));
        } catch (Exception ignored) { }
        data.put("overdueDays", overdueDays);
        data.put("fineAmount", overdueDays * finePerDay);
        data.put("title", "Library fine — " + data.getOrDefault("issuedTo", "Member"));
        return create(mobile, "LIBRARY", data);
    }

    public Map<String, Object> reportOverview(String mobile) {
        Long schoolId = schoolId(mobile);
        Map<String, Object> report = new LinkedHashMap<>();
        report.put("generatedAt", java.time.LocalDateTime.now());
        report.put("recordsByModule", summary(mobile));
        List<Map<String, Object>> fees = recordRepo.findBySchoolIdAndModuleTypeOrderByUpdatedAtDesc(schoolId, "FEES").stream().map(this::toMap).toList();
        report.put("feeInvoices", fees.size());
        report.put("feesCollected", fees.stream().filter(r -> "PAID".equals(String.valueOf(r.get("paymentStatus")))).mapToDouble(r -> number(r.get("amount"))).sum());
        report.put("feesOutstanding", fees.stream().filter(r -> !"PAID".equals(String.valueOf(r.get("paymentStatus")))).mapToDouble(r -> number(r.get("amount"))).sum());
        List<Map<String, Object>> payroll = recordRepo.findBySchoolIdAndModuleTypeOrderByUpdatedAtDesc(schoolId, "PAYROLL").stream().map(this::toMap).toList();
        report.put("payrollRecords", payroll.size());
        report.put("payrollNetTotal", payroll.stream().mapToDouble(r -> number(r.get("netSalary"))).sum());
        List<Map<String, Object>> library = recordRepo.findBySchoolIdAndModuleTypeOrderByUpdatedAtDesc(schoolId, "LIBRARY").stream().map(this::toMap).toList();
        report.put("libraryFines", library.stream().mapToDouble(r -> number(r.get("fineAmount"))).sum());
        return report;
    }

    private Long requireSchool(User user) {
        if (user.getSchoolId() == null) throw new IllegalStateException("ERP access requires a school account");
        return user.getSchoolId();
    }

    private String normalize(String module) {
        String normalized = module == null ? "" : module.trim().toUpperCase(Locale.ROOT);
        if (!MODULES.contains(normalized)) throw new IllegalArgumentException("Unsupported ERP module");
        return normalized;
    }

    private void apply(ErpRecord record, Map<String, Object> input) {
        if (input == null) throw new IllegalArgumentException("Record data is required");
        Object title = input.get("title");
        if (title == null || title.toString().isBlank()) throw new IllegalArgumentException("Record title is required");
        record.setTitle(title.toString().trim());
        record.setStatus(input.getOrDefault("status", "ACTIVE").toString().trim().toUpperCase(Locale.ROOT));
        Map<String, Object> data = new LinkedHashMap<>(input);
        data.remove("title");
        data.remove("status");
        try { record.setDataJson(mapper.writeValueAsString(data)); }
        catch (JsonProcessingException e) { throw new IllegalArgumentException("Invalid record data"); }
    }

    private Map<String, Object> readData(ErpRecord record) {
        try { return new LinkedHashMap<>(mapper.readValue(record.getDataJson(), Map.class)); }
        catch (Exception ignored) { return new LinkedHashMap<>(); }
    }

    private void writeData(ErpRecord record, Map<String, Object> data) {
        try { record.setDataJson(mapper.writeValueAsString(data)); }
        catch (JsonProcessingException e) { throw new IllegalArgumentException("Invalid record data"); }
    }

    private double number(Object value) {
        if (value == null) return 0;
        try { return Double.parseDouble(String.valueOf(value).replace(",", "")); }
        catch (NumberFormatException ignored) { return 0; }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> toMap(ErpRecord record) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", record.getId());
        result.put("moduleType", record.getModuleType());
        result.put("title", record.getTitle());
        result.put("status", record.getStatus());
        result.put("createdAt", record.getCreatedAt());
        result.put("updatedAt", record.getUpdatedAt());
        try {
            Map<String, Object> data = mapper.readValue(record.getDataJson(), Map.class);
            result.putAll(data);
        } catch (Exception ignored) { }
        return result;
    }
}
