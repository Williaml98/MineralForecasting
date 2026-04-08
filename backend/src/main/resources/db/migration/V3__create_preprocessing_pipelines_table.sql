CREATE TABLE preprocessing_pipelines (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255)    NOT NULL,
    dataset_id  UUID            REFERENCES datasets(id),
    config_json JSONB           NOT NULL DEFAULT '{}',
    created_by  UUID            REFERENCES users(id),
    created_at  TIMESTAMP       NOT NULL DEFAULT NOW(),
    version     INTEGER         NOT NULL DEFAULT 1,
    status      VARCHAR(50)     NOT NULL DEFAULT 'DRAFT'
);

CREATE INDEX idx_pipelines_dataset_id  ON preprocessing_pipelines(dataset_id);
CREATE INDEX idx_pipelines_created_by  ON preprocessing_pipelines(created_by);
