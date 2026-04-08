CREATE TABLE datasets (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255)    NOT NULL,
    source      VARCHAR(255),
    version     INTEGER         NOT NULL DEFAULT 1,
    uploaded_by UUID            REFERENCES users(id),
    uploaded_at TIMESTAMP       NOT NULL DEFAULT NOW(),
    row_count   INTEGER,
    status      VARCHAR(50)     NOT NULL DEFAULT 'PENDING',
    file_path   VARCHAR(1024)
);

CREATE INDEX idx_datasets_uploaded_by ON datasets(uploaded_by);
CREATE INDEX idx_datasets_status      ON datasets(status);
