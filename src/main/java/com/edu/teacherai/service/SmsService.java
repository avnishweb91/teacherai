package com.edu.teacherai.service;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

@Service
public class SmsService {

    @Value("${springedge.api.key}")
    private String apiKey;

    @Value("${springedge.sender.id}")
    private String senderId;

    private static final String SPRINGEDGE_URL = "http://api.springedge.com/api/transactional/sms/send/";

    private final RestTemplate restTemplate = new RestTemplate();

    @PostConstruct
    public void init() {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException(
                "SpringEdge config missing. Set SPRINGEDGE_API_KEY env var.");
        }
        if (senderId == null || senderId.isBlank()) {
            throw new IllegalStateException(
                "SpringEdge config missing. Set SPRINGEDGE_SENDER_ID env var.");
        }
    }

    public void sendOtp(String toMobile, String otp) {
        // SpringEdge expects 10-digit number only (no country code)
        String mobile = toMobile.startsWith("+91") ? toMobile.substring(3) : toMobile;

        String message = "Your TeacherAI OTP is " + otp + ". Valid for 5 minutes. Do not share it with anyone.";

        String url = UriComponentsBuilder.fromHttpUrl(SPRINGEDGE_URL)
                .queryParam("apikey", apiKey)
                .queryParam("sender", senderId)
                .queryParam("to", mobile)
                .queryParam("message", message)
                .toUriString();

        ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);

        if (!response.getStatusCode().is2xxSuccessful()) {
            throw new RuntimeException("Failed to send OTP via SpringEdge. Status: " + response.getStatusCode());
        }
    }
}
