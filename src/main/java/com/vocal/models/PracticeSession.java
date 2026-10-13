package com.vocal.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.time.Instant;

@Entity
@Table(name = "vocal_practice_sessions", uniqueConstraints = @UniqueConstraint(columnNames = "session_key"))
public class PracticeSession {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "session_key", nullable = false, length = 36)
    private String sessionKey;
    @Column(name = "user_email", nullable = false)
    private String userEmail;
    @Column(name = "started_at", nullable = false)
    private Instant startedAt;
    @Column(name = "duration_minutes", nullable = false)
    private int durationMinutes;
    @Column(name = "topic_id", nullable = false, length = 100)
    private String topicId;

    protected PracticeSession() { }
    public PracticeSession(String sessionKey, String userEmail, Instant startedAt, int durationMinutes, String topicId) {
        this.sessionKey = sessionKey;
        this.userEmail = userEmail;
        this.startedAt = startedAt;
        this.durationMinutes = durationMinutes;
        this.topicId = topicId;
    }
    public String getSessionKey() { return sessionKey; }
    @JsonIgnore public String getUserEmailForOwnership() { return userEmail; }
    public String getStartedAt() { return startedAt.toString(); }
    public int getDurationMinutes() { return durationMinutes; }
    public String getTopicId() { return topicId; }
}
