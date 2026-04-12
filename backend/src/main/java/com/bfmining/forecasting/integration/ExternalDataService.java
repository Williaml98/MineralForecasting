package com.bfmining.forecasting.integration;

import com.bfmining.forecasting.dataset.Dataset;
import com.bfmining.forecasting.dataset.DatasetRepository;
import com.bfmining.forecasting.dataset.DatasetStatus;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.io.FileWriter;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Service for fetching commodity data from the World Bank Open Data API.
 * Uses the free, unauthenticated endpoint:
 * https://api.worldbank.org/v2/en/indicator/{code}?format=json&per_page=1000&mrv=200
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ExternalDataService {

    private final RestTemplate restTemplate;
    private final DatasetRepository datasetRepository;
    private final ObjectMapper objectMapper;

    @Value("${app.upload-dir:uploads}")
    private String uploadDir;

    /** World Bank API base URL. */
    private static final String WB_API_BASE = "https://api.worldbank.org/v2/en/indicator";

    /**
     * Returns the list of World Bank commodity indicators relevant to minerals.
     * These are well-known codes from the World Bank Commodity Markets data.
     */
    public List<Map<String, String>> getAvailableIndicators() {
        return List.of(
            Map.of("code", "PCOPPER",   "label", "Copper (USD/mt)",             "source", "World Bank"),
            Map.of("code", "PALUM",     "label", "Aluminum (USD/mt)",            "source", "World Bank"),
            Map.of("code", "PNICK",     "label", "Nickel (USD/mt)",              "source", "World Bank"),
            Map.of("code", "PZINC",     "label", "Zinc (USD/mt)",                "source", "World Bank"),
            Map.of("code", "PLEAD",     "label", "Lead (USD/mt)",                "source", "World Bank"),
            Map.of("code", "PTIN",      "label", "Tin (USD/mt)",                 "source", "World Bank"),
            Map.of("code", "PIRON",     "label", "Iron Ore (USD/dmt)",           "source", "World Bank"),
            Map.of("code", "PGOLD",     "label", "Gold (USD/troy oz)",           "source", "World Bank"),
            Map.of("code", "PSILVER",   "label", "Silver (USD/troy oz)",         "source", "World Bank"),
            Map.of("code", "PCOBALT",   "label", "Cobalt (USD/mt)",              "source", "World Bank"),
            Map.of("code", "PMANG",     "label", "Manganese Ore (USD/dmtu)",     "source", "World Bank"),
            Map.of("code", "PCHROM",    "label", "Chromium Ore (USD/mt)",        "source", "World Bank")
        );
    }

    /**
     * Fetches monthly commodity price data from the World Bank API.
     *
     * @param indicator World Bank commodity code (e.g. "PCOPPER")
     * @param startYear inclusive start year
     * @param endYear   inclusive end year (0 = current year)
     * @return map with keys: indicator, data (list of {date, value}), rowCount, dateRange
     */
    public Map<String, Object> fetchWorldBankData(String indicator, int startYear, int endYear) {
        int resolvedEndYear = endYear == 0 ? LocalDate.now().getYear() : endYear;
        String url = String.format(
            "%s/%s?format=json&per_page=500&date=%d:%d",
            WB_API_BASE, indicator.toUpperCase(), startYear, resolvedEndYear
        );

        log.info("Fetching World Bank data: {}", url);

        List<Map<String, Object>> rows = new ArrayList<>();
        try {
            String raw = restTemplate.getForObject(url, String.class);
            JsonNode root = objectMapper.readTree(raw);
            // World Bank returns a 2-element JSON array: [metadata, dataArray]
            if (root.isArray() && root.size() == 2) {
                JsonNode dataArray = root.get(1);
                if (dataArray != null && dataArray.isArray()) {
                    for (JsonNode item : dataArray) {
                        JsonNode valueNode = item.get("value");
                        JsonNode dateNode = item.get("date");
                        if (valueNode != null && !valueNode.isNull() && dateNode != null) {
                            Map<String, Object> row = new LinkedHashMap<>();
                            row.put("date", dateNode.asText() + "-01");
                            row.put("demand", valueNode.asDouble());
                            row.put("source", "World Bank");
                            row.put("indicator", indicator);
                            rows.add(row);
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.error("Failed to fetch World Bank data for indicator {}: {}", indicator, e.getMessage());
            throw new RuntimeException("Failed to fetch World Bank data: " + e.getMessage(), e);
        }

        // Sort by date ascending
        rows.sort((a, b) -> String.valueOf(a.get("date")).compareTo(String.valueOf(b.get("date"))));

        String dateRange = rows.isEmpty() ? "N/A"
            : rows.get(0).get("date") + " to " + rows.get(rows.size() - 1).get("date");

        return Map.of(
            "indicator", indicator,
            "data", rows,
            "rowCount", rows.size(),
            "dateRange", dateRange,
            "source", "World Bank Open Data API"
        );
    }

    /**
     * Fetches World Bank data and saves it as a CSV dataset in the system.
     *
     * @param indicator   the commodity indicator code
     * @param startYear   start year
     * @param endYear     end year (0 = current)
     * @param name        display name for the dataset (nullable)
     * @param userId      the user importing the data
     * @return map with datasetId and rowCount
     */
    public Map<String, Object> importAsDataset(String indicator, int startYear, int endYear,
                                               String name, UUID userId) {
        Map<String, Object> fetched = fetchWorldBankData(indicator, startYear, endYear);

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> rows = (List<Map<String, Object>>) fetched.get("data");

        if (rows == null || rows.isEmpty()) {
            throw new RuntimeException("No data returned from World Bank for indicator: " + indicator);
        }

        // Write CSV to the uploads directory
        String displayName = (name != null && !name.isBlank())
            ? name
            : "WorldBank_" + indicator + "_" + startYear + "_" + endYear;
        String fileName = displayName.replaceAll("[^a-zA-Z0-9_\\-]", "_") + ".csv";

        try {
            Path uploadPath = Path.of(uploadDir);
            Files.createDirectories(uploadPath);
            Path csvPath = uploadPath.resolve(fileName);

            try (FileWriter fw = new FileWriter(csvPath.toFile())) {
                // Header
                fw.write("date,demand,source,indicator\n");
                for (Map<String, Object> row : rows) {
                    fw.write(String.format("%s,%s,%s,%s\n",
                        row.get("date"),
                        row.get("demand"),
                        row.get("source"),
                        row.get("indicator")
                    ));
                }
            }

            // Persist dataset record
            Dataset dataset = Dataset.builder()
                .name(displayName)
                .source("World Bank Open Data")
                .version(1)
                .uploadedBy(userId)
                .uploadedAt(LocalDateTime.now())
                .rowCount(rows.size())
                .filePath(csvPath.toAbsolutePath().toString())
                .status(DatasetStatus.VALIDATED)
                .build();

            Dataset saved = datasetRepository.save(dataset);
            log.info("Imported World Bank dataset: {} ({} rows)", displayName, rows.size());

            return Map.of(
                "datasetId", saved.getId().toString(),
                "name", displayName,
                "rowCount", rows.size(),
                "filePath", csvPath.toString()
            );

        } catch (Exception e) {
            log.error("Failed to save World Bank dataset: {}", e.getMessage());
            throw new RuntimeException("Failed to save dataset: " + e.getMessage(), e);
        }
    }
}
