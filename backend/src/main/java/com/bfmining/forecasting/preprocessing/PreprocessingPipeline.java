package com.bfmining.forecasting.preprocessing;

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
 * JPA entity representing a preprocessing pipeline configuration.
 * Stores the JSON configuration and execution status for data pipelines
 * applied to datasets prior to model training.
 */
@Entity
@Table(name = "preprocessing_pipelines")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PreprocessingPipeline {

    /** Unique identifier for the pipeline, auto-generated as UUID. */
    @Id
    @GeneratedValue(generator = "UUID")
    @GenericGenerator(name = "UUID", strategy = "org.hibernate.id.UUIDGenerator")
    @Column(updatable = false, nullable = false)
    private UUID id;

    /** Human-readable name for the pipeline. */
    @Column(nullable = false)
    private String name;

    /** UUID of the dataset this pipeline is associated with. */
    @Column(name = "dataset_id")
    private UUID datasetId;

    /** JSON configuration describing the pipeline steps, stored as JSONB. */
    @Column(name = "config_json", columnDefinition = "jsonb")
    private String configJson;

    /** UUID of the user who created the pipeline. */
    @Column(name = "created_by")
    private UUID createdBy;

    /** Timestamp when the pipeline was created. */
    @Builder.Default
    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    /** Version number of the pipeline, incremented on updates. */
    @Builder.Default
    @Column(nullable = false)
    private int version = 1;

    /** Current status of the pipeline (e.g. "DRAFT", "COMPLETED"). */
    @Builder.Default
    @Column(nullable = false)
    private String status = "DRAFT";
}
