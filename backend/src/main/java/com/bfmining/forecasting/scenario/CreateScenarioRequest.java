package com.bfmining.forecasting.scenario;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

/**
 * Request body for creating a new forecast scenario.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateScenarioRequest {

    /** Non-blank human-readable name for the scenario. */
    @NotBlank
    private String name;

    /** UUID of the base forecast to derive this scenario from. */
    private UUID baseForecastId;

    /** JSON string of parameter overrides to apply in the scenario. */
    private String parametersJson;

    /** Optional notes or commentary about the scenario. */
    private String notes;
}
