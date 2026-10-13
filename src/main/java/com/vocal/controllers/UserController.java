package com.vocal.controllers;

import com.vocal.models.User;
import com.vocal.models.UserRepository;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/user")
public class UserController {
    private static final Set<String> LEVELS = Set.of("A1", "A2", "B1", "B2", "C1", "C2");
    private final UserRepository users;
    private final PasswordEncoder passwords;

    public UserController(UserRepository users, PasswordEncoder passwords) { this.users = users; this.passwords = passwords; }

    @GetMapping("/me")
    @Transactional(readOnly = true)
    public User me(@AuthenticationPrincipal UserDetails principal) {
        return users.findById(emailOf(principal)).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    @PutMapping("/me")
    @Transactional
    public User update(@AuthenticationPrincipal UserDetails principal, @RequestBody ProfileUpdate update) {
        User user = users.findById(emailOf(principal)).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (update.name() != null && !update.name().isBlank()) user.setName(update.name().trim());
        if (update.username() != null) {
            String username = update.username().trim();
            if (!username.isEmpty() && !username.matches("[a-zA-Z0-9._-]{3,24}")) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid username");
            }
            if (!username.isEmpty() && users.existsByUsernameIgnoreCaseAndEmailNot(username, user.getEmail())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Username already in use");
            }
            user.setUsername(username.isEmpty() ? null : username);
        }
        if (update.level() != null) {
            if (!LEVELS.contains(update.level())) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid level");
            user.setLevel(update.level());
        }
        if (update.photo() != null) {
            if (update.photo().length() > 1_500_000) throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Photo is too large");
            user.setPhoto(update.photo().isBlank() ? null : update.photo());
        }
        return users.save(user);
    }

    @PutMapping("/password")
    @Transactional
    public void changePassword(@AuthenticationPrincipal UserDetails principal, @RequestBody PasswordUpdate update) {
        User user = users.findById(emailOf(principal)).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        String current = update.currentPassword() == null ? "" : update.currentPassword();
        String next = update.newPassword() == null ? "" : update.newPassword();
        if (user.getPasswordHash() == null || !passwords.matches(current, user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current password is incorrect.");
        }
        if (next.length() < 8 || next.length() > 72) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "New password must contain at least 8 characters.");
        }
        user.setPasswordHash(passwords.encode(next));
    }

    private String emailOf(UserDetails principal) {
        if (principal == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        return principal.getUsername().toLowerCase(java.util.Locale.ROOT);
    }

    public record ProfileUpdate(String name, String username, String photo, String level) { }
    public record PasswordUpdate(String currentPassword, String newPassword) { }
}
