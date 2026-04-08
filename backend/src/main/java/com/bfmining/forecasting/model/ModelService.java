package com.bfmining.forecasting.model;

import com.bfmining.forecasting.audit.AuditAction;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service layer for managing trained model lifecycle operations including
 * training, activation, retrieval and deletion.
 */
@Service
@RequiredArgsConstructor
public class ModelService {

    /** Repository for persisting and querying {@link TrainedModel} entities. */
    private final TrainedModelRepository modelRepository;

    /**
     * Returns all trained models in the system.
     *
     * @return list of all model DTOs
     */
    public List<ModelDto> getAllModels() {
        return modelRepository.findAll()
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    /**
     * Retrieves a single trained model by its unique identifier.
     *
     * @param id the UUID of the model to retrieve
     * @return the model DTO
     * @throws EntityNotFoundException if no model with the given id exists
     */
    public ModelDto getModelById(UUID id) {
        TrainedModel model = modelRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Model not found with id: " + id));
        return toDto(model);
    }

    /**
     * Initiates training of a new model by creating a TrainedModel record
     * with status "TRAINING" and a randomly generated job identifier.
     *
     * @param req    the training request containing algorithm, dataset, and hyperparameters
     * @param userId the UUID of the user initiating training
     * @return the created model DTO
     */
    @AuditAction("MODEL_TRAIN")
    public ModelDto trainModel(TrainModelRequest req, UUID userId) {
        TrainedModel model = TrainedModel.builder()
                .name(req.getName())
                .algorithm(req.getAlgorithm())
                .datasetId(req.getDatasetId())
                .pipelineId(req.getPipelineId())
                .hyperparamsJson(req.getHyperparamsJson())
                .trainedBy(userId)
                .trainedAt(LocalDateTime.now())
                .jobId(UUID.randomUUID().toString())
                .status("TRAINING")
                .build();
        return toDto(modelRepository.save(model));
    }

    /**
     * Deactivates all existing models and activates the specified model.
     *
     * @param modelId the UUID of the model to activate
     * @return the activated model DTO
     * @throws EntityNotFoundException if no model with the given id exists
     */
    @AuditAction("MODEL_ACTIVATE")
    @Transactional
    public ModelDto activateModel(UUID modelId) {
        TrainedModel target = modelRepository.findById(modelId)
                .orElseThrow(() -> new EntityNotFoundException("Model not found with id: " + modelId));

        // Deactivate all currently active models
        List<TrainedModel> activeModels = modelRepository.findByIsActiveTrueOrderByTrainedAtDesc();
        activeModels.forEach(m -> m.setActive(false));
        modelRepository.saveAll(activeModels);

        // Activate the target model
        target.setActive(true);
        return toDto(modelRepository.save(target));
    }

    /**
     * Permanently deletes a trained model by its identifier.
     *
     * @param id the UUID of the model to delete
     * @throws EntityNotFoundException if no model with the given id exists
     */
    public void deleteModel(UUID id) {
        if (!modelRepository.existsById(id)) {
            throw new EntityNotFoundException("Model not found with id: " + id);
        }
        modelRepository.deleteById(id);
    }

    /**
     * Converts a {@link TrainedModel} entity to a {@link ModelDto}.
     *
     * @param model the entity to convert
     * @return the corresponding DTO
     */
    private ModelDto toDto(TrainedModel model) {
        return ModelDto.builder()
                .id(model.getId())
                .name(model.getName())
                .algorithm(model.getAlgorithm())
                .datasetId(model.getDatasetId())
                .pipelineId(model.getPipelineId())
                .hyperparamsJson(model.getHyperparamsJson())
                .metricsJson(model.getMetricsJson())
                .isActive(model.isActive())
                .trainedBy(model.getTrainedBy())
                .trainedAt(model.getTrainedAt())
                .version(model.getVersion())
                .jobId(model.getJobId())
                .status(model.getStatus())
                .build();
    }
}
