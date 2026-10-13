package com.vocal.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Table(name = "vocal_users")
public class User {
    @Id
    @Column(nullable = false, updatable = false)
    private String email;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 32, unique = true)
    private String username;

    @Lob
    private String photo;

    @Column(nullable = false, length = 10)
    private String level = "B1";

    @Column(length = 20)
    private String role = "USER";

    @JsonIgnore
    @Column(length = 100)
    private String passwordHash;

    protected User() { }

    public User(String email, String name, String username, String photo, String level, String passwordHash) {
        this.email = email;
        this.name = name;
        this.username = username;
        this.photo = photo;
        this.level = level;
        this.passwordHash = passwordHash;
    }

    public String getEmail() { return email; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getPhoto() { return photo; }
    public void setPhoto(String photo) { this.photo = photo; }
    public String getLevel() { return level; }
    public void setLevel(String level) { this.level = level; }
    public String getRole() { return role == null ? "USER" : role; }
    public void setRole(String role) { this.role = role == null ? "USER" : role.toUpperCase(java.util.Locale.ROOT); }
    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
}
