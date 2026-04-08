package com.bfmining.forecasting.preprocessing;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

/**
 * Request body for creating a new preprocessing pipeline.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreatePipelineRequest {

    /** Non-blank human-readable name for the pipeline. */
    @NotBlank
    private String name;

    /** UUID of the dataset to associate with this pipeline. */
    private UUID datasetId;

    /** JSON string containing the pipeline step configuration. */
    private String configJson;
}
