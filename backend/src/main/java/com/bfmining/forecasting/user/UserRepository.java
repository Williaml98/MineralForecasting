package com.bfmining.forecasting.user;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

/**
 * Spring Data JPA repository for {@link User} entities.
 */
@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    /** Finds a user by their email address (used for authentication). */
    Optional<User> findByEmail(String email);

    /** Checks whether a user with the given email already exists. */
    boolean existsByEmail(String email);
}
