package com.bfmining.forecasting.model;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

/**
 * Request body for initiating model training.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TrainModelRequest {

    /** Non-blank human-readable name for the model. */
    @NotBlank
    private String name;

    /**
     * Algorithm to use for training.
     * Supported values: ARIMA, PROPHET, LSTM.
     */
    @NotBlank
    private String algorithm;

    /** UUID of the dataset to use for training. */
    private UUID datasetId;

    /** UUID of the preprocessing pipeline to apply before training. */
    private UUID pipelineId;

    /** JSON string of hyperparameter values to use during training. */
    private String hyperparamsJson;
}
