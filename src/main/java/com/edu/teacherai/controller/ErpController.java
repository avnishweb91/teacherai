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

    @GetMapping("/reports/overview")
    public ResponseEntity<?> reportOverview(Authentication auth) { return ResponseEntity.ok(erpService.reportOverview(auth.getName())); }

    @PostMapping("/fees/invoice")
    public ResponseEntity<?> feeInvoice(@RequestBody Map<String, Object> input, Authentication auth) { return ResponseEntity.ok(erpService.createFeeInvoice(auth.getName(), input)); }

    @PostMapping("/fees/{id}/receipt")
    public ResponseEntity<?> feeReceipt(@PathVariable Long id, @RequestBody(required = false) Map<String, Object> input, Authentication auth) { return ResponseEntity.ok(erpService.receipt(auth.getName(), id, input)); }

    @PostMapping("/payroll/calculate")
    public ResponseEntity<?> payroll(@RequestBody Map<String, Object> input, Authentication auth) { return ResponseEntity.ok(erpService.calculatePayroll(auth.getName(), input)); }

    @PostMapping("/transport/assign")
    public ResponseEntity<?> transport(@RequestBody Map<String, Object> input, Authentication auth) { return ResponseEntity.ok(erpService.assignTransport(auth.getName(), input)); }

    @PostMapping("/library/fine")
    public ResponseEntity<?> libraryFine(@RequestBody Map<String, Object> input, Authentication auth) { return ResponseEntity.ok(erpService.calculateLibraryFine(auth.getName(), input)); }

    @PostMapping("/{module}")
    public ResponseEntity<?> create(@PathVariable String module, @RequestBody Map<String, Object> input, Authentication auth) {
        return ResponseEntity.ok(erpService.create(auth.getName(), module, input));
    }

    @GetMapping("/audit")
    public ResponseEntity<?> audit(Authentication auth) { return ResponseEntity.ok(erpService.audit(auth.getName())); }

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
