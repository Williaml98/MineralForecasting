package com.bfmining.forecasting.preprocessing;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/**
 * Spring Data JPA repository for {@link PreprocessingPipeline} entities.
 * Provides standard CRUD operations plus custom query methods.
 */
@Repository
public interface PreprocessingPipelineRepository extends JpaRepository<PreprocessingPipeline, UUID> {

    /**
     * Returns pipelines created by the given user or associated with the given dataset.
     *
     * @param createdBy the UUID of the user who created the pipelines
     * @param datasetId the UUID of the dataset linked to the pipelines
     * @return list of matching pipelines
     */
    List<PreprocessingPipeline> findByCreatedByOrDatasetId(UUID createdBy, UUID datasetId);
}
