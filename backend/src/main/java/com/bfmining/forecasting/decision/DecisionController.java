package com.bfmining.forecasting.decision;

import com.bfmining.forecasting.forecast.Forecast;
import com.bfmining.forecasting.forecast.ForecastRepository;
import com.bfmining.forecasting.model.TrainedModel;
import com.bfmining.forecasting.model.TrainedModelRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * REST controller exposing decision support endpoints under {@code /api/decisions}.
 * Generates dynamic warnings and recommendations from trained models and forecasts.
 */
@RestController
@RequestMapping("/api/decisions")
@RequiredArgsConstructor
public class DecisionController {

    private final TrainedModelRepository modelRepository;
    private final ForecastRepository forecastRepository;
    private final ObjectMapper objectMapper;

    /**
     * Returns active warnings derived from model metrics and forecast trends.
     */
    @GetMapping("/warnings")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<DecisionRecommendation>> getWarnings() {
        List<DecisionRecommendation> warnings = new ArrayList<>();

        List<TrainedModel> trainedModels = modelRepository.findAll()
                .stream()
                .filter(m -> "TRAINED".equals(m.getStatus()))
                .toList();

        if (trainedModels.isEmpty()) {
            warnings.add(DecisionRecommendation.builder()
                    .title("No Trained Models Available")
                    .description("Train at least one model to enable demand forecasting and decision support.")
                    .severity("WARNING")
                    .build());
            return ResponseEntity.ok(warnings);
        }

        // Warn if any trained model has high MAPE
        for (TrainedModel model : trainedModels) {
            if (model.getMetricsJson() != null) {
                try {
                    Map<String, Object> metrics = objectMapper.readValue(
                            model.getMetricsJson(), new TypeReference<>() {});
                    Object mapeObj = metrics.get("mape");
                    if (mapeObj instanceof Number n && n.doubleValue() > 20.0) {
                        warnings.add(DecisionRecommendation.builder()
                                .title("High Forecast Error: " + model.getName())
                                .description(String.format(
                                        "Model '%s' (%s) has a MAPE of %.1f%%, exceeding the 20%% threshold. "
                                        + "Consider retraining with adjusted hyperparameters.",
                                        model.getName(), model.getAlgorithm(), n.doubleValue()))
                                .severity("WARNING")
                                .build());
                    }
                } catch (Exception ignored) {}
            }
        }

        // No forecasts generated yet
        List<Forecast> forecasts = forecastRepository.findAllByOrderByCreatedAtDesc();
        if (forecasts.isEmpty()) {
            warnings.add(DecisionRecommendation.builder()
                    .title("No Forecasts Generated")
                    .description("No forecast data is available. Generate a forecast to enable full decision support and trend analysis.")
                    .severity("INFO")
                    .build());
        } else {
            // Warn on declining forecast trend
            Forecast latest = forecasts.get(0);
            if (latest.getForecastJson() != null) {
                try {
                    List<Map<String, Object>> points = objectMapper.readValue(
                            latest.getForecastJson(), new TypeReference<>() {});
                    if (points.size() >= 2) {
                        double first = toDouble(points.get(0).get("value"));
                        double last  = toDouble(points.get(points.size() - 1).get("value"));
                        if (first > 0 && (last - first) / first < -0.10) {
                            warnings.add(DecisionRecommendation.builder()
                                    .title("Declining Demand Trend Detected")
                                    .description(String.format(
                                            "The latest %d-month forecast shows a %.1f%% decline. "
                                            + "Review production schedules and forward sales agreements.",
                                            latest.getHorizonMonths(),
                                            ((last - first) / first) * 100))
                                    .severity("WARNING")
                                    .build());
                        }
                    }
                } catch (Exception ignored) {}
            }
        }

        return ResponseEntity.ok(warnings);
    }

