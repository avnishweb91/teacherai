package com.edu.teacherai.service;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

@Service
public class SmsService {

    @Value("${fast2sms.api.key}")
    private String apiKey;

    private static final String FAST2SMS_URL = "https://www.fast2sms.com/dev/bulkV2";

    private final RestTemplate restTemplate = new RestTemplate();

    @PostConstruct
    public void init() {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException(
                "Fast2SMS config missing. Set FAST2SMS_API_KEY env var.");
        }
    }

    public void sendOtp(String toMobile, String otp) {
        // Fast2SMS expects 10-digit number only (no country code)
        String mobile = toMobile.startsWith("+91") ? toMobile.substring(3) : toMobile;

        String url = UriComponentsBuilder.fromHttpUrl(FAST2SMS_URL)
                .queryParam("route", "otp")
                .queryParam("numbers", mobile)
                .queryParam("variables_values", otp)
                .queryParam("flash", "0")
                .toUriString();

        HttpHeaders headers = new HttpHeaders();
        headers.set("authorization", apiKey);
        headers.set("Content-Type", "application/json");

        HttpEntity<Void> request = new HttpEntity<>(headers);

        ResponseEntity<String> response = restTemplate.exchange(
                url, HttpMethod.GET, request, String.class);

        if (!response.getStatusCode().is2xxSuccessful()) {
            throw new RuntimeException("Failed to send OTP via Fast2SMS. Status: " + response.getStatusCode());
        }
    }
}
