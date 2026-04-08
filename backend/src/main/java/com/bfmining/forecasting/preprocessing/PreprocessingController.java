package com.bfmining.forecasting.preprocessing;

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
 * REST controller exposing preprocessing pipeline endpoints under
 * {@code /api/preprocessing/pipelines}.
 */
@RestController
@RequestMapping("/api/preprocessing/pipelines")
@RequiredArgsConstructor
public class PreprocessingController {

    /** Service handling pipeline business logic. */
    private final PreprocessingService preprocessingService;

    /**
     * Creates a new preprocessing pipeline.
     *
     * @param request   the creation request body
     * @param principal the authenticated user principal
     * @return HTTP 201 with the created {@link PipelineDto}
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','ANALYST')")
    public ResponseEntity<PipelineDto> createPipeline(
            @Valid @RequestBody CreatePipelineRequest request,
            Principal principal) {
        UUID userId = UUID.fromString(principal.getName());
        PipelineDto dto = preprocessingService.createPipeline(request, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    /**
     * Returns all preprocessing pipelines.
     *
     * @return HTTP 200 with list of {@link PipelineDto}
     */
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<PipelineDto>> getAllPipelines() {
        return ResponseEntity.ok(preprocessingService.getAllPipelines());
    }

    /**
     * Returns a single preprocessing pipeline by its UUID.
     *
     * @param id the UUID of the pipeline
     * @return HTTP 200 with the matching {@link PipelineDto}
     */
    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<PipelineDto> getPipelineById(@PathVariable UUID id) {
        return ResponseEntity.ok(preprocessingService.getPipelineById(id));
    }

    /**
     * Executes a preprocessing pipeline.
     *
     * @param pipelineId the UUID of the pipeline to run
     * @param principal  the authenticated user principal
     * @return HTTP 200 with the updated {@link PipelineDto}
     */
    @PostMapping("/run/{pipelineId}")
    @PreAuthorize("hasAnyRole('ADMIN','ANALYST')")
    public ResponseEntity<PipelineDto> runPipeline(
            @PathVariable UUID pipelineId,
            Principal principal) {
        UUID userId = UUID.fromString(principal.getName());
        return ResponseEntity.ok(preprocessingService.runPipeline(pipelineId, userId));
    }
}
