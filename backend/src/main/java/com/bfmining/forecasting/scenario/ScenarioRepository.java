package com.bfmining.forecasting.scenario;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/**
 * Spring Data JPA repository for {@link Scenario} entities.
 * Provides standard CRUD operations plus custom ordered query methods.
 */
@Repository
public interface ScenarioRepository extends JpaRepository<Scenario, UUID> {

    /**
     * Returns all scenarios ordered by creation timestamp descending.
     *
     * @return list of all scenarios, newest first
     */
    List<Scenario> findAllByOrderByCreatedAtDesc();

    /**
     * Returns the five most recently created scenarios.
     *
     * @return list of up to five scenarios, newest first
     */
    List<Scenario> findTop5ByOrderByCreatedAtDesc();
}
