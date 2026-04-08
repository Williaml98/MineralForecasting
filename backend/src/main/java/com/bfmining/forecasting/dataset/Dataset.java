package com.bfmining.forecasting.dataset;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
 * JPA entity representing a mineral forecasting dataset.
 * Stores metadata about uploaded files including version tracking and status.
 */
@Entity
@Table(name = "datasets")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Dataset {

    /** Unique identifier for the dataset, auto-generated as UUID. */
    @Id
    @GeneratedValue(generator = "UUID")
    @GenericGenerator(name = "UUID", strategy = "org.hibernate.id.UUIDGenerator")
    @Column(updatable = false, nullable = false)
    private UUID id;

    /** Human-readable name for the dataset, typically the original filename. */
    @Column(nullable = false)
    private String name;

    /** Source identifier indicating how the dataset was obtained (e.g. "UPLOAD"). */
    @Column
    private String source;

    /** Version number of the dataset, incremented on updates. */
    @Builder.Default
    @Column(nullable = false)
    private int version = 1;

    /** UUID of the user who uploaded the dataset. */
    @Column(name = "uploaded_by")
    private UUID uploadedBy;

    /** Timestamp when the dataset was uploaded. */
    @Builder.Default
    @Column(name = "uploaded_at")
    private LocalDateTime uploadedAt = LocalDateTime.now();

    /** Estimated number of rows in the dataset. */
    @Column(name = "row_count")
    private Integer rowCount;

    /** Current processing/validation status of the dataset. */
    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DatasetStatus status = DatasetStatus.PENDING;

    /** Filesystem path where the dataset file is stored. */
    @Column(name = "file_path")
    private String filePath;
}
