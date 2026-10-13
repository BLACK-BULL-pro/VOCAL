package com.vocal.controllers;

import com.vocal.models.User;
import com.vocal.models.UserRepository;
import java.util.Locale;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private static final Set<String> LEVELS = Set.of("A1", "A2", "B1", "B2", "C1", "C2");
    private final UserRepository users;
    private final PasswordEncoder passwords;
    private final AuthenticationManager authenticationManager;
    private final SecurityContextRepository contexts;

    public AuthController(UserRepository users, PasswordEncoder passwords, AuthenticationManager authenticationManager,
                          SecurityContextRepository contexts) {
        this.users = users;
        this.passwords = passwords;
        this.authenticationManager = authenticationManager;
        this.contexts = contexts;
    }

    @PostMapping("/register")
    @Transactional
    public User register(@RequestBody RegisterRequest request, HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
        String name = request.name() == null ? "" : request.name().trim();
        String email = normalizeEmail(request.email());
        String password = request.password() == null ? "" : request.password();
        String level = request.level() == null ? "B1" : request.level().toUpperCase(Locale.ROOT);
        if (name.length() < 2 || name.length() > 100) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Enter your full name.");
        if (!email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Enter a valid email.");
        if (password.length() < 8 || password.length() > 72) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password must contain at least 8 characters.");
        if (!LEVELS.contains(level)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a valid English level.");
        User user = users.findById(email).orElse(null);
        if (user != null && user.getPasswordHash() != null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "An account with this email already exists.");
        }
        if (user == null) user = new User(email, name, null, null, level, passwords.encode(password));
        else {
            user.setName(name);
            user.setLevel(level);
            user.setPasswordHash(passwords.encode(password));
        }
        user = users.save(user);
        authenticate(email, password, httpRequest, httpResponse);
        return user;
    }

    @PostMapping("/login")
    public User login(@RequestBody LoginRequest request, HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
        String email = normalizeEmail(request.email());
        try {
            authenticate(email, request.password(), httpRequest, httpResponse);
        } catch (BadCredentialsException exception) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Email or password is incorrect.");
        }
        return users.findById(email).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    }

    private void authenticate(String email, String password, HttpServletRequest request, HttpServletResponse response) {
        Authentication authentication = authenticationManager.authenticate(
                UsernamePasswordAuthenticationToken.unauthenticated(email, password == null ? "" : password));
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        contexts.saveContext(context, request, response);
    }

    private String normalizeEmail(String email) { return email == null ? "" : email.trim().toLowerCase(Locale.ROOT); }
    public record RegisterRequest(String name, String email, String password, String level) { }
    public record LoginRequest(String email, String password) { }
}
