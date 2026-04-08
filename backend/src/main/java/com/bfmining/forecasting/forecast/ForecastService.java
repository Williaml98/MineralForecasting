package com.bfmining.forecasting.forecast;

import com.bfmining.forecasting.audit.AuditAction;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service layer for managing forecast generation and retrieval.
 * In the current implementation, forecast data is stubbed as an empty JSON array.
 * A production implementation would delegate to an ML microservice via WebClient.
 */
@Service
@RequiredArgsConstructor
public class ForecastService {

    /** Repository for persisting and querying {@link Forecast} entities. */
    private final ForecastRepository forecastRepository;

    /**
     * Returns all forecasts ordered by creation timestamp descending.
     *
     * @return list of all forecast DTOs, newest first
     */
    public List<ForecastDto> getAllForecasts() {
        return forecastRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    /**
     * Retrieves a single forecast by its unique identifier.
     *
     * @param id the UUID of the forecast to retrieve
     * @return the forecast DTO
     * @throws EntityNotFoundException if no forecast with the given id exists
     */
    public ForecastDto getForecastById(UUID id) {
        Forecast forecast = forecastRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Forecast not found with id: " + id));
        return toDto(forecast);
    }

    /**
     * Generates a new forecast using the specified model and horizon.
     * The forecastJson is currently stubbed as an empty array; in a real system
     * this would invoke an ML service via WebClient and await results.
     *
     * @param req    the generation request containing model id and horizon months
     * @param userId the UUID of the user requesting the forecast
     * @return the created forecast DTO
     */
    @AuditAction("FORECAST_GENERATE")
    public ForecastDto generateForecast(GenerateForecastRequest req, UUID userId) {
        // Stub: In production, call ML service via WebClient to obtain forecastJson
        Forecast forecast = Forecast.builder()
                .modelId(req.getModelId())
                .horizonMonths(req.getHorizonMonths())
                .forecastJson("[]")
                .confidenceIntervalsJson("[]")
                .createdBy(userId)
                .createdAt(LocalDateTime.now())
                .build();
        return toDto(forecastRepository.save(forecast));
    }

    /**
     * Converts a {@link Forecast} entity to a {@link ForecastDto}.
     *
     * @param forecast the entity to convert
     * @return the corresponding DTO
     */
    private ForecastDto toDto(Forecast forecast) {
        return ForecastDto.builder()
                .id(forecast.getId())
                .modelId(forecast.getModelId())
                .horizonMonths(forecast.getHorizonMonths())
                .forecastJson(forecast.getForecastJson())
                .confidenceIntervalsJson(forecast.getConfidenceIntervalsJson())
                .createdBy(forecast.getCreatedBy())
                .createdAt(forecast.getCreatedAt())
                .build();
    }
}
