package com.vocal.models;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PartnerRatingRepository extends JpaRepository<PartnerRating, Long> {
    List<PartnerRating> findAllByRecipientEmailOrderByCreatedAtDesc(String recipientEmail);
    List<PartnerRating> findAllByRaterEmailOrderByCreatedAtDesc(String raterEmail);
}
