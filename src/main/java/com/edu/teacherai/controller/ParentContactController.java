package com.edu.teacherai.controller;

import com.edu.teacherai.entity.ParentContact;
import com.edu.teacherai.entity.User;
import com.edu.teacherai.repository.ParentContactRepository;
import com.edu.teacherai.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/parent-contacts")
public class ParentContactController {

    private final ParentContactRepository contactRepo;
    private final UserRepository userRepo;

    public ParentContactController(ParentContactRepository contactRepo, UserRepository userRepo) {
        this.contactRepo = contactRepo;
        this.userRepo = userRepo;
    }

    private Long userId(Authentication auth) {
        return userRepo.findByMobile(auth.getName())
                .map(User::getId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    }

    @GetMapping
    public List<ParentContact> getAll(Authentication auth) {
        return contactRepo.findByUserId(userId(auth));
    }

    @PutMapping("/{studentId}")
    public ParentContact upsert(@PathVariable Long studentId,
                                @RequestBody ParentContact body,
                                Authentication auth) {
        Long uid = userId(auth);
        ParentContact contact = contactRepo.findByUserIdAndStudentId(uid, studentId)
                .orElse(new ParentContact());
        contact.setUserId(uid);
        contact.setStudentId(studentId);
        contact.setParentName(body.getParentName());
        contact.setPhone(body.getPhone());
        contact.setEmail(body.getEmail());
        return contactRepo.save(contact);
    }

    @DeleteMapping("/{studentId}")
    public ResponseEntity<Void> delete(@PathVariable Long studentId, Authentication auth) {
        Long uid = userId(auth);
        contactRepo.deleteByUserIdAndStudentId(uid, studentId);
        return ResponseEntity.noContent().build();
    }
}
