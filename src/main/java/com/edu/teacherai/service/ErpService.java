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
            "INVENTORY", "STAFF", "LEAVE", "COMMUNICATION", "REPORTS"
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
