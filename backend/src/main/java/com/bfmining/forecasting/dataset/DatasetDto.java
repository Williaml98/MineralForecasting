package com.bfmining.forecasting.dataset;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Data Transfer Object representing a dataset, used in API responses.
 * Mirrors the fields of {@link Dataset} and includes an additional
 * {@code hasFile} flag indicating whether a physical file exists.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DatasetDto {

    /** Unique identifier of the dataset. */
    private UUID id;

    /** Human-readable name of the dataset. */
    private String name;

    /** Source of the dataset (e.g. "UPLOAD"). */
    private String source;

    /** Dataset version number. */
    private int version;

    /** UUID of the user who uploaded the dataset. */
    private UUID uploadedBy;

    /** Timestamp when the dataset was uploaded. */
    private LocalDateTime uploadedAt;

    /** Estimated number of rows in the dataset. */
    private Integer rowCount;

    /** Current status of the dataset. */
    private DatasetStatus status;

    /** Filesystem path to the stored file. */
    private String filePath;

    /** Indicates whether a physical file exists on disk for this dataset. */
    private boolean hasFile;
}
