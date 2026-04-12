package com.bfmining.forecasting.model;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.bfmining.forecasting.user.User;
import org.springframework.security.core.annotation.AuthenticationPrincipal;

import java.util.List;
import java.util.UUID;

/**
 * REST controller exposing trained model management endpoints under
 * {@code /api/models}.
 */
@RestController
@RequestMapping("/api/models")
@RequiredArgsConstructor
public class ModelController {

    /** Service handling model business logic. */
    private final ModelService modelService;

    /**
     * Initiates training of a new model.
     *
     * @param request   the training request body
     * @param principal the authenticated user principal
     * @return HTTP 201 with the created {@link ModelDto}
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','ANALYST')")
    public ResponseEntity<ModelDto> trainModel(
            @Valid @RequestBody TrainModelRequest request,
            @AuthenticationPrincipal User currentUser) {
        ModelDto dto = modelService.trainModel(request, currentUser.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    /**
     * Returns all trained models.
     *
     * @return HTTP 200 with list of {@link ModelDto}
     */
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<ModelDto>> getAllModels() {
        return ResponseEntity.ok(modelService.getAllModels());
    }

    /**
     * Returns a single trained model by its UUID.
     *
     * @param id the UUID of the model
     * @return HTTP 200 with the matching {@link ModelDto}
     */
    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ModelDto> getModelById(@PathVariable UUID id) {
        return ResponseEntity.ok(modelService.getModelById(id));
    }

    /**
     * Activates the specified model, deactivating all others.
     *
     * @param id the UUID of the model to activate
     * @return HTTP 200 with the updated {@link ModelDto}
     */
    @PostMapping("/{id}/activate")
    @PreAuthorize("hasAnyRole('ADMIN','ANALYST')")
    public ResponseEntity<ModelDto> activateModel(@PathVariable UUID id) {
        return ResponseEntity.ok(modelService.activateModel(id));
    }

    /**
     * Permanently deletes a trained model.
     *
     * @param id the UUID of the model to delete
     * @return HTTP 204 No Content
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','ANALYST')")
    public ResponseEntity<Void> deleteModel(@PathVariable UUID id) {
        modelService.deleteModel(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Retrains an existing model with a new dataset and/or pipeline, preserving
     * the original algorithm and hyperparameters.
     *
     * @param id      the UUID of the model to retrain
     * @param request a request containing the new datasetId and pipelineId
     * @return HTTP 201 with the newly created {@link ModelDto}
     */
    @PostMapping("/{id}/retrain")
    @PreAuthorize("hasAnyRole('ADMIN','ANALYST')")
    public ResponseEntity<ModelDto> retrainModel(
            @PathVariable UUID id,
            @RequestBody RetrainModelRequest request,
            @AuthenticationPrincipal User currentUser) {
        ModelDto dto = modelService.retrainModel(id, request, currentUser.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }
}
