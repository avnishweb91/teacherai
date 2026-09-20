package com.edu.teacherai.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "fee_payments", indexes = {
        @Index(name = "idx_fee_payment_school", columnList = "schoolId,status"),
        @Index(name = "idx_fee_payment_order", columnList = "orderId", unique = true)
})
public class FeePayment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false) private Long schoolId;
    @Column(nullable = false) private Long invoiceRecordId;
    @Column(nullable = false, unique = true) private String orderId;
    private String paymentId;
    @Column(nullable = false) private long amountPaise;
    @Column(nullable = false) private String status = "CREATED";
    private String failureReason;
    @Column(nullable = false, updatable = false) private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime paidAt;

    public Long getId() { return id; }
    public Long getSchoolId() { return schoolId; } public void setSchoolId(Long v) { schoolId = v; }
    public Long getInvoiceRecordId() { return invoiceRecordId; } public void setInvoiceRecordId(Long v) { invoiceRecordId = v; }
    public String getOrderId() { return orderId; } public void setOrderId(String v) { orderId = v; }
    public String getPaymentId() { return paymentId; } public void setPaymentId(String v) { paymentId = v; }
    public long getAmountPaise() { return amountPaise; } public void setAmountPaise(long v) { amountPaise = v; }
    public String getStatus() { return status; } public void setStatus(String v) { status = v; }
    public String getFailureReason() { return failureReason; } public void setFailureReason(String v) { failureReason = v; }
    public LocalDateTime getCreatedAt() { return createdAt; } public LocalDateTime getPaidAt() { return paidAt; } public void setPaidAt(LocalDateTime v) { paidAt = v; }
}
