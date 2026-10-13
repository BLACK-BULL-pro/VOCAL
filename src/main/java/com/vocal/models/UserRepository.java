package com.vocal.models;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, String> {
    boolean existsByUsernameIgnoreCaseAndEmailNot(String username, String email);
    Optional<User> findByEmailIgnoreCase(String email);
}
