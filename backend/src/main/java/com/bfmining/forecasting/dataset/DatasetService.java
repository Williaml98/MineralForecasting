package com.bfmining.forecasting.dataset;

import com.bfmining.forecasting.audit.AuditAction;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service layer for managing dataset lifecycle operations including upload,
 * retrieval and soft-deletion.
 */
@Service
@RequiredArgsConstructor
public class DatasetService {

    /** Repository for persisting and querying {@link Dataset} entities. */
    private final DatasetRepository datasetRepository;

    /** Base filesystem path where uploaded dataset files are stored. */
    @Value("${app.storage.path}")
    private String storagePath;

    /**
     * Returns all datasets that have not been soft-deleted.
     *
     * @return list of non-deleted dataset DTOs
     */
    public List<DatasetDto> getAllDatasets() {
        return datasetRepository.findByStatusNot(DatasetStatus.DELETED)
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    /**
     * Retrieves a single dataset by its unique identifier.
     *
     * @param id the UUID of the dataset to retrieve
     * @return the dataset DTO
     * @throws EntityNotFoundException if no dataset with the given id exists
     */
    public DatasetDto getById(UUID id) {
        Dataset dataset = datasetRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Dataset not found with id: " + id));
        return toDto(dataset);
    }

    /**
     * Stores an uploaded file and creates a corresponding Dataset entity.
     * The row count is estimated from the file size.
     *
     * @param file   the multipart file uploaded by the user
     * @param userId the UUID of the user performing the upload
     * @return the created dataset DTO
     * @throws RuntimeException if the file cannot be written to disk
     */
    @AuditAction("DATASET_UPLOAD")
    public DatasetDto uploadDataset(MultipartFile file, UUID userId) {
        try {
            Path storageDir = Paths.get(storagePath);
            if (!Files.exists(storageDir)) {
                Files.createDirectories(storageDir);
            }

            String originalFilename = file.getOriginalFilename() != null
                    ? file.getOriginalFilename()
                    : "dataset_" + UUID.randomUUID();

            Path filePath = storageDir.resolve(UUID.randomUUID() + "_" + originalFilename);
            file.transferTo(filePath.toFile());

            // Rough row estimate: assume average row ~200 bytes
            int estimatedRows = (int) Math.max(1, file.getSize() / 200);

            Dataset dataset = Dataset.builder()
                    .name(originalFilename)
                    .source("UPLOAD")
                    .uploadedBy(userId)
                    .uploadedAt(LocalDateTime.now())
                    .rowCount(estimatedRows)
                    .status(DatasetStatus.VALIDATED)
                    .filePath(filePath.toString())
                    .build();

            return toDto(datasetRepository.save(dataset));
        } catch (IOException e) {
            throw new RuntimeException("Failed to store uploaded dataset file", e);
        }
    }

    /**
     * Soft-deletes a dataset by setting its status to {@code DELETED}.
     *
     * @param id the UUID of the dataset to delete
     * @throws EntityNotFoundException if no dataset with the given id exists
     */
    @AuditAction("DATASET_DELETE")
    public void deleteDataset(UUID id) {
        Dataset dataset = datasetRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Dataset not found with id: " + id));
        dataset.setStatus(DatasetStatus.DELETED);
        datasetRepository.save(dataset);
    }

    /**
     * Converts a {@link Dataset} entity to a {@link DatasetDto}.
     *
     * @param dataset the entity to convert
     * @return the corresponding DTO
     */
    private DatasetDto toDto(Dataset dataset) {
        boolean hasFile = dataset.getFilePath() != null
                && Files.exists(Paths.get(dataset.getFilePath()));
        return DatasetDto.builder()
                .id(dataset.getId())
                .name(dataset.getName())
                .source(dataset.getSource())
                .version(dataset.getVersion())
                .uploadedBy(dataset.getUploadedBy())
                .uploadedAt(dataset.getUploadedAt())
                .rowCount(dataset.getRowCount())
                .status(dataset.getStatus())
                .filePath(dataset.getFilePath())
                .hasFile(hasFile)
                .build();
    }
}
