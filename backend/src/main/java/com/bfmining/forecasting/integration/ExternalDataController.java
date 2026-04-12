package com.bfmining.forecasting.integration;

import com.bfmining.forecasting.common.ApiResponse;
import com.bfmining.forecasting.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * REST controller for fetching external commodity data from the World Bank
 * and USGS APIs. Results can be previewed before importing as a dataset.
 */
@RestController
@RequestMapping("/api/external-data")
@RequiredArgsConstructor
public class ExternalDataController {

    private final ExternalDataService externalDataService;

    /**
     * Returns a list of available World Bank commodity indicator codes
     * relevant to mineral demand forecasting.
     *
     * @return list of indicator metadata objects
     */
    @GetMapping("/indicators")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<Map<String, String>>>> getAvailableIndicators() {
        return ResponseEntity.ok(ApiResponse.ok(externalDataService.getAvailableIndicators()));
    }

    /**
     * Fetches time-series commodity price data from the World Bank API
     * for the given indicator and date range.
     *
     * @param indicator World Bank indicator code (e.g. "PCOPPER")
     * @param startYear start year (default: 2010)
     * @param endYear   end year (default: current year)
     * @return paginated list of {date, value} records
     */
    @GetMapping("/world-bank")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Map<String, Object>>> fetchWorldBankData(
            @RequestParam String indicator,
            @RequestParam(defaultValue = "2010") int startYear,
            @RequestParam(defaultValue = "0") int endYear) {
        Map<String, Object> result = externalDataService.fetchWorldBankData(indicator, startYear, endYear);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    /**
     * Imports World Bank commodity data as a new dataset in the system.
     * The data is converted to CSV format and saved with the appropriate
     * columns (date, demand, source).
     *
     * @param indicator World Bank indicator code
     * @param startYear start year
     * @param endYear   end year
     * @param name      optional name for the new dataset
     * @param currentUser the authenticated user
     * @return the created dataset DTO
     */
    @PostMapping("/import")
    @PreAuthorize("hasAnyRole('ADMIN','ANALYST')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> importAsDataset(
            @RequestParam String indicator,
            @RequestParam(defaultValue = "2010") int startYear,
            @RequestParam(defaultValue = "0") int endYear,
            @RequestParam(required = false) String name,
            @AuthenticationPrincipal User currentUser) {
        Map<String, Object> result = externalDataService.importAsDataset(
                indicator, startYear, endYear, name, currentUser.getId());
        return ResponseEntity.ok(ApiResponse.ok("Dataset imported from World Bank", result));
    }
}
