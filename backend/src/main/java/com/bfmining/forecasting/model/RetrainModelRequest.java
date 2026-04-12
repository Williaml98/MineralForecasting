package com.bfmining.forecasting.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

/**
 * Request body for retraining an existing model with a new dataset and/or pipeline.
 * The algorithm and hyperparameters from the original model are preserved unless
 * overrides are provided.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RetrainModelRequest {

    /** UUID of the new dataset to use. If null, the original dataset is reused. */
    private UUID datasetId;

    /** UUID of the new preprocessing pipeline. If null, the original pipeline is reused. */
    private UUID pipelineId;

    /**
     * Optional new model name suffix. If provided, the retrained model is saved as
     * "{originalName} (retrained)" to keep a clear history.
     */
    private String nameSuffix;
}
