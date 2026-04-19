package com.edu.teacherai.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@Entity
@Table(name = "parent_contacts",
       uniqueConstraints = @UniqueConstraint(columnNames = {"userId", "studentId"}))
public class ParentContact {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long userId;
    private Long studentId;
    private String parentName;
    private String phone;
    private String email;
}
