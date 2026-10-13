package com.vocal.controllers;

import com.vocal.models.PracticeSession;
import com.vocal.models.PracticeSessionRepository;
import java.security.Principal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/user/sessions")
public class PracticeSessionController {
    private final PracticeSessionRepository sessions;
    public PracticeSessionController(PracticeSessionRepository sessions) { this.sessions = sessions; }

    @GetMapping
    @Transactional(readOnly = true)
    public List<PracticeSession> list(Principal principal) {
        return sessions.findAllByUserEmailOrderByStartedAtDesc(email(principal));
    }

    @PostMapping
    @Transactional
    public PracticeSession create(@RequestBody SessionRequest request, Principal principal) {
        try {
            if (request == null || request.sessionId() == null || request.sessionId().length() > 36) throw new IllegalArgumentException("Invalid session ID.");
            UUID.fromString(request.sessionId());
            if (request.topic() == null || !request.topic().matches("[a-zA-Z0-9._-]{1,100}")) throw new IllegalArgumentException("Invalid practice topic.");
            if (request.minutes() < 1 || request.minutes() > 1440) throw new IllegalArgumentException("Invalid session duration.");
            Instant startedAt = request.date() == null ? Instant.now() : Instant.parse(request.date());
            String userEmail = email(principal);
            var existing = sessions.findBySessionKey(request.sessionId());
            if (existing.isPresent()) {
                if (!existing.get().getUserEmailForOwnership().equals(userEmail)) throw new IllegalArgumentException("Session does not belong to this account.");
                return existing.get();
            }
            return sessions.save(new PracticeSession(request.sessionId(), userEmail, startedAt, request.minutes(), request.topic()));
        } catch (java.time.DateTimeException | IllegalArgumentException error) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, error.getMessage());
        }
    }

    private String email(Principal principal) {
        if (principal == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        return principal.getName().toLowerCase(java.util.Locale.ROOT);
    }
    public record SessionRequest(String sessionId, String date, int minutes, String topic) { }
}
