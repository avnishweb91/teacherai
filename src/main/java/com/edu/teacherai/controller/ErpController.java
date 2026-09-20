package com.edu.teacherai.controller;

import com.edu.teacherai.service.ErpService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/erp")
public class ErpController {
    private final ErpService erpService;

    public ErpController(ErpService erpService) { this.erpService = erpService; }

    @GetMapping("/summary")
    public ResponseEntity<?> summary(Authentication auth) { return ResponseEntity.ok(erpService.summary(auth.getName())); }

    @GetMapping("/{module}")
    public ResponseEntity<?> list(@PathVariable String module, @RequestParam(required = false) String q, Authentication auth) {
        return ResponseEntity.ok(erpService.list(auth.getName(), module, q));
    }

    @PostMapping("/{module}")
    public ResponseEntity<?> create(@PathVariable String module, @RequestBody Map<String, Object> input, Authentication auth) {
        return ResponseEntity.ok(erpService.create(auth.getName(), module, input));
    }

    @PutMapping("/{module}/{id}")
    public ResponseEntity<?> update(@PathVariable String module, @PathVariable Long id, @RequestBody Map<String, Object> input, Authentication auth) {
        return ResponseEntity.ok(erpService.update(auth.getName(), module, id, input));
    }

    @DeleteMapping("/{module}/{id}")
    public ResponseEntity<Void> delete(@PathVariable String module, @PathVariable Long id, Authentication auth) {
        erpService.delete(auth.getName(), module, id);
        return ResponseEntity.noContent().build();
    }
}
