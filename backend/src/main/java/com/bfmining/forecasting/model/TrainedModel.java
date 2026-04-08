package com.bfmining.forecasting.model;

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
 * JPA entity representing a trained forecasting model.
 * Stores algorithm metadata, training parameters, evaluation metrics,
 * and deployment status for models used in mineral price forecasting.
 */
@Entity
@Table(name = "trained_models")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TrainedModel {

    /** Unique identifier for the trained model, auto-generated as UUID. */
    @Id
    @GeneratedValue(generator = "UUID")
    @GenericGenerator(name = "UUID", strategy = "org.hibernate.id.UUIDGenerator")
    @Column(updatable = false, nullable = false)
    private UUID id;

    /** Human-readable name for the model. */
    @Column(nullable = false)
    private String name;

    /** Algorithm used to train the model (e.g. ARIMA, PROPHET, LSTM). */
    @Column(nullable = false)
    private String algorithm;

    /** UUID of the dataset used to train this model. */
    @Column(name = "dataset_id")
    private UUID datasetId;

    /** UUID of the preprocessing pipeline applied before training. */
    @Column(name = "pipeline_id")
    private UUID pipelineId;

    /** JSON string of hyperparameter values used during training, stored as JSONB. */
    @Column(name = "hyperparams_json", columnDefinition = "jsonb")
    private String hyperparamsJson;

    /** JSON string of evaluation metrics produced after training, stored as JSONB. */
    @Column(name = "metrics_json", columnDefinition = "jsonb")
    private String metricsJson;

    /** Whether this model is the currently active production model. */
    @Builder.Default
    @Column(name = "is_active", nullable = false)
    private boolean isActive = false;

    /** UUID of the user who initiated model training. */
    @Column(name = "trained_by")
    private UUID trainedBy;

    /** Timestamp when training was initiated. */
    @Column(name = "trained_at")
    private LocalDateTime trainedAt;

    /** Model version number. */
    @Builder.Default
    @Column(nullable = false)
    private int version = 1;

    /** External job identifier for tracking the training job. */
    @Column(name = "job_id")
    private String jobId;

    /** Current training status (e.g. "PENDING", "TRAINING", "COMPLETED"). */
    @Builder.Default
    @Column(nullable = false)
    private String status = "PENDING";
}
