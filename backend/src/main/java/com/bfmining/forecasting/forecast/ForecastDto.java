package com.bfmining.forecasting.forecast;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Data Transfer Object representing a generated forecast, used in API responses.
 * Mirrors all fields of the {@link Forecast} entity.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ForecastDto {

    /** Unique identifier of the forecast. */
    private UUID id;

    /** UUID of the trained model used to produce this forecast. */
    private UUID modelId;

    /** Number of months covered by this forecast. */
    private int horizonMonths;

    /** JSON array string of forecasted values. */
    private String forecastJson;

    /** JSON array string of confidence interval bounds. */
    private String confidenceIntervalsJson;

    /** UUID of the user who generated the forecast. */
    private UUID createdBy;

    /** Timestamp when the forecast was generated. */
    private LocalDateTime createdAt;
}
