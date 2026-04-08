CREATE TABLE forecasts (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id                  UUID        REFERENCES trained_models(id),
    horizon_months            INTEGER     NOT NULL,
    forecast_json             JSONB,
    confidence_intervals_json JSONB,
    created_by                UUID        REFERENCES users(id),
    created_at                TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_forecasts_model_id    ON forecasts(model_id);
CREATE INDEX idx_forecasts_created_by  ON forecasts(created_by);
