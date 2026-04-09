package com.bfmining.forecasting.forecast;

import com.bfmining.forecasting.audit.AuditAction;
import com.bfmining.forecasting.dataset.Dataset;
import com.bfmining.forecasting.dataset.DatasetRepository;
import com.bfmining.forecasting.model.TrainedModel;
import com.bfmining.forecasting.model.TrainedModelRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.io.BufferedReader;
import java.io.FileReader;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service layer for managing forecast generation and retrieval.
 * Calls the ML microservice to produce real forecasted values.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ForecastService {

    private final ForecastRepository forecastRepository;
    private final TrainedModelRepository modelRepository;
    private final DatasetRepository datasetRepository;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate;

    @Value("${app.ml.service-url}")
    private String mlServiceUrl;

    /** Returns all forecasts ordered by creation timestamp descending. */
    public List<ForecastDto> getAllForecasts() {
        return forecastRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    /** Retrieves a single forecast by its unique identifier. */
    public ForecastDto getForecastById(UUID id) {
        Forecast forecast = forecastRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Forecast not found with id: " + id));
        return toDto(forecast);
    }

    /**
     * Generates a new forecast by calling the ML service with the saved model file.
     * The model must be in TRAINED status and have a model_path set.
     *
     * @param req    the generation request containing model id and horizon months
     * @param userId the UUID of the user requesting the forecast
     * @return the created forecast DTO with real ML-generated data
     */
    @AuditAction("FORECAST_GENERATE")
    public ForecastDto generateForecast(GenerateForecastRequest req, UUID userId) {
        // 1. Load the trained model record
        TrainedModel model = modelRepository.findById(req.getModelId())
                .orElseThrow(() -> new EntityNotFoundException("Model not found: " + req.getModelId()));

        if (!"TRAINED".equals(model.getStatus())) {
            throw new IllegalStateException("Model is not in TRAINED status: " + model.getStatus());
        }
        if (model.getModelPath() == null || model.getModelPath().isBlank()) {
            throw new IllegalStateException("Model has no saved file path. Please retrain the model.");
        }

        // 2. Determine the last date from the dataset CSV
        String lastDate = findLastDate(model);

        // 3. Call the ML service
        Map<String, Object> payload = Map.of(
                "model_path", model.getModelPath(),
                "horizon_months", req.getHorizonMonths(),
                "last_date", lastDate
        );

        String url = mlServiceUrl + "/ml/forecast/generate";
        log.info("Calling ML service: POST {} for model {}", url, req.getModelId());

        @SuppressWarnings("unchecked")
        ResponseEntity<Map<String, Object>> response =
                (ResponseEntity<Map<String, Object>>) (ResponseEntity<?>)
                restTemplate.postForEntity(url, payload, Map.class);

        Map<String, Object> body = response.getBody();
        if (body == null) throw new IllegalStateException("ML service returned empty response");

        // 4. Serialize the forecast data arrays
        String forecastJson;
        String ciJson;
        try {
            Object data = body.get("data");
            forecastJson = objectMapper.writeValueAsString(data);
            ciJson = objectMapper.writeValueAsString(data); // full points include CI bounds
        } catch (Exception e) {
            throw new IllegalStateException("Failed to serialize forecast data: " + e.getMessage(), e);
        }

        // 5. Persist and return
        Forecast forecast = Forecast.builder()
                .modelId(req.getModelId())
                .horizonMonths(req.getHorizonMonths())
                .forecastJson(forecastJson)
                .confidenceIntervalsJson(ciJson)
                .createdBy(userId)
                .createdAt(LocalDateTime.now())
                .build();

        return toDto(forecastRepository.save(forecast));
    }

    /**
     * Reads the dataset CSV and returns the last date value found in the date column.
     * Falls back to today minus one month if the file cannot be read.
     */
    private String findLastDate(TrainedModel model) {
        try {
            if (model.getDatasetId() == null) return fallbackDate();
            Dataset dataset = datasetRepository.findById(model.getDatasetId()).orElse(null);
            if (dataset == null || dataset.getFilePath() == null) return fallbackDate();

            String lastDate = null;
            try (BufferedReader br = new BufferedReader(new FileReader(dataset.getFilePath()))) {
                String headerLine = br.readLine();
                if (headerLine == null) return fallbackDate();

                String[] headers = headerLine.split(",");
                int dateIdx = 0;
                for (int i = 0; i < headers.length; i++) {
                    String h = headers[i].trim().toLowerCase();
                    if (h.contains("date") || h.contains("year") || h.contains("time")) {
                        dateIdx = i;
                        break;
                    }
                }

                String line;
                while ((line = br.readLine()) != null) {
                    String[] parts = line.split(",", -1);
                    if (parts.length > dateIdx && !parts[dateIdx].trim().isEmpty()) {
                        lastDate = parts[dateIdx].trim();
                    }
                }
            }
            return lastDate != null ? lastDate : fallbackDate();
        } catch (Exception e) {
            log.warn("Could not read last date from dataset: {}", e.getMessage());
            return fallbackDate();
        }
    }

    private String fallbackDate() {
        return java.time.LocalDate.now().minusMonths(1).toString();
    }

    private ForecastDto toDto(Forecast forecast) {
        String modelName = modelRepository.findById(forecast.getModelId())
                .map(TrainedModel::getName)
                .orElse("Unknown Model");
        return ForecastDto.builder()
                .id(forecast.getId())
                .modelId(forecast.getModelId())
                .modelName(modelName)
                .horizonMonths(forecast.getHorizonMonths())
                .forecastJson(forecast.getForecastJson())
                .confidenceIntervalsJson(forecast.getConfidenceIntervalsJson())
                .createdBy(forecast.getCreatedBy())
                .createdAt(forecast.getCreatedAt())
                .build();
    }
}
