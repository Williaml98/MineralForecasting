package com.bfmining.forecasting.scenario;

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
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * JPA entity representing a what-if scenario built on top of a base forecast.
 * Allows analysts and strategists to explore alternative mineral price outlooks
 * by adjusting forecast parameters.
 */
@Entity
@Table(name = "scenarios")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Scenario {

    /** Unique identifier for the scenario, auto-generated as UUID. */
    @Id
    @GeneratedValue(generator = "UUID")
    @GenericGenerator(name = "UUID", strategy = "org.hibernate.id.UUIDGenerator")
    @Column(updatable = false, nullable = false)
    private UUID id;

    /** Human-readable name for the scenario. */
    @Column(nullable = false)
    private String name;

    /** UUID of the base forecast this scenario is derived from. */
    @Column(name = "base_forecast_id")
    private UUID baseForecastId;

    /** JSON string of parameter overrides applied in this scenario, stored as JSONB. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "parameters_json", columnDefinition = "jsonb")
    private String parametersJson;

    /** JSON string of scenario simulation results, stored as JSONB. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "result_json", columnDefinition = "jsonb")
    private String resultJson;

    /** Optional notes or commentary added to the scenario. */
    @Column
    private String notes;

    /** Whether this scenario has been flagged for review by a strategist. */
    @Builder.Default
    @Column(name = "flagged_for_review", nullable = false)
    private boolean flaggedForReview = false;

    /** UUID of the user who created the scenario. */
    @Column(name = "created_by")
    private UUID createdBy;

    /** Timestamp when the scenario was created. */
    @Builder.Default
    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();
}
