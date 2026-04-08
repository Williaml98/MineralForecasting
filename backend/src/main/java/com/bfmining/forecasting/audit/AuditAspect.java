package com.bfmining.forecasting.audit;

import com.bfmining.forecasting.user.User;
import lombok.RequiredArgsConstructor;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * AOP aspect that intercepts methods annotated with {@link AuditAction} and records
 * a corresponding entry in the audit log via {@link AuditService}.
 */
@Aspect
@Component
@RequiredArgsConstructor
public class AuditAspect {

    private final AuditService auditService;

    @AfterReturning(
            pointcut = "@annotation(auditAction)",
            returning = "result")
    public void logAudit(JoinPoint jp, AuditAction auditAction, Object result) {
        UUID userId = resolveUserId();
        Map<String, Object> detail = new HashMap<>();
        detail.put("method", jp.getSignature().getName());
        auditService.log(userId, auditAction.value(), detail);
    }

    private UUID resolveUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof User user) {
            return user.getId();
        }
        return null;
    }
}
