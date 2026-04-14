package com.bfmining.forecasting.integration;

import com.bfmining.forecasting.dataset.Dataset;
import com.bfmining.forecasting.dataset.DatasetRepository;
import com.bfmining.forecasting.dataset.DatasetStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.io.BufferedReader;
import java.io.FileWriter;
import java.io.StringReader;
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
 * Service for fetching commodity price data from the St. Louis Fed FRED API.
 *
 * FRED provides free, unauthenticated access to World Bank Pink Sheet monthly
 * commodity prices via simple CSV download:
 *   https://fred.stlouisfed.org/graph/fredgraph.csv?id={SERIES_ID}
 *
 * The CSV has two columns: observation_date (YYYY-MM-DD), {SERIES_ID} (value).
 * Confirmed working series IDs (verified live):
 *   PCOPPUSDM, PALUMUSDM, PNICKUSDM, PZINCUSDM, PLEADUSDM, PTINUSDM, PIORECRUSDM
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ExternalDataService {

    private final RestTemplate restTemplate;
    private final DatasetRepository datasetRepository;

    @Value("${app.upload-dir:uploads}")
    private String uploadDir;

    /** FRED CSV download base URL – no API key required. */
    private static final String FRED_CSV_BASE =
        "https://fred.stlouisfed.org/graph/fredgraph.csv?id=";

    /**
     * Available mineral commodity indicators.
     * Each "code" is a verified FRED series ID (Pink Sheet monthly prices).
     * All confirmed to return 400+ months of data with no authentication.
     */
    public List<Map<String, String>> getAvailableIndicators() {
        return List.of(
            Map.of("code", "PCOPPUSDM",  "label", "Copper (USD/mt)",        "source", "FRED / World Bank"),
            Map.of("code", "PALUMUSDM",  "label", "Aluminum (USD/mt)",      "source", "FRED / World Bank"),
            Map.of("code", "PNICKUSDM",  "label", "Nickel (USD/mt)",        "source", "FRED / World Bank"),
            Map.of("code", "PZINCUSDM",  "label", "Zinc (USD/mt)",          "source", "FRED / World Bank"),
            Map.of("code", "PLEADUSDM",  "label", "Lead (USD/mt)",          "source", "FRED / World Bank"),
            Map.of("code", "PTINUSDM",   "label", "Tin (USD/mt)",           "source", "FRED / World Bank"),
            Map.of("code", "PIORECRUSDM","label", "Iron Ore (USD/dry mt)",  "source", "FRED / World Bank")
        );
    }

    /**
     * Fetches monthly commodity price data from FRED.
     *
     * @param indicator FRED series ID (e.g. "PCOPPUSDM")
     * @param startYear inclusive start year filter (rows before this year are dropped)
     * @param endYear   inclusive end year filter (0 = current year)
     * @return map with keys: indicator, data (list of {date, demand}), rowCount, dateRange
     */
    public Map<String, Object> fetchWorldBankData(String indicator, int startYear, int endYear) {
        int resolvedEndYear = endYear == 0 ? LocalDate.now().getYear() : endYear;
        String url = FRED_CSV_BASE + indicator.toUpperCase();

        log.info("Fetching FRED commodity data: {} (years {}-{})", url, startYear, resolvedEndYear);

        List<Map<String, Object>> rows = new ArrayList<>();
        try {
            String csv = restTemplate.getForObject(url, String.class);
            if (csv == null || csv.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "FRED returned empty response for series: " + indicator);
            }
            // Parse CSV: skip header, filter by year, skip "." (missing) values
            try (BufferedReader br = new BufferedReader(new StringReader(csv))) {
                String line = br.readLine(); // skip header
                while ((line = br.readLine()) != null) {
                    String[] parts = line.split(",", 2);
                    if (parts.length < 2) continue;
                    String date  = parts[0].trim();   // "YYYY-MM-DD"
                    String value = parts[1].trim();   // numeric or "."
                    if (value.equals(".") || value.isEmpty()) continue;
                    int year = Integer.parseInt(date.substring(0, 4));
                    if (year < startYear || year > resolvedEndYear) continue;
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("date",      date);
                    row.put("demand",    Double.parseDouble(value));
                    row.put("source",    "FRED / World Bank Pink Sheet");
                    row.put("indicator", indicator);
                    rows.add(row);
                }
            }
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to fetch FRED data for {}: {}", indicator, e.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                "Could not fetch data from FRED for series '" + indicator + "': " + e.getMessage());
        }

        // Already sorted ascending from FRED – just compute summary
        String dateRange = rows.isEmpty() ? "N/A"
            : rows.get(0).get("date") + " to " + rows.get(rows.size() - 1).get("date");

        log.info("FRED returned {} rows for {} ({})", rows.size(), indicator, dateRange);

        return Map.of(
            "indicator", indicator,
            "data",      rows,
            "rowCount",  rows.size(),
            "dateRange", dateRange,
            "source",    "FRED / World Bank Pink Sheet"
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
            throw new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "No data returned from World Bank for indicator '" + indicator +
                "'. Verify the indicator code and date range."
            );
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
