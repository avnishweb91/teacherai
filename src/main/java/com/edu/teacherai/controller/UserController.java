package com.edu.teacherai.controller;

import com.edu.teacherai.entity.User;
import com.edu.teacherai.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@SuppressWarnings("unused")
@RestController
@RequestMapping("/api/user")
public class UserController {

    private final UserRepository userRepository;

    public UserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping("/me")
    public User getCurrentUser(Authentication auth) {

        if (auth == null || auth.getPrincipal() == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "User not authenticated"
            );
        }

        // principal is MOBILE (String) — set by JwtFilter
        String mobile = (String) auth.getPrincipal();

        return userRepository.findByMobile(mobile)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "User not found"
                ));
    }

    @PutMapping("/me")
    public User updateProfile(
            Authentication auth,
            @RequestBody User updated
    ) {
        if (auth == null || auth.getPrincipal() == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "User not authenticated"
            );
        }

        String mobile = (String) auth.getPrincipal();

        User user = userRepository.findByMobile(mobile)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "User not found"
                ));

        user.setName(updated.getName());
        user.setEmail(updated.getEmail());
        user.setBoardPreference(updated.getBoardPreference());

        return userRepository.save(user);
    }
}
