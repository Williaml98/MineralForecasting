package com.bfmining.forecasting.dataset;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/**
 * Spring Data JPA repository for {@link Dataset} entities.
 * Provides standard CRUD operations plus custom query methods.
 */
@Repository
public interface DatasetRepository extends JpaRepository<Dataset, UUID> {

    /**
     * Returns all datasets whose status is not equal to the provided status.
     * Typically used to exclude soft-deleted datasets from results.
     *
     * @param status the status to exclude from results
     * @return list of datasets that do not have the specified status
     */
    List<Dataset> findByStatusNot(DatasetStatus status);
}
