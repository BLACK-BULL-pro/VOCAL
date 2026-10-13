package com.vocal.models;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EnglishLevelRepository extends JpaRepository<EnglishLevel, String> {
    List<EnglishLevel> findAllByOrderByCodeAsc();
}
