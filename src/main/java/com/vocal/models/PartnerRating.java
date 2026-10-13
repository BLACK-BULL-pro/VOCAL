package com.vocal.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;

@Entity
@Table(name = "vocal_partner_ratings", uniqueConstraints = @UniqueConstraint(columnNames = {"room_id", "rater_email"}))
public class PartnerRating {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "room_id", nullable = false, length = 36)
    private String roomId;
    @Column(name = "rater_email", nullable = false)
    private String raterEmail;
    @Column(name = "recipient_email", nullable = false)
    private String recipientEmail;
    @Column(nullable = false)
    private int score;
    @Column(nullable = false)
    private Instant createdAt;

    protected PartnerRating() { }
    public PartnerRating(String roomId, String raterEmail, String recipientEmail, int score) {
        this.roomId = roomId;
        this.raterEmail = raterEmail;
        this.recipientEmail = recipientEmail;
        this.score = score;
        this.createdAt = Instant.now();
    }
    public Long getId() { return id; }
    public String getRoomId() { return roomId; }
    public String getRaterEmail() { return raterEmail; }
    public String getRecipientEmail() { return recipientEmail; }
    public int getScore() { return score; }
    public Instant getCreatedAt() { return createdAt; }
}
