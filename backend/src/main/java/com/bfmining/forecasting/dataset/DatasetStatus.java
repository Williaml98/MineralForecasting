package com.bfmining.forecasting.dataset;

/**
 * Represents the lifecycle status of a dataset in the system.
 */
public enum DatasetStatus {
    /** Dataset has been uploaded but not yet validated. */
    PENDING,
    /** Dataset has been validated and is ready for use. */
    VALIDATED,
    /** Dataset failed validation checks. */
    INVALID,
    /** Dataset has been soft-deleted. */
    DELETED
}
