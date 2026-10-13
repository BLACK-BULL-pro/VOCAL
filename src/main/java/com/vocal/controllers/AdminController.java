package com.vocal.controllers;

import com.vocal.models.EnglishLevel;
import com.vocal.models.EnglishLevelRepository;
import com.vocal.models.Gamification;
import com.vocal.models.GamificationRepository;
import com.vocal.models.PartnerRatingRepository;
import com.vocal.models.PracticeSessionRepository;
import com.vocal.models.User;
import com.vocal.models.UserRepository;
import java.util.List;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
    private final UserRepository users;
    private final PracticeSessionRepository sessions;
    private final PartnerRatingRepository ratings;
    private final EnglishLevelRepository levels;
    private final GamificationRepository gamifications;

    public AdminController(UserRepository users, PracticeSessionRepository sessions, PartnerRatingRepository ratings,
                           EnglishLevelRepository levels, GamificationRepository gamifications) {
        this.users = users; this.sessions = sessions; this.ratings = ratings; this.levels = levels; this.gamifications = gamifications;
    }

    @GetMapping("/users")
    public List<AdminUserView> users() {
        return users.findAll().stream().map(user -> new AdminUserView(
                user.getEmail(), user.getName(), user.getUsername(), user.getLevel(), user.getRole(),
                sessions.findAllByUserEmailOrderByStartedAtDesc(user.getEmail()).size(),
                ratings.findAllByRecipientEmailOrderByCreatedAtDesc(user.getEmail()).size())).toList();
    }

    @PutMapping("/users/{email}/level")
    @Transactional
    public AdminUserView updateUserLevel(@PathVariable String email, @RequestBody LevelRequest request) {
        String code = request == null || request.code() == null ? "" : request.code().trim().toUpperCase(Locale.ROOT);
        if (!levels.existsById(code)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El nivel no existe.");
        User user = users.findByEmailIgnoreCase(email).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado."));
        user.setLevel(code); users.save(user);
        return users().stream().filter(item -> item.email().equalsIgnoreCase(user.getEmail())).findFirst().orElseThrow();
    }

    @GetMapping("/levels")
    public List<EnglishLevel> levels() { return levels.findAllByOrderByCodeAsc(); }

    @PostMapping("/levels")
    public EnglishLevel createLevel(@RequestBody LevelRequest request) {
        String code = request == null || request.code() == null ? "" : request.code().trim().toUpperCase(Locale.ROOT);
        String label = request == null || request.label() == null ? "" : request.label().trim();
        if (!code.matches("[A-Z0-9]{1,10}") || label.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Código y nombre del nivel son obligatorios.");
        if (levels.existsById(code)) throw new ResponseStatusException(HttpStatus.CONFLICT, "Ese nivel ya existe.");
        return levels.save(new EnglishLevel(code, label, request.description()));
    }

    @PutMapping("/levels/{code}")
    public EnglishLevel updateLevel(@PathVariable String code, @RequestBody LevelRequest request) {
        EnglishLevel level = levels.findById(code.toUpperCase(Locale.ROOT)).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Nivel no encontrado."));
        if (request.label() != null && !request.label().isBlank()) level.setLabel(request.label().trim());
        level.setDescription(request.description()); level.setActive(request.active() == null || request.active());
        return levels.save(level);
    }

    @DeleteMapping("/levels/{code}")
    public void deleteLevel(@PathVariable String code) {
        String normalized = code.toUpperCase(Locale.ROOT);
        if (!levels.existsById(normalized)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Nivel no encontrado.");
        levels.deleteById(normalized);
    }

    @GetMapping("/gamifications")
    public List<Gamification> gamifications() { return gamifications.findAll(); }

    @PostMapping("/gamifications")
    public Gamification createGamification(@RequestBody GamificationRequest request) {
        validateGamification(request);
        return gamifications.save(new Gamification(request.name().trim(), request.description().trim(), request.points(), request.rule().trim()));
    }

    @PutMapping("/gamifications/{id}")
    public Gamification updateGamification(@PathVariable Long id, @RequestBody GamificationRequest request) {
        validateGamification(request);
        Gamification item = gamifications.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Gamificación no encontrada."));
        item.setName(request.name().trim()); item.setDescription(request.description().trim()); item.setPoints(request.points()); item.setRule(request.rule().trim());
        if (request.active() != null) item.setActive(request.active());
        return gamifications.save(item);
    }

    @DeleteMapping("/gamifications/{id}")
    public void deleteGamification(@PathVariable Long id) { if (!gamifications.existsById(id)) throw new ResponseStatusException(HttpStatus.NOT_FOUND); gamifications.deleteById(id); }

    private void validateGamification(GamificationRequest request) {
        if (request == null || request.name() == null || request.name().isBlank() || request.description() == null || request.description().isBlank() || request.rule() == null || request.rule().isBlank() || request.points() < 0)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Completa nombre, descripción, regla y puntos válidos.");
    }

    public record AdminUserView(String email, String name, String username, String level, String role, int sessions, int receivedRatings) { }
    public record LevelRequest(String code, String label, String description, Boolean active) { }
    public record GamificationRequest(String name, String description, int points, String rule, Boolean active) { }
}
