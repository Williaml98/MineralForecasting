package com.bfmining.forecasting.forecast;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

/**
 * REST controller exposing forecast endpoints under {@code /api/forecasts}.
 * Handles forecast generation, listing, and retrieval.
 */
@RestController
@RequestMapping("/api/forecasts")
@RequiredArgsConstructor
public class ForecastController {

    /** Service handling forecast business logic. */
    private final ForecastService forecastService;

    /**
     * Generates a new mineral price forecast using the specified model.
     *
     * @param request   the generation request body containing model id and horizon
     * @param principal the authenticated user principal
     * @return HTTP 201 with the created {@link ForecastDto}
     */
    @PostMapping("/generate")
    @PreAuthorize("hasAnyRole('ADMIN','ANALYST')")
    public ResponseEntity<ForecastDto> generateForecast(
            @Valid @RequestBody GenerateForecastRequest request,
            Principal principal) {
        UUID userId = UUID.fromString(principal.getName());
        ForecastDto dto = forecastService.generateForecast(request, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    /**
     * Returns all forecasts ordered by creation date descending.
     *
     * @return HTTP 200 with list of {@link ForecastDto}
     */
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<ForecastDto>> getAllForecasts() {
        return ResponseEntity.ok(forecastService.getAllForecasts());
    }

    /**
     * Returns a single forecast by its UUID.
     *
     * @param id the UUID of the forecast
     * @return HTTP 200 with the matching {@link ForecastDto}
     */
    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ForecastDto> getForecastById(@PathVariable UUID id) {
        return ResponseEntity.ok(forecastService.getForecastById(id));
    }
}
