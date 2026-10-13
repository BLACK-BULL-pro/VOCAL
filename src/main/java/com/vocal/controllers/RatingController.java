package com.vocal.controllers;

import com.vocal.models.PartnerRating;
import com.vocal.models.User;
import com.vocal.models.UserRepository;
import com.vocal.services.MatchmakingService;
import java.security.Principal;
import java.util.List;
import java.time.Instant;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/user/ratings")
public class RatingController {
    private final MatchmakingService matchmaking;
    private final UserRepository users;
    public RatingController(MatchmakingService matchmaking, UserRepository users) { this.matchmaking = matchmaking; this.users = users; }

    @GetMapping("/received")
    public List<RatingView> received(Principal principal) {
        return matchmaking.receivedRatings(principal.getName().toLowerCase(java.util.Locale.ROOT)).stream()
                .map(rating -> new RatingView(rating.getScore(), rating.getCreatedAt(), personName(rating.getRaterEmail()))).toList();
    }

    @GetMapping("/given")
    public List<RatingView> given(Principal principal) {
        return matchmaking.givenRatings(principal.getName().toLowerCase(java.util.Locale.ROOT)).stream()
                .map(rating -> new RatingView(rating.getScore(), rating.getCreatedAt(), personName(rating.getRecipientEmail()))).toList();
    }

    @PostMapping
    public void rate(@RequestBody RatingRequest request, Principal principal) {
        try {
            if (request == null || request.roomId() == null || request.roomId().length() > 36) throw new IllegalArgumentException("Invalid session.");
            matchmaking.ratePartner(principal.getName().toLowerCase(java.util.Locale.ROOT), request.roomId(), request.score());
        } catch (IllegalArgumentException error) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, error.getMessage());
        }
    }
    public record RatingRequest(String roomId, int score) { }
    private String personName(String email) {
        return users.findByEmailIgnoreCase(email).map(User::getName).orElse(email);
    }
    public record RatingView(int score, Instant createdAt, String personName) { }
}
