package com.bfmining.forecasting.audit;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Spring Data JPA repository for {@link AuditLog} entities.
 */
@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {

    /**
     * Native query avoids PostgreSQL "could not determine data type of parameter"
     * error that occurs when null UUID/timestamp params are passed in JPQL with
     * the (:param IS NULL OR ...) pattern.
     */
    @Query(value = """
        SELECT * FROM audit_logs
        WHERE (CAST(:userId AS uuid) IS NULL OR user_id = CAST(:userId AS uuid))
          AND (:actionType IS NULL OR action_type = :actionType)
          AND (CAST(:dateFrom AS timestamp) IS NULL OR created_at >= CAST(:dateFrom AS timestamp))
          AND (CAST(:dateTo AS timestamp) IS NULL OR created_at <= CAST(:dateTo AS timestamp))
        ORDER BY created_at DESC
        """,
        countQuery = """
        SELECT COUNT(*) FROM audit_logs
        WHERE (CAST(:userId AS uuid) IS NULL OR user_id = CAST(:userId AS uuid))
          AND (:actionType IS NULL OR action_type = :actionType)
          AND (CAST(:dateFrom AS timestamp) IS NULL OR created_at >= CAST(:dateFrom AS timestamp))
          AND (CAST(:dateTo AS timestamp) IS NULL OR created_at <= CAST(:dateTo AS timestamp))
        """,
        nativeQuery = true)
    Page<AuditLog> search(
            @Param("userId") String userId,
            @Param("actionType") String actionType,
            @Param("dateFrom") LocalDateTime from,
            @Param("dateTo") LocalDateTime to,
            Pageable pageable);

    long countByCreatedAtAfter(LocalDateTime since);

    @Query("SELECT COUNT(a) FROM AuditLog a WHERE a.actionType = 'LOGIN' AND a.createdAt >= :since")
    long countLoginsSince(@Param("since") LocalDateTime since);
}
