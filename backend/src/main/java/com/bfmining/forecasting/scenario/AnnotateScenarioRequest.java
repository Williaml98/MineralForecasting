package com.bfmining.forecasting.scenario;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Request body for annotating an existing scenario with notes and a review flag.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnnotateScenarioRequest {

    /** Notes or commentary to attach to the scenario. */
    private String notes;

    /** Whether to flag the scenario for review by a strategist. */
    private boolean flagForReview;
}
