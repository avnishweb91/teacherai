package com.edu.teacherai.controller;

import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import com.razorpay.Utils;
import com.edu.teacherai.entity.User;
import com.edu.teacherai.repository.UserRepository;
import com.edu.teacherai.service.EmailService;
import com.edu.teacherai.service.ErpService;
import com.edu.teacherai.entity.FeePayment;
import com.edu.teacherai.repository.FeePaymentRepository;
import org.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.time.LocalDateTime;

@SuppressWarnings("unused")
@RestController
@RequestMapping("/api/payment")
public class PaymentController {

    private static final Logger log = LoggerFactory.getLogger(PaymentController.class);

    @Value("${razorpay.key.id}")
    private String keyId;

    @Value("${razorpay.key.secret}")
    private String keySecret;

    private final UserRepository userRepo;
    private final EmailService emailService;
    private final ErpService erpService;
    private final FeePaymentRepository feePaymentRepo;

    // plan → amount in paise (INR * 100)
    private static final Map<String, Integer> PLAN_AMOUNTS = Map.of(
        "PRO_MONTHLY",    19900,   // ₹199
        "PRO_YEARLY",    179900,   // ₹1,799
        "SCHOOL_MONTHLY",199900,   // ₹1,999
        "SCHOOL_PRO",    349900    // ₹3,499
    );

    // plan key → planType value to store in DB
    private static final Map<String, String> PLAN_TYPE = Map.of(
        "PRO_MONTHLY",   "PRO",
        "PRO_YEARLY",    "PRO",
        "SCHOOL_MONTHLY","SCHOOL",
        "SCHOOL_PRO",    "SCHOOL"
    );

    public PaymentController(UserRepository userRepo, EmailService emailService, ErpService erpService, FeePaymentRepository feePaymentRepo) {
        this.userRepo = userRepo; this.emailService = emailService; this.erpService = erpService; this.feePaymentRepo = feePaymentRepo;
    }

