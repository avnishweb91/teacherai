package com.edu.teacherai.controller;

import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import com.razorpay.Utils;
import com.edu.teacherai.entity.User;
import com.edu.teacherai.repository.UserRepository;
import com.edu.teacherai.service.EmailService;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@SuppressWarnings("unused")
@RestController
@RequestMapping("/api/payment")
public class PaymentController {

    @Value("${razorpay.key.id}")
    private String keyId;

    @Value("${razorpay.key.secret}")
    private String keySecret;

    private final UserRepository userRepo;
    private final EmailService emailService;

    // plan → amount in paise (INR * 100)
    private static final Map<String, Integer> PLAN_AMOUNTS = Map.of(
        "PRO_MONTHLY",    19900,   // ₹199
        "PRO_YEARLY",    149900,   // ₹1499
        "SCHOOL_MONTHLY", 99900    // ₹999
    );

    // plan key → planType value to store in DB
    private static final Map<String, String> PLAN_TYPE = Map.of(
        "PRO_MONTHLY",   "PRO",
        "PRO_YEARLY",    "PRO",
        "SCHOOL_MONTHLY","SCHOOL"
    );

    public PaymentController(UserRepository userRepo, EmailService emailService) {
        this.userRepo = userRepo;
        this.emailService = emailService;
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

        try {
            RazorpayClient client = new RazorpayClient(keyId, keySecret);

            JSONObject options = new JSONObject();
            options.put("amount", amount);
            options.put("currency", "INR");
            options.put("receipt", "receipt_" + auth.getName() + "_" + System.currentTimeMillis());
            options.put("payment_capture", 1);

            Order order = client.orders.create(options);

            return ResponseEntity.ok(Map.of(
                "orderId",  order.get("id"),
                "amount",   amount,
                "currency", "INR",
                "keyId",    keyId
            ));

        } catch (RazorpayException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to create payment order");
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
