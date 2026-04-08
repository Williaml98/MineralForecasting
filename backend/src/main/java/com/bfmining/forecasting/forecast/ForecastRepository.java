package com.bfmining.forecasting.forecast;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/**
 * Spring Data JPA repository for {@link Forecast} entities.
 * Provides standard CRUD operations plus custom ordered query methods.
 */
@Repository
public interface ForecastRepository extends JpaRepository<Forecast, UUID> {

    /**
     * Returns all forecasts created by the specified user, ordered by creation
     * timestamp descending.
     *
     * @param userId the UUID of the user whose forecasts to retrieve
     * @return list of forecasts, newest first
     */
    List<Forecast> findByCreatedByOrderByCreatedAtDesc(UUID userId);

    /**
     * Returns all forecasts ordered by creation timestamp descending.
     *
     * @return list of all forecasts, newest first
     */
    List<Forecast> findAllByOrderByCreatedAtDesc();
}
