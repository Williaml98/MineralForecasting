package com.bfmining.forecasting.decision;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Plain Java object representing a decision recommendation or alert
 * generated from forecast and scenario analysis.
 * This is not a JPA entity — it is used purely as a response payload.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DecisionRecommendation {

    /** Short title summarising the recommendation. */
    private String title;

    /** Detailed description of the recommendation and its rationale. */
    private String description;

    /**
     * Severity level of the recommendation.
     * Expected values: INFO, WARNING, CRITICAL.
     */
    private String severity;
}
