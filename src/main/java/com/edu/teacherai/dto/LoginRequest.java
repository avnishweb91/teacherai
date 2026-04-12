package com.edu.teacherai.dto;

public class LoginRequest {

    private String email;
    private String password;
    private String mobile;   // optional (for OTP-based login)

    public LoginRequest() {
    }

    /* =========================
       GETTERS & SETTERS
       ========================= */

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getMobile() {
        return mobile;
    }

    public void setMobile(String mobile) {
        this.mobile = mobile;
    }
}
