package com.bfmining.forecasting.forecast;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.GenericGenerator;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * JPA entity representing a generated mineral price forecast.
 * Stores the forecast horizon, predicted values, and confidence intervals
 * produced by a trained model.
 */
@Entity
@Table(name = "forecasts")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Forecast {

    /** Unique identifier for the forecast, auto-generated as UUID. */
    @Id
    @GeneratedValue(generator = "UUID")
    @GenericGenerator(name = "UUID", strategy = "org.hibernate.id.UUIDGenerator")
    @Column(updatable = false, nullable = false)
    private UUID id;

    /** UUID of the trained model used to generate this forecast. */
    @Column(name = "model_id", nullable = false)
    private UUID modelId;

    /** Number of months ahead the forecast covers. */
    @Column(name = "horizon_months", nullable = false)
    private int horizonMonths;

    /** JSON array of forecasted values, stored as JSONB. */
    @Column(name = "forecast_json", columnDefinition = "jsonb")
    private String forecastJson;

    /** JSON array of confidence interval bounds, stored as JSONB. */
    @Column(name = "confidence_intervals_json", columnDefinition = "jsonb")
    private String confidenceIntervalsJson;

    /** UUID of the user who generated the forecast. */
    @Column(name = "created_by")
    private UUID createdBy;

    /** Timestamp when the forecast was generated. */
    @Builder.Default
    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();
}
