package com.vocal.models;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PracticeSessionRepository extends JpaRepository<PracticeSession, Long> {
    List<PracticeSession> findAllByUserEmailOrderByStartedAtDesc(String userEmail);
    Optional<PracticeSession> findBySessionKey(String sessionKey);
}
