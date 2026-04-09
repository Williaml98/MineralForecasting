package com.bfmining.forecasting.model;

import com.bfmining.forecasting.dataset.Dataset;
import com.bfmining.forecasting.dataset.DatasetRepository;
import com.bfmining.forecasting.preprocessing.PreprocessingPipeline;
import com.bfmining.forecasting.preprocessing.PreprocessingPipelineRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.io.BufferedReader;
import java.io.FileReader;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Separate Spring bean responsible for calling the ML service asynchronously
 * to train a model and then updating the TrainedModel record with the result.
 *
 * Must be a separate bean (not a method inside ModelService) so Spring's AOP
 * proxy correctly applies the {@code @Async} annotation.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class TrainingSimulator {

    private final TrainedModelRepository modelRepository;
    private final DatasetRepository datasetRepository;
    private final PreprocessingPipelineRepository pipelineRepository;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate;

    @Value("${app.ml.service-url}")
    private String mlServiceUrl;

    /**
     * Reads the dataset, calls the appropriate ML service endpoint, and
     * updates the model status and metrics based on the response.
     *
     * @param modelId the UUID of the TrainedModel to train
     */
    @Async
    public void callMlServiceAndComplete(UUID modelId) {
        TrainedModel model = modelRepository.findById(modelId).orElse(null);
        if (model == null) return;

        try {
            // 1. Load pipeline config to get date/value column names
            String dateCol = "date";
            String valueCol = "price";
            if (model.getPipelineId() != null) {
                PreprocessingPipeline pipeline = pipelineRepository
                        .findById(model.getPipelineId()).orElse(null);
                if (pipeline != null && pipeline.getConfigJson() != null) {
                    Map<String, Object> cfg = objectMapper.readValue(
                            pipeline.getConfigJson(), new TypeReference<>() {});
                    if (cfg.get("dateCol") instanceof String d) dateCol = d;
                    if (cfg.get("valueCol") instanceof String v) valueCol = v;
                }
            }

            // 2. Load and parse the dataset CSV
            List<Map<String, Object>> rows = new ArrayList<>();
            if (model.getDatasetId() != null) {
                Dataset dataset = datasetRepository.findById(model.getDatasetId()).orElse(null);
                if (dataset != null && dataset.getFilePath() != null) {
                    rows = parseCsv(dataset.getFilePath(), dateCol, valueCol);
                }
            }

            if (rows.isEmpty()) {
                throw new IllegalStateException("Dataset is empty or could not be read");
            }

            // 3. Parse hyperparameters
            Map<String, Object> hyperparams = new HashMap<>();
            if (model.getHyperparamsJson() != null) {
                hyperparams = objectMapper.readValue(
                        model.getHyperparamsJson(), new TypeReference<>() {});
            }

            // 4. Build ML service request payload
            String algorithm = model.getAlgorithm().toLowerCase();
            Map<String, Object> payload = buildPayload(algorithm, model.getJobId(),
                    rows, dateCol, valueCol, hyperparams);

            // 5. Call ML service
            String url = mlServiceUrl + "/ml/train/" + algorithm;
            log.info("Calling ML service: POST {} for model {}", url, modelId);

            @SuppressWarnings("unchecked")
            ResponseEntity<Map<String, Object>> response =
                    (ResponseEntity<Map<String, Object>>) (ResponseEntity<?>)
                    restTemplate.postForEntity(url, payload, Map.class);

            // 6. Extract metrics and update model
            Map<String, Object> body = response.getBody();
            if (body == null) throw new IllegalStateException("ML service returned empty response");

            String mlStatus = (String) body.get("status");
            if (!"completed".equals(mlStatus)) {
                throw new IllegalStateException("ML service reported status: " + mlStatus);
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> metrics = (Map<String, Object>) body.get("metrics");
            String metricsJson = objectMapper.writeValueAsString(metrics);

            model.setStatus("TRAINED");
            model.setMetricsJson(metricsJson);
            modelRepository.save(model);
            log.info("Model {} training completed. Metrics: {}", modelId, metricsJson);

        } catch (Exception e) {
            log.error("Training failed for model {}: {}", modelId, e.getMessage(), e);
            model.setStatus("FAILED");
            modelRepository.save(model);
        }
    }

    /**
     * Reads a CSV file and returns all rows as a list of maps with only the
     * date and value columns included (ML service only needs those two).
     */
    private List<Map<String, Object>> parseCsv(String filePath, String dateCol, String valueCol) {
        List<Map<String, Object>> rows = new ArrayList<>();
        try (BufferedReader br = new BufferedReader(new FileReader(filePath))) {
            String headerLine = br.readLine();
            if (headerLine == null) return rows;

            String[] headers = headerLine.split(",");
            int dateIdx = -1;
            int valueIdx = -1;

            for (int i = 0; i < headers.length; i++) {
                String h = headers[i].trim().toLowerCase();
                if (h.equals(dateCol.toLowerCase())) dateIdx = i;
                if (h.equals(valueCol.toLowerCase())) valueIdx = i;
            }

            // Fallback: try common column names if exact match not found
            if (dateIdx == -1) {
                for (int i = 0; i < headers.length; i++) {
                    String h = headers[i].trim().toLowerCase();
                    if (h.contains("date") || h.contains("year") || h.contains("time")) {
                        dateIdx = i; break;
                    }
                }
            }
            if (valueIdx == -1) {
                for (int i = 0; i < headers.length; i++) {
                    String h = headers[i].trim().toLowerCase();
                    if (h.contains("price") || h.contains("value") || h.contains("demand")) {
                        valueIdx = i; break;
                    }
                }
            }

            if (dateIdx == -1 || valueIdx == -1) {
                log.warn("Could not find columns '{}'/'{}' in CSV headers: {}",
                        dateCol, valueCol, headerLine);
                return rows;
            }

            String line;
            final int dIdx = dateIdx;
            final int vIdx = valueIdx;
            while ((line = br.readLine()) != null) {
                String[] parts = line.split(",", -1);
                if (parts.length <= Math.max(dIdx, vIdx)) continue;
                String dateVal = parts[dIdx].trim();
                String valStr  = parts[vIdx].trim();
                if (dateVal.isEmpty() || valStr.isEmpty()) continue;
                try {
                    double numVal = Double.parseDouble(valStr);
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put(dateCol, dateVal);
                    row.put(valueCol, numVal);
                    rows.add(row);
                } catch (NumberFormatException ignored) {
                    // skip non-numeric value rows (e.g. header duplicates)
                }
            }
        } catch (Exception e) {
            log.error("Failed to parse CSV at {}: {}", filePath, e.getMessage());
        }
        return rows;
    }

    /**
     * Builds the request body for the given algorithm endpoint on the ML service.
     */
    private Map<String, Object> buildPayload(String algorithm, String jobId,
            List<Map<String, Object>> data, String dateCol, String valueCol,
            Map<String, Object> hyperparams) {

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("job_id", jobId);
        payload.put("data", data);
        payload.put("date_col", dateCol);
        payload.put("value_col", valueCol);

        switch (algorithm) {
            case "arima" -> {
                int p = toInt(hyperparams.get("p"), 1);
                int d = toInt(hyperparams.get("d"), 1);
                int q = toInt(hyperparams.get("q"), 1);
                payload.put("order", List.of(p, d, q));
            }
            case "prophet" -> {
                double cps = toDouble(hyperparams.get("changepoint_prior_scale"), 0.05);
                payload.put("changepoint_prior_scale", cps);
            }
            case "lstm" -> {
                payload.put("units", toInt(hyperparams.get("units"), 64));
                payload.put("epochs", toInt(hyperparams.get("epochs"), 50));
            }
        }
        return payload;
    }

    private int toInt(Object val, int defaultVal) {
        if (val == null) return defaultVal;
        if (val instanceof Number n) return n.intValue();
        try { return Integer.parseInt(val.toString()); } catch (Exception e) { return defaultVal; }
    }

    private double toDouble(Object val, double defaultVal) {
        if (val == null) return defaultVal;
        if (val instanceof Number n) return n.doubleValue();
        try { return Double.parseDouble(val.toString()); } catch (Exception e) { return defaultVal; }
    }
}
