package com.vocal.config;

import com.vocal.models.EnglishLevel;
import com.vocal.models.EnglishLevelRepository;
import com.vocal.models.User;
import com.vocal.models.UserRepository;
import java.util.List;
import java.util.Locale;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class AdminBootstrap {
    @Bean
    CommandLineRunner seedAdministration(
            UserRepository users,
            EnglishLevelRepository levels,
            PasswordEncoder passwords,
            @Value("${vocal.admin.email:}") String adminEmail,
            @Value("${vocal.admin.password:}") String adminPassword,
            @Value("${vocal.admin.name:Administrador V.O.C.A.L.}") String adminName) {
        return args -> {
            if (levels.count() == 0) {
                levels.saveAll(List.of(
                        new EnglishLevel("A1", "Principiante", "Comprende expresiones cotidianas y frases sencillas."),
                        new EnglishLevel("A2", "Básico", "Se comunica en situaciones frecuentes y previsibles."),
                        new EnglishLevel("B1", "Intermedio", "Comprende ideas principales y conversa sobre temas conocidos."),
                        new EnglishLevel("B2", "Intermedio alto", "Interactúa con fluidez sobre temas generales y técnicos."),
                        new EnglishLevel("C1", "Avanzado", "Usa el idioma con flexibilidad en contextos académicos y profesionales."),
                        new EnglishLevel("C2", "Maestría", "Comprende y expresa matices con dominio avanzado.")));
            }
            if (adminEmail == null || adminEmail.isBlank() || adminPassword == null || adminPassword.length() < 8) return;
            String email = adminEmail.trim().toLowerCase(Locale.ROOT);
            User admin = users.findById(email).orElseGet(() -> new User(email, adminName, null, null, "C1", passwords.encode(adminPassword)));
            admin.setRole("ADMIN");
            users.save(admin);
        };
    }
}
