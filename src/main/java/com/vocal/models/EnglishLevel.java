package com.vocal.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "vocal_english_levels")
public class EnglishLevel {
    @Id
    @Column(length = 10)
    private String code;
    @Column(nullable = false, length = 80)
    private String label;
    @Column(length = 240)
    private String description;
    @Column(nullable = false)
    private boolean active = true;

    protected EnglishLevel() { }
    public EnglishLevel(String code, String label, String description) {
        this.code = code.toUpperCase(java.util.Locale.ROOT);
        this.label = label;
        this.description = description;
    }
    public String getCode() { return code; }
    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
}
