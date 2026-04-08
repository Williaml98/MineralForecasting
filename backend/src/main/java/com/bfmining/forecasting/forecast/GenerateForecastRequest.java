package com.bfmining.forecasting.forecast;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

/**
 * Request body for generating a new forecast.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GenerateForecastRequest {

    /** UUID of the active trained model to use for generating the forecast. */
    private UUID modelId;

    /**
     * Number of months ahead to forecast.
     * Must be between 1 and 24 inclusive.
     */
    @Min(1)
    @Max(24)
    private int horizonMonths;
}
