package com.bfmining.forecasting.dataset;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

/**
 * REST controller exposing dataset management endpoints under {@code /api/datasets}.
 * Handles file upload, listing, retrieval, and soft-deletion.
 */
@RestController
@RequestMapping("/api/datasets")
@RequiredArgsConstructor
public class DatasetController {

    /** Service handling dataset business logic. */
    private final DatasetService datasetService;

    /**
     * Uploads a new dataset file and registers it in the system.
     *
     * @param file      the multipart file to upload
     * @param principal the authenticated user principal
     * @return HTTP 201 with the created {@link DatasetDto}
     */
    @PostMapping("/upload")
    @PreAuthorize("hasAnyRole('ADMIN','ANALYST')")
    public ResponseEntity<DatasetDto> uploadDataset(
            @RequestParam("file") MultipartFile file,
            Principal principal) {
        UUID userId = UUID.fromString(principal.getName());
        DatasetDto dto = datasetService.uploadDataset(file, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    /**
     * Returns all non-deleted datasets.
     *
     * @return HTTP 200 with list of {@link DatasetDto}
     */
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<DatasetDto>> getAllDatasets() {
        return ResponseEntity.ok(datasetService.getAllDatasets());
    }

    /**
     * Returns a single dataset by its UUID.
     *
     * @param id the UUID of the dataset
     * @return HTTP 200 with the matching {@link DatasetDto}
     */
    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<DatasetDto> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(datasetService.getById(id));
    }

    /**
     * Soft-deletes a dataset by setting its status to DELETED.
     *
     * @param id the UUID of the dataset to delete
     * @return HTTP 204 No Content
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','ANALYST')")
    public ResponseEntity<Void> deleteDataset(@PathVariable UUID id) {
        datasetService.deleteDataset(id);
        return ResponseEntity.noContent().build();
    }
}
