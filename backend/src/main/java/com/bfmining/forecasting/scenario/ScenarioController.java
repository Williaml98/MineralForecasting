package com.bfmining.forecasting.scenario;

import com.bfmining.forecasting.user.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * REST controller exposing forecast scenario endpoints under {@code /api/scenarios}.
 * Handles scenario creation, retrieval, and annotation.
 */
@RestController
@RequestMapping("/api/scenarios")
@RequiredArgsConstructor
public class ScenarioController {

    /** Service handling scenario business logic. */
    private final ScenarioService scenarioService;

    /**
     * Creates a new forecast scenario.
     *
     * @param request   the creation request body
     * @param principal the authenticated user principal
     * @return HTTP 201 with the created {@link ScenarioDto}
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','STRATEGIST','ANALYST')")
    public ResponseEntity<ScenarioDto> createScenario(
            @Valid @RequestBody CreateScenarioRequest request,
            @AuthenticationPrincipal User currentUser) {
        ScenarioDto dto = scenarioService.createScenario(request, currentUser.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    /**
     * Returns all scenarios ordered by creation date descending.
     *
     * @return HTTP 200 with list of {@link ScenarioDto}
     */
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<ScenarioDto>> getAllScenarios() {
        return ResponseEntity.ok(scenarioService.getAllScenarios());
    }

    /**
     * Returns a single scenario by its UUID.
     *
     * @param id the UUID of the scenario
     * @return HTTP 200 with the matching {@link ScenarioDto}
     */
    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ScenarioDto> getScenarioById(@PathVariable UUID id) {
        return ResponseEntity.ok(scenarioService.getScenarioById(id));
    }

    /**
     * Deletes a scenario permanently.
     *
     * @param id the UUID of the scenario to delete
     * @return HTTP 204 No Content
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','STRATEGIST','ANALYST')")
    public ResponseEntity<Void> deleteScenario(@PathVariable UUID id) {
        scenarioService.deleteScenario(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Annotates an existing scenario with notes and a review flag.
     *
     * @param id      the UUID of the scenario to annotate
     * @param request the annotation request body
     * @return HTTP 200 with the updated {@link ScenarioDto}
     */
    @PostMapping("/{id}/annotate")
    @PreAuthorize("hasAnyRole('ADMIN','STRATEGIST')")
    public ResponseEntity<ScenarioDto> annotateScenario(
            @PathVariable UUID id,
            @RequestBody AnnotateScenarioRequest request) {
        return ResponseEntity.ok(scenarioService.annotateScenario(id, request));
    }
}
