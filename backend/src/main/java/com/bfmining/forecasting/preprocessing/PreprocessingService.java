package com.bfmining.forecasting.preprocessing;

import com.bfmining.forecasting.audit.AuditAction;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service layer for managing preprocessing pipeline lifecycle operations.
 * Handles creation, retrieval, and execution of pipelines.
 */
@Service
@RequiredArgsConstructor
public class PreprocessingService {

    /** Repository for persisting and querying {@link PreprocessingPipeline} entities. */
    private final PreprocessingPipelineRepository pipelineRepository;

    /**
     * Returns all preprocessing pipelines in the system.
     *
     * @return list of all pipeline DTOs
     */
    public List<PipelineDto> getAllPipelines() {
        return pipelineRepository.findAll()
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    /**
     * Retrieves a single pipeline by its unique identifier.
     *
     * @param id the UUID of the pipeline to retrieve
     * @return the pipeline DTO
     * @throws EntityNotFoundException if no pipeline with the given id exists
     */
    public PipelineDto getPipelineById(UUID id) {
        PreprocessingPipeline pipeline = pipelineRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Pipeline not found with id: " + id));
        return toDto(pipeline);
    }

    /**
     * Creates a new preprocessing pipeline from the provided request.
     *
     * @param req    the creation request containing name, dataset id and config JSON
     * @param userId the UUID of the user creating the pipeline
     * @return the created pipeline DTO
     */
    @AuditAction("PIPELINE_CREATE")
    public PipelineDto createPipeline(CreatePipelineRequest req, UUID userId) {
        PreprocessingPipeline pipeline = PreprocessingPipeline.builder()
                .name(req.getName())
                .datasetId(req.getDatasetId())
                .configJson(req.getConfigJson())
                .createdBy(userId)
                .createdAt(LocalDateTime.now())
                .build();
        return toDto(pipelineRepository.save(pipeline));
    }

    /**
     * Executes a pipeline by setting its status to "COMPLETED".
     * In a production system this would trigger an actual processing job.
     *
     * @param pipelineId the UUID of the pipeline to run
     * @param userId     the UUID of the user triggering the run
     * @return the updated pipeline DTO
     * @throws EntityNotFoundException if no pipeline with the given id exists
     */
    @AuditAction("PIPELINE_RUN")
    public PipelineDto runPipeline(UUID pipelineId, UUID userId) {
        PreprocessingPipeline pipeline = pipelineRepository.findById(pipelineId)
                .orElseThrow(() -> new EntityNotFoundException("Pipeline not found with id: " + pipelineId));
        pipeline.setStatus("COMPLETED");
        return toDto(pipelineRepository.save(pipeline));
    }

    /**
     * Converts a {@link PreprocessingPipeline} entity to a {@link PipelineDto}.
     *
     * @param pipeline the entity to convert
     * @return the corresponding DTO
     */
    private PipelineDto toDto(PreprocessingPipeline pipeline) {
        return PipelineDto.builder()
                .id(pipeline.getId())
                .name(pipeline.getName())
                .datasetId(pipeline.getDatasetId())
                .configJson(pipeline.getConfigJson())
                .createdBy(pipeline.getCreatedBy())
                .createdAt(pipeline.getCreatedAt())
                .version(pipeline.getVersion())
                .status(pipeline.getStatus())
                .build();
    }
}
