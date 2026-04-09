package com.bfmining.forecasting.scenario;

import com.bfmining.forecasting.audit.AuditAction;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service layer for managing forecast scenario lifecycle operations.
 * Handles creation, retrieval, and annotation of scenarios.
 */
@Service
@RequiredArgsConstructor
public class ScenarioService {

    /** Repository for persisting and querying {@link Scenario} entities. */
    private final ScenarioRepository scenarioRepository;

    /**
     * Returns all scenarios ordered by creation timestamp descending.
     *
     * @return list of all scenario DTOs, newest first
     */
    public List<ScenarioDto> getAllScenarios() {
        return scenarioRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    /**
     * Retrieves a single scenario by its unique identifier.
     *
     * @param id the UUID of the scenario to retrieve
     * @return the scenario DTO
     * @throws EntityNotFoundException if no scenario with the given id exists
     */
    public ScenarioDto getScenarioById(UUID id) {
        Scenario scenario = scenarioRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Scenario not found with id: " + id));
        return toDto(scenario);
    }

    /**
     * Creates a new forecast scenario from the provided request.
     *
     * @param req    the creation request containing name, base forecast id and parameters
     * @param userId the UUID of the user creating the scenario
     * @return the created scenario DTO
     */
    @AuditAction("SCENARIO_CREATE")
    public ScenarioDto createScenario(CreateScenarioRequest req, UUID userId) {
        Scenario scenario = Scenario.builder()
                .name(req.getName())
                .baseForecastId(req.getBaseForecastId())
                .parametersJson(req.getParametersJson() != null ? req.getParametersJson() : "{}")
                .notes(req.getNotes())
                .createdBy(userId)
                .createdAt(LocalDateTime.now())
                .build();
        return toDto(scenarioRepository.save(scenario));
    }

    /**
     * Permanently deletes a scenario by its unique identifier.
     *
     * @param id the UUID of the scenario to delete
     * @throws EntityNotFoundException if no scenario with the given id exists
     */
    public void deleteScenario(UUID id) {
        if (!scenarioRepository.existsById(id)) {
            throw new EntityNotFoundException("Scenario not found with id: " + id);
        }
        scenarioRepository.deleteById(id);
    }

    /**
     * Annotates an existing scenario with notes and an optional review flag.
     *
     * @param id  the UUID of the scenario to annotate
     * @param req the annotation request containing notes and review flag
     * @return the updated scenario DTO
     * @throws EntityNotFoundException if no scenario with the given id exists
     */
    public ScenarioDto annotateScenario(UUID id, AnnotateScenarioRequest req) {
        Scenario scenario = scenarioRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Scenario not found with id: " + id));
        scenario.setNotes(req.getNotes());
        scenario.setFlaggedForReview(req.isFlagForReview());
        return toDto(scenarioRepository.save(scenario));
    }

    /**
     * Converts a {@link Scenario} entity to a {@link ScenarioDto}.
     *
     * @param scenario the entity to convert
     * @return the corresponding DTO
     */
    private ScenarioDto toDto(Scenario scenario) {
        return ScenarioDto.builder()
                .id(scenario.getId())
                .name(scenario.getName())
                .baseForecastId(scenario.getBaseForecastId())
                .parametersJson(scenario.getParametersJson())
                .resultJson(scenario.getResultJson())
                .notes(scenario.getNotes())
                .flaggedForReview(scenario.isFlaggedForReview())
                .createdBy(scenario.getCreatedBy())
                .createdAt(scenario.getCreatedAt())
                .build();
    }
}
