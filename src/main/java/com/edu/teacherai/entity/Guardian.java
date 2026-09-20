package com.edu.teacherai.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "guardians")
public class Guardian {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false) private Long schoolId;
    @Column(nullable = false) private String fullName;
    private String phone;
    private String email;
    private String address;
    private boolean notificationOptIn = true;

    public Long getId() { return id; }
    public Long getSchoolId() { return schoolId; } public void setSchoolId(Long v) { schoolId = v; }
    public String getFullName() { return fullName; } public void setFullName(String v) { fullName = v; }
    public String getPhone() { return phone; } public void setPhone(String v) { phone = v; }
    public String getEmail() { return email; } public void setEmail(String v) { email = v; }
    public String getAddress() { return address; } public void setAddress(String v) { address = v; }
    public boolean isNotificationOptIn() { return notificationOptIn; } public void setNotificationOptIn(boolean v) { notificationOptIn = v; }
}
