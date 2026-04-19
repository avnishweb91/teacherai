package com.edu.teacherai.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "schools")
public class School {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String address;
    private String phone;

    @Column(nullable = false, unique = true)
    private String adminEmail;

    @Column(nullable = false, unique = true)
    private String inviteCode;

    @Column(nullable = false)
    private String planType = "SCHOOL";

    @Column(nullable = false)
    private String subscriptionStatus = "TRIAL"; // TRIAL / ACTIVE / EXPIRED

    private LocalDateTime trialEndsAt;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public School() {
        this.createdAt = LocalDateTime.now();
        this.inviteCode = UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
        this.trialEndsAt = LocalDateTime.now().plusDays(7);
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getAdminEmail() { return adminEmail; }
    public void setAdminEmail(String adminEmail) { this.adminEmail = adminEmail; }
    public String getInviteCode() { return inviteCode; }
    public void setInviteCode(String inviteCode) { this.inviteCode = inviteCode; }
    public String getPlanType() { return planType; }
    public void setPlanType(String planType) { this.planType = planType; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public String getSubscriptionStatus() { return subscriptionStatus; }
    public void setSubscriptionStatus(String subscriptionStatus) { this.subscriptionStatus = subscriptionStatus; }
    public LocalDateTime getTrialEndsAt() { return trialEndsAt; }
    public void setTrialEndsAt(LocalDateTime trialEndsAt) { this.trialEndsAt = trialEndsAt; }
}
