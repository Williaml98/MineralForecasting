package com.bfmining.forecasting.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Data Transfer Object representing a trained forecasting model,
 * used in API responses.
 * Mirrors all fields of the {@link TrainedModel} entity.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ModelDto {

    /** Unique identifier of the trained model. */
    private UUID id;

    /** Human-readable name of the model. */
    private String name;

    /** Algorithm used to train the model. */
    private String algorithm;

    /** UUID of the training dataset. */
    private UUID datasetId;

    /** UUID of the preprocessing pipeline. */
    private UUID pipelineId;

    /** JSON string of hyperparameters used during training. */
    private String hyperparamsJson;

    /** JSON string of evaluation metrics. */
    private String metricsJson;

    /** Whether the model is currently active in production. */
    private boolean isActive;

    /** UUID of the user who initiated training. */
    private UUID trainedBy;

    /** Timestamp when training was initiated. */
    private LocalDateTime trainedAt;

    /** Model version number. */
    private int version;

    /** External job identifier for the training job. */
    private String jobId;

    /** Current training status. */
    private String status;

    /** Path to the saved model file on the ML service filesystem. */
    private String modelPath;
}
