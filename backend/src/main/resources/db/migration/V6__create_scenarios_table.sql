CREATE TABLE scenarios (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name             VARCHAR(255)    NOT NULL,
    base_forecast_id UUID            REFERENCES forecasts(id),
    parameters_json  JSONB           NOT NULL DEFAULT '{}',
    result_json      JSONB,
    notes            TEXT,
    flagged_for_review BOOLEAN       NOT NULL DEFAULT FALSE,
    created_by       UUID            REFERENCES users(id),
    created_at       TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_scenarios_base_forecast_id ON scenarios(base_forecast_id);
CREATE INDEX idx_scenarios_created_by       ON scenarios(created_by);
