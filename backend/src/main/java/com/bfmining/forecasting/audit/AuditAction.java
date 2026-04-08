package com.bfmining.forecasting.audit;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marks a service method for automatic audit logging via {@link AuditAspect}.
 * The value specifies the action type recorded in the audit log.
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface AuditAction {
    /** The action type string stored in the audit_logs table. */
    String value();
}
