package com.bfmining.forecasting.scenario;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Data Transfer Object representing a forecast scenario, used in API responses.
 * Mirrors all fields of the {@link Scenario} entity.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScenarioDto {

    /** Unique identifier of the scenario. */
    private UUID id;

    /** Human-readable name of the scenario. */
    private String name;

    /** UUID of the base forecast the scenario is derived from. */
    private UUID baseForecastId;

    /** JSON string of parameter overrides for this scenario. */
    private String parametersJson;

    /** JSON string of simulation results. */
    private String resultJson;

    /** Optional notes or commentary on the scenario. */
    private String notes;

    /** Whether the scenario has been flagged for review. */
    private boolean flaggedForReview;

    /** UUID of the user who created the scenario. */
    private UUID createdBy;

    /** Timestamp when the scenario was created. */
    private LocalDateTime createdAt;
}
