import uuid
from datetime import datetime, timedelta
from typing import Any

import joblib
import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from utils.explainability import get_prophet_components, get_shap_values

router = APIRouter()


# ── Pydantic models ───────────────────────────────────────────────────────────

class ForecastPoint(BaseModel):
    date: str
    value: float
    lower_80: float
    upper_80: float
    lower_95: float
    upper_95: float


class ForecastResponse(BaseModel):
    forecast_id: str
    model: str
    horizon_months: int
    data: list[ForecastPoint]


class GenerateRequest(BaseModel):
    model_path: str
    horizon_months: int
    last_date: str


class ScenarioRequest(BaseModel):
    model_path: str
    horizon_months: int
    last_date: str
    demand_growth_rate: float = 0.0
    price_factor: float = 1.0
    production_factor: float = 1.0
    export_factor: float = 1.0
    policy_factor: float = 1.0


# ── Helpers ───────────────────────────────────────────────────────────────────

def _detect_model_type(model_path: str) -> str:
    lower = model_path.lower()
    if "arima" in lower:
        return "ARIMA"
    if "prophet" in lower:
        return "Prophet"
    if "lstm" in lower:
        return "LSTM"
    return "Unknown"


def _load_model(model_path: str):
    try:
        return joblib.load(model_path)
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=404, detail=f"Model file not found: {model_path}"
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500, detail=f"Failed to load model: {exc}"
        ) from exc


def _build_future_dates(last_date: str, horizon_months: int) -> list[str]:
    start = pd.to_datetime(last_date) + pd.DateOffset(months=1)
    return [
        (start + pd.DateOffset(months=i)).strftime("%Y-%m-%d")
        for i in range(horizon_months)
    ]


def _generate_forecast_data(model, model_type: str, horizon_months: int, last_date: str) -> list[ForecastPoint]:
    dates = _build_future_dates(last_date, horizon_months)

    if model_type == "ARIMA":
        values = model.predict(horizon_months)
        points = []
        for date, val in zip(dates, values):
            std_est = abs(val) * 0.05 + 1e-6
            points.append(
                ForecastPoint(
                    date=date,
                    value=round(float(val), 4),
                    lower_80=round(float(val - 1.28 * std_est), 4),
                    upper_80=round(float(val + 1.28 * std_est), 4),
                    lower_95=round(float(val - 1.96 * std_est), 4),
                    upper_95=round(float(val + 1.96 * std_est), 4),
                )
            )
        return points

    if model_type == "Prophet":
        forecast_df = model.predict(periods=horizon_months, freq="MS")
        points = []
        for _, row in forecast_df.tail(horizon_months).iterrows():
            points.append(
                ForecastPoint(
                    date=pd.Timestamp(row["ds"]).strftime("%Y-%m-%d"),
                    value=round(float(row["yhat"]), 4),
                    lower_80=round(float(row.get("yhat_lower", row["yhat"] * 0.9)), 4),
                    upper_80=round(float(row.get("yhat_upper", row["yhat"] * 1.1)), 4),
                    lower_95=round(float(row.get("yhat_lower", row["yhat"] * 0.85)), 4),
                    upper_95=round(float(row.get("yhat_upper", row["yhat"] * 1.15)), 4),
                )
            )
        return points

    if model_type == "LSTM":
        values = model.predict(horizon_months)
        points = []
        for date, val in zip(dates, values):
            std_est = abs(val) * 0.05 + 1e-6
            points.append(
                ForecastPoint(
                    date=date,
                    value=round(float(val), 4),
                    lower_80=round(float(val - 1.28 * std_est), 4),
                    upper_80=round(float(val + 1.28 * std_est), 4),
                    lower_95=round(float(val - 1.96 * std_est), 4),
                    upper_95=round(float(val + 1.96 * std_est), 4),
                )
            )
        return points

    raise HTTPException(status_code=422, detail=f"Unsupported model type: {model_type}")


def _apply_scenario(
    data: list[ForecastPoint],
    demand_growth_rate: float,
    price_factor: float,
    production_factor: float,
    export_factor: float,
    policy_factor: float,
) -> list[ForecastPoint]:
    combined_factor = (
        (1.0 + demand_growth_rate)
        * price_factor
        * production_factor
        * export_factor
        * policy_factor
    )
    adjusted = []
    for i, point in enumerate(data):
        # Compound growth applied month by month
        monthly_factor = combined_factor ** (i + 1)
        adjusted.append(
            ForecastPoint(
                date=point.date,
                value=round(point.value * monthly_factor, 4),
                lower_80=round(point.lower_80 * monthly_factor, 4),
                upper_80=round(point.upper_80 * monthly_factor, 4),
                lower_95=round(point.lower_95 * monthly_factor, 4),
                upper_95=round(point.upper_95 * monthly_factor, 4),
            )
        )
    return adjusted


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/generate", response_model=ForecastResponse)
async def generate_forecast(request: GenerateRequest):
    model = _load_model(request.model_path)
    model_type = _detect_model_type(request.model_path)
    data = _generate_forecast_data(model, model_type, request.horizon_months, request.last_date)
    return ForecastResponse(
        forecast_id=str(uuid.uuid4()),
        model=model_type,
        horizon_months=request.horizon_months,
        data=data,
    )


@router.post("/scenario", response_model=ForecastResponse)
async def scenario_forecast(request: ScenarioRequest):
    model = _load_model(request.model_path)
    model_type = _detect_model_type(request.model_path)
    base_data = _generate_forecast_data(model, model_type, request.horizon_months, request.last_date)
    adjusted_data = _apply_scenario(
        base_data,
        request.demand_growth_rate,
        request.price_factor,
        request.production_factor,
        request.export_factor,
        request.policy_factor,
    )
    return ForecastResponse(
        forecast_id=str(uuid.uuid4()),
        model=f"{model_type} (scenario)",
        horizon_months=request.horizon_months,
        data=adjusted_data,
    )


@router.get("/explain/{model_id}")
async def explain_model(model_id: str) -> dict[str, Any]:
    """
    Returns a lightweight explanation dict.
    model_id is expected to be the filename stem (e.g. 'arima_job123').
    A full model path can also be passed as a query param in a real scenario;
    here we return structural information based on model type.
    """
    lower = model_id.lower()
    if "arima" in lower:
        return {
            "model_type": "ARIMA",
            "explanation_type": "statistical",
            "components": ["autoregressive", "integrated", "moving_average"],
            "feature_importance": {},
            "note": "ARIMA uses past values and error terms for forecasting.",
        }
    if "prophet" in lower:
        return {
            "model_type": "Prophet",
            "explanation_type": "additive_decomposition",
            "components": ["trend", "seasonality", "holidays"],
            "feature_importance": {},
            "note": "Prophet decomposes the time series into interpretable components.",
        }
    if "lstm" in lower:
        return {
            "model_type": "LSTM",
            "explanation_type": "neural_network",
            "components": ["input_sequence", "hidden_state", "output"],
            "feature_importance": {},
            "note": "LSTM captures long-range temporal dependencies via gated memory cells.",
        }
    return {
        "model_type": "Unknown",
        "explanation_type": "n/a",
        "components": [],
        "feature_importance": {},
    }