    /**
     * Returns strategic recommendations derived from trained models and forecast trends.
     */
    @GetMapping("/recommendations")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<DecisionRecommendation>> getRecommendations() {
        List<DecisionRecommendation> recs = new ArrayList<>();

        List<TrainedModel> trainedModels = modelRepository.findAll()
                .stream()
                .filter(m -> "TRAINED".equals(m.getStatus()))
                .toList();

        if (trainedModels.isEmpty()) {
            recs.add(DecisionRecommendation.builder()
                    .title("Get Started: Train Your First Model")
                    .description("Upload a dataset, run a preprocessing pipeline, then train an ARIMA, "
                            + "Holt-Winters ETS, or LSTM model to unlock forecast-driven recommendations.")
                    .severity("INFO")
                    .build());
            return ResponseEntity.ok(recs);
        }

        // Active model status
        Optional<TrainedModel> activeOpt = modelRepository.findFirstByIsActiveTrue();
        if (activeOpt.isEmpty()) {
            recs.add(DecisionRecommendation.builder()
                    .title("Activate a Trained Model")
                    .description(String.format(
                            "You have %d trained model(s) but none is set as active. "
                            + "Activate a model on the Forecasting page to enable dashboard forecasting.",
                            trainedModels.size()))
                    .severity("WARNING")
                    .build());
        } else {
            TrainedModel active = activeOpt.get();
            String mapeStr = extractMape(active);
            recs.add(DecisionRecommendation.builder()
                    .title("Active Model: " + active.getName())
                    .description(String.format(
                            "Model '%s' (%s)%s is currently active. Use it to generate forecasts "
                            + "and run scenario analysis for demand planning.",
                            active.getName(),
                            active.getAlgorithm(),
                            mapeStr.isEmpty() ? "" : " with MAPE " + mapeStr + "%"))
                    .severity("INFO")
                    .build());
        }

        // Suggest comparing models when multiple exist
        if (trainedModels.size() > 1) {
            recs.add(DecisionRecommendation.builder()
                    .title("Compare Trained Models")
                    .description(String.format(
                            "You have %d trained models. Review MAE, RMSE, and MAPE on the Forecasting page "
                            + "to identify the best-performing algorithm for your dataset.",
                            trainedModels.size()))
                    .severity("INFO")
                    .build());
        }

        // Forecast trend recommendation
        List<Forecast> forecasts = forecastRepository.findAllByOrderByCreatedAtDesc();
        if (!forecasts.isEmpty() && forecasts.get(0).getForecastJson() != null) {
            try {
                List<Map<String, Object>> points = objectMapper.readValue(
                        forecasts.get(0).getForecastJson(), new TypeReference<>() {});
                if (points.size() >= 2) {
                    double first  = toDouble(points.get(0).get("value"));
                    double last   = toDouble(points.get(points.size() - 1).get("value"));
                    double change = first > 0 ? ((last - first) / first) * 100 : 0;
                    int horizon   = forecasts.get(0).getHorizonMonths();

                    if (change > 10) {
                        recs.add(DecisionRecommendation.builder()
                                .title("Rising Demand - Expand Capacity")
                                .description(String.format(
                                        "The latest forecast shows a %.1f%% upward trend over %d months. "
                                        + "Consider reviewing production capacity, export commitments, and supply chain arrangements.",
                                        change, horizon))
                                .severity("INFO")
                                .build());
                    } else if (change < -10) {
                        recs.add(DecisionRecommendation.builder()
                                .title("Declining Demand - Review Commitments")
                                .description(String.format(
                                        "The latest forecast shows a %.1f%% downward trend over %d months. "
                                        + "Review inventory levels, forward contracts, and production schedules.",
                                        Math.abs(change), horizon))
                                .severity("WARNING")
                                .build());
                    }
                }
            } catch (Exception ignored) {}
        }

        return ResponseEntity.ok(recs);
    }

    private double toDouble(Object val) {
        if (val instanceof Number n) return n.doubleValue();
        try { return Double.parseDouble(String.valueOf(val)); } catch (Exception e) { return 0; }
    }

    private String extractMape(TrainedModel model) {
        if (model.getMetricsJson() == null) return "";
        try {
            Map<String, Object> m = objectMapper.readValue(model.getMetricsJson(), new TypeReference<>() {});
            Object v = m.get("mape");
            if (v instanceof Number n) return String.format("%.1f", n.doubleValue());
        } catch (Exception ignored) {}
        return "";
    }
}
