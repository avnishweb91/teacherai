package com.edu.teacherai.dto;

import com.edu.teacherai.entity.User;

public class AuthResponse {

    private String token;   // null for new user
    private User user;      // null for new user
    private String status;  // LOGIN | REGISTER_REQUIRED

    public AuthResponse(String token, User user, String status) {
        this.token = token;
        this.user = user;
        this.status = status;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
