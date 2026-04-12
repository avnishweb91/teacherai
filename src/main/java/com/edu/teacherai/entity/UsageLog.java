package com.edu.teacherai.entity;

import jakarta.persistence.*;
import java.time.LocalDate;

@SuppressWarnings("unused")
@Entity
public class UsageLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long userId;

    private String feature; // LESSON / ASSESSMENT

    private LocalDate usageDate;

    public UsageLog() {}

    public UsageLog(Long userId, String feature, LocalDate usageDate) {
        this.userId = userId;
        this.feature = feature;
        this.usageDate = usageDate;
    }
}
