package com.edu.teacherai.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class SmsService {

    private static final Logger log = LoggerFactory.getLogger(SmsService.class);

    public void sendOtp(String toMobile, String otp) {
        log.info("==== OTP FOR {} : {} ====", toMobile, otp);
    }
}
