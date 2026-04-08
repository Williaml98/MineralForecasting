CREATE TABLE audit_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID            REFERENCES users(id),
    action_type VARCHAR(100)    NOT NULL,
    entity_type VARCHAR(100),
    entity_id   UUID,
    detail_json JSONB,
    ip_address  VARCHAR(50),
    created_at  TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_user_id     ON audit_logs(user_id);
CREATE INDEX idx_audit_action_type ON audit_logs(action_type);
CREATE INDEX idx_audit_created_at  ON audit_logs(created_at);
