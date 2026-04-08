package com.bfmining.forecasting.preprocessing;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Data Transfer Object representing a preprocessing pipeline, used in API responses.
 * Mirrors all fields of the {@link PreprocessingPipeline} entity.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PipelineDto {

    /** Unique identifier of the pipeline. */
    private UUID id;

    /** Human-readable name of the pipeline. */
    private String name;

    /** UUID of the dataset associated with this pipeline. */
    private UUID datasetId;

    /** JSON configuration string for the pipeline steps. */
    private String configJson;

    /** UUID of the user who created the pipeline. */
    private UUID createdBy;

    /** Timestamp when the pipeline was created. */
    private LocalDateTime createdAt;

    /** Pipeline version number. */
    private int version;

    /** Current execution status of the pipeline. */
    private String status;
}
