CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255)        NOT NULL,
    email       VARCHAR(255)        NOT NULL UNIQUE,
    password_hash VARCHAR(255)      NOT NULL,
    role        VARCHAR(50)         NOT NULL,
    is_active   BOOLEAN             NOT NULL DEFAULT TRUE,
    must_change_password BOOLEAN    NOT NULL DEFAULT FALSE,
    last_login  TIMESTAMP,
    created_at  TIMESTAMP           NOT NULL DEFAULT NOW(),
    created_by  UUID
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role  ON users(role);
