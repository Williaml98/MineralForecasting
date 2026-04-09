package com.bfmining.forecasting.model;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Spring Data JPA repository for {@link TrainedModel} entities.
 * Provides standard CRUD operations plus custom query methods for
 * retrieving active models.
 */
@Repository
public interface TrainedModelRepository extends JpaRepository<TrainedModel, UUID> {

    /**
     * Returns all active models ordered by training timestamp descending.
     *
     * @return list of active trained models, newest first
     */
    List<TrainedModel> findByIsActiveTrueOrderByTrainedAtDesc();

    /**
     * Returns the single most recently set active model, if any exists.
     *
     * @return an Optional containing the active model, or empty if none is active
     */
    Optional<TrainedModel> findFirstByIsActiveTrue();

    /**
     * Checks whether a model with the given name already exists.
     *
     * @param name the model name to check
     * @return true if a model with that name exists
     */
    boolean existsByName(String name);
}
