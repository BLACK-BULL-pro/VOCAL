package com.vocal.controllers;

import com.vocal.models.EnglishLevel;
import com.vocal.models.EnglishLevelRepository;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/levels")
public class LevelController {
    private final EnglishLevelRepository levels;
    public LevelController(EnglishLevelRepository levels) { this.levels = levels; }
    @GetMapping
    public List<EnglishLevel> activeLevels() { return levels.findAllByOrderByCodeAsc().stream().filter(EnglishLevel::isActive).toList(); }
}
