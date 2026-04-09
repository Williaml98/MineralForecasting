package com.bfmining.forecasting.audit;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * Service for persisting and querying audit log entries.
 */
@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository repo;

    /**
     * Persists a new audit log entry.
     *
     * @param userId     the ID of the user performing the action (may be null for system actions)
     * @param actionType the type of action (e.g. LOGIN, MODEL_TRAIN)
     * @param detail     optional map of additional details stored as JSON
     */
    public void log(UUID userId, String actionType, Map<String, Object> detail) {
        AuditLog entry = AuditLog.builder()
                .userId(userId)
                .actionType(actionType)
                .detail(detail)
                .ipAddress(IpHolder.get())
                .build();
        repo.save(entry);
    }

    /** Paginated search with optional filters. */
    public Page<AuditLog> search(UUID userId, String actionType,
                                  LocalDateTime from, LocalDateTime to,
                                  Pageable pageable) {
        // Pass userId as String so the native query can cast it via ::uuid
        String userIdStr = userId != null ? userId.toString() : null;
        return repo.search(userIdStr, actionType, from, to, pageable);
    }

    /** Returns summary statistics for the audit dashboard. */
    public Map<String, Object> summary() {
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        return Map.of(
                "totalEventsToday", repo.countByCreatedAtAfter(startOfDay),
                "loginsToday", repo.countLoginsSince(startOfDay),
                "totalEvents", repo.count()
        );
    }
}
