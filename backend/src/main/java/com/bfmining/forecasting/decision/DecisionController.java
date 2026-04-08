package com.bfmining.forecasting.decision;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * REST controller exposing decision support endpoints under {@code /api/decisions}.
 * Returns hardcoded recommendation and warning objects as a placeholder for a
 * future rules-engine or ML-driven decision layer.
 */
@RestController
@RequestMapping("/api/decisions")
public class DecisionController {

    /**
     * Returns a list of decision recommendations derived from current forecast data.
     * The current implementation returns two example recommendations.
     *
     * @return HTTP 200 with a list of {@link DecisionRecommendation}
     */
    @GetMapping("/recommendations")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<DecisionRecommendation>> getRecommendations() {
        List<DecisionRecommendation> recommendations = List.of(
                DecisionRecommendation.builder()
                        .title("Increase Copper Production Capacity")
                        .description(
                                "Current forecast models indicate a 15% price increase for copper "
                                + "over the next 6 months. Consider expanding production capacity to "
                                + "capitalise on favourable market conditions.")
                        .severity("INFO")
                        .build(),
                DecisionRecommendation.builder()
                        .title("Review Gold Hedging Strategy")
                        .description(
                                "Predicted volatility in gold prices suggests revisiting existing "
                                + "hedging contracts. A dynamic hedging approach may reduce downside "
                                + "risk by approximately 8% based on scenario modelling.")
                        .severity("INFO")
                        .build()
        );
        return ResponseEntity.ok(recommendations);
    }

    /**
     * Returns a list of active warnings related to forecast anomalies or risks.
     * The current implementation returns one example warning.
     *
     * @return HTTP 200 with a list of {@link DecisionRecommendation}
     */
    @GetMapping("/warnings")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<DecisionRecommendation>> getWarnings() {
        List<DecisionRecommendation> warnings = List.of(
                DecisionRecommendation.builder()
                        .title("Iron Ore Demand Contraction Risk")
                        .description(
                                "Scenario analysis indicates a high probability of demand contraction "
                                + "in key iron ore markets over the next quarter. Immediate review of "
                                + "forward sales agreements is recommended.")
                        .severity("WARNING")
                        .build()
        );
        return ResponseEntity.ok(warnings);
    }
}