    @PostMapping("/school-fee/create-order")
    public ResponseEntity<?> createSchoolFeeOrder(@RequestBody Map<String, Object> body, Authentication auth) {
        User user = userRepo.findByMobile(auth.getName()).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        if (!"SCHOOL_ADMIN".equals(user.getRole()) && !"ADMIN".equals(user.getRole())) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only school administrators can collect fees");
        long invoiceId = Long.parseLong(String.valueOf(body.get("invoiceId")));
        Map<String, Object> invoice = erpService.getRecord(auth.getName(), "FEES", invoiceId);
        long amountPaise = Math.round(Double.parseDouble(String.valueOf(invoice.getOrDefault("amount", 0))) * 100);
        if (amountPaise <= 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invoice amount must be greater than zero");
        if (keyId == null || keyId.isBlank() || keySecret == null || keySecret.isBlank()) throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Payment gateway not configured");
        try {
            RazorpayClient client = new RazorpayClient(keyId, keySecret); JSONObject options = new JSONObject();
            options.put("amount", amountPaise); options.put("currency", "INR"); options.put("receipt", String.valueOf(invoice.getOrDefault("invoiceNo", "fee_" + invoiceId))); options.put("payment_capture", 1);
            options.put("notes", new JSONObject(Map.of("invoiceId", String.valueOf(invoiceId), "schoolId", String.valueOf(user.getSchoolId()))));
            Order order = client.orders.create(options);
            FeePayment payment = new FeePayment(); payment.setSchoolId(user.getSchoolId()); payment.setInvoiceRecordId(invoiceId); payment.setOrderId(order.get("id")); payment.setAmountPaise(amountPaise); feePaymentRepo.save(payment);
            return ResponseEntity.ok(Map.of("orderId", order.get("id"), "amount", amountPaise, "currency", "INR", "keyId", keyId, "invoiceId", invoiceId));
        } catch (RazorpayException ex) { throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Payment gateway error"); }
    }

    @PostMapping("/school-fee/verify")
    public ResponseEntity<?> verifySchoolFee(@RequestBody Map<String, String> body, Authentication auth) {
        User user = userRepo.findByMobile(auth.getName()).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        FeePayment payment = feePaymentRepo.findByOrderIdAndSchoolId(body.get("razorpay_order_id"), user.getSchoolId()).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Fee order not found"));
        verifySignature(body.get("razorpay_order_id"), body.get("razorpay_payment_id"), body.get("razorpay_signature"));
        payment.setPaymentId(body.get("razorpay_payment_id")); payment.setStatus("PAID"); payment.setPaidAt(LocalDateTime.now()); feePaymentRepo.save(payment);
        erpService.markFeePaid(user.getSchoolId(), payment.getInvoiceRecordId(), payment.getPaymentId(), payment.getAmountPaise() / 100.0);
        return ResponseEntity.ok(Map.of("success", true, "status", "PAID", "receiptNo", payment.getPaymentId()));
    }

    @PostMapping("/webhook")
    public ResponseEntity<Void> webhook(@RequestBody String payload, @RequestHeader(value = "X-Razorpay-Signature", required = false) String signature) {
        String webhookSecret = System.getenv("RAZORPAY_WEBHOOK_SECRET");
        if (webhookSecret == null || webhookSecret.isBlank() || signature == null) return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        try {
            if (!Utils.verifyWebhookSignature(payload, signature, webhookSecret)) return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
            JSONObject event = new JSONObject(payload); String type = event.optString("event"); JSONObject eventPayload = event.optJSONObject("payload"); JSONObject paymentPayload = eventPayload == null ? null : eventPayload.optJSONObject("payment"); JSONObject paymentEntity = paymentPayload == null ? null : paymentPayload.optJSONObject("entity");
            if (paymentEntity == null) return ResponseEntity.ok().build(); String orderId = paymentEntity.optString("order_id");
            feePaymentRepo.findByOrderId(orderId).ifPresent(payment -> { if ("payment.captured".equals(type) || "order.paid".equals(type)) { payment.setPaymentId(paymentEntity.optString("id")); payment.setStatus("PAID"); payment.setPaidAt(LocalDateTime.now()); feePaymentRepo.save(payment); erpService.markFeePaid(payment.getSchoolId(), payment.getInvoiceRecordId(), payment.getPaymentId(), payment.getAmountPaise() / 100.0); } else if ("payment.failed".equals(type)) { payment.setStatus("FAILED"); payment.setFailureReason(paymentEntity.optString("error_description")); feePaymentRepo.save(payment); } });
            return ResponseEntity.ok().build();
        } catch (Exception ex) { return ResponseEntity.status(HttpStatus.BAD_REQUEST).build(); }
    }

    private void verifySignature(String orderId, String paymentId, String signature) {
        if (orderId == null || paymentId == null || signature == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing payment fields");
        try { JSONObject attributes = new JSONObject(); attributes.put("razorpay_order_id", orderId); attributes.put("razorpay_payment_id", paymentId); attributes.put("razorpay_signature", signature); if (!Utils.verifyPaymentSignature(attributes, keySecret)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Payment signature invalid"); }
        catch (RazorpayException ex) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Signature verification failed"); }
    }

    /* ── Create Razorpay Order ── */
    @PostMapping("/create-order")
    public ResponseEntity<?> createOrder(
            @RequestBody Map<String, String> body,
            Authentication auth) {

        String planKey = body.get("plan");
        Integer amount = PLAN_AMOUNTS.get(planKey);

        if (amount == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid plan: " + planKey);
        }

        if (keyId == null || keyId.isBlank() || keySecret == null || keySecret.isBlank()) {
            log.error("Razorpay keys not configured — RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is empty");
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Payment gateway not configured");
        }

        try {
            RazorpayClient client = new RazorpayClient(keyId, keySecret);

            JSONObject options = new JSONObject();
            options.put("amount", amount);
            options.put("currency", "INR");
            options.put("receipt", "rcpt_" + System.currentTimeMillis());
            options.put("payment_capture", 1);

            Order order = client.orders.create(options);
            log.info("Razorpay order created: {} for plan: {}", order.get("id"), planKey);

            return ResponseEntity.ok(Map.of(
                "orderId",  order.get("id"),
                "amount",   amount,
                "currency", "INR",
                "keyId",    keyId
            ));

        } catch (RazorpayException e) {
            log.error("Razorpay order creation failed for plan {}: {}", planKey, e.getMessage());
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                "Payment gateway error: " + e.getMessage());
        }
    }

    /* ── Verify Payment & Upgrade Plan ── */
    @PostMapping("/verify")
    public ResponseEntity<?> verifyPayment(
            @RequestBody Map<String, String> body,
            Authentication auth) {

        String orderId   = body.get("razorpay_order_id");
        String paymentId = body.get("razorpay_payment_id");
        String signature = body.get("razorpay_signature");
        String planKey   = body.get("plan");

        if (orderId == null || paymentId == null || signature == null || planKey == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing payment fields");
        }

        // Verify HMAC-SHA256 signature
        try {
            JSONObject attributes = new JSONObject();
            attributes.put("razorpay_order_id",   orderId);
            attributes.put("razorpay_payment_id", paymentId);
            attributes.put("razorpay_signature",  signature);

            boolean valid = Utils.verifyPaymentSignature(attributes, keySecret);
            if (!valid) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Payment signature invalid");
            }
        } catch (RazorpayException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Signature verification failed");
        }

        // Upgrade plan in DB
        String newPlanType = PLAN_TYPE.get(planKey);
        if (newPlanType == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown plan key");
        }

        User user = userRepo.findByMobile(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        user.setPlanType(newPlanType);
        userRepo.save(user);

        emailService.sendPaymentReceipt(
            user.getEmail(), user.getName(),
            newPlanType, PLAN_AMOUNTS.get(planKey)
        );

        return ResponseEntity.ok(Map.of(
            "success", true,
            "planType", newPlanType,
            "message", "Plan upgraded to " + newPlanType
        ));
    }
}
