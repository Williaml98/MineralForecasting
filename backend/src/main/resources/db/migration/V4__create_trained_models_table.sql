CREATE TABLE trained_models (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name             VARCHAR(255)    NOT NULL,
    algorithm        VARCHAR(50)     NOT NULL,
    dataset_id       UUID            REFERENCES datasets(id),
    pipeline_id      UUID            REFERENCES preprocessing_pipelines(id),
    hyperparams_json JSONB           NOT NULL DEFAULT '{}',
    metrics_json     JSONB,
    is_active        BOOLEAN         NOT NULL DEFAULT FALSE,
    trained_by       UUID            REFERENCES users(id),
    trained_at       TIMESTAMP,
    version          INTEGER         NOT NULL DEFAULT 1,
    job_id           VARCHAR(255),
    status           VARCHAR(50)     NOT NULL DEFAULT 'PENDING'
);

CREATE INDEX idx_models_dataset_id ON trained_models(dataset_id);
CREATE INDEX idx_models_is_active  ON trained_models(is_active);
CREATE INDEX idx_models_algorithm  ON trained_models(algorithm);
