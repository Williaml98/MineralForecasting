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

    private final TrainedModelRepository modelRepository;

    /** Separate bean used to run async training simulation without self-invocation issues. */
    private final TrainingSimulator trainingSimulator;

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
     * Initiates training of a new model. Saves the record with status "TRAINING",
     * then triggers async simulation that transitions it to "TRAINED" after a delay.
     *
     * @param req    the training request containing algorithm, dataset, and hyperparameters
     * @param userId the UUID of the user initiating training
     * @return the created model DTO with status "TRAINING"
     * @throws IllegalArgumentException if a model with the same name already exists
     */
    @AuditAction("MODEL_TRAIN")
    public ModelDto trainModel(TrainModelRequest req, UUID userId) {
        if (modelRepository.existsByName(req.getName())) {
            throw new IllegalArgumentException(
                    "A model named \"" + req.getName() + "\" already exists. Please choose a different name.");
        }

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

        TrainedModel saved = modelRepository.save(model);

        // Delegate to a separate bean so @Async proxy is properly applied
        trainingSimulator.callMlServiceAndComplete(saved.getId());

        return toDto(saved);
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

        List<TrainedModel> activeModels = modelRepository.findByIsActiveTrueOrderByTrainedAtDesc();
        activeModels.forEach(m -> m.setActive(false));
        modelRepository.saveAll(activeModels);

        target.setActive(true);
        return toDto(modelRepository.save(target));
    }

    /**
     * Retrains an existing model using new (or the same) dataset/pipeline while
     * preserving the original algorithm and hyperparameters. Creates a new model
     * record so the original is kept for comparison.
     *
     * @param sourceId the UUID of the model to base retraining on
     * @param req      the retrain request with optional new datasetId/pipelineId
     * @param userId   the UUID of the user requesting retraining
     * @return the newly created model DTO with status "TRAINING"
     * @throws EntityNotFoundException if the source model does not exist
     */
    @AuditAction("MODEL_TRAIN")
    public ModelDto retrainModel(UUID sourceId, RetrainModelRequest req, UUID userId) {
        TrainedModel source = modelRepository.findById(sourceId)
                .orElseThrow(() -> new EntityNotFoundException("Model not found with id: " + sourceId));

        String suffix = (req.getNameSuffix() != null && !req.getNameSuffix().isBlank())
                ? req.getNameSuffix()
                : "retrained";
        String newName = source.getName() + " (" + suffix + ")";

        // Ensure unique name by appending a counter if needed
        int counter = 1;
        String candidateName = newName;
        while (modelRepository.existsByName(candidateName)) {
            candidateName = newName + " " + counter++;
        }

        TrainedModel retrained = TrainedModel.builder()
                .name(candidateName)
                .algorithm(source.getAlgorithm())
                .datasetId(req.getDatasetId() != null ? req.getDatasetId() : source.getDatasetId())
                .pipelineId(req.getPipelineId() != null ? req.getPipelineId() : source.getPipelineId())
                .hyperparamsJson(source.getHyperparamsJson())
                .trainedBy(userId)
                .trainedAt(LocalDateTime.now())
                .jobId(UUID.randomUUID().toString())
                .status("TRAINING")
                .build();

        TrainedModel saved = modelRepository.save(retrained);
        trainingSimulator.callMlServiceAndComplete(saved.getId());
        return toDto(saved);
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
                .modelPath(model.getModelPath())
                .build();
    }
}
