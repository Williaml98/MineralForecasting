import os
from typing import Any

import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from models.arima_model import ArimaModel
from models.ets_model import ETSModel
from models.lstm_model import LstmModel

router = APIRouter()

# Simple in-memory job store
_jobs: dict[str, dict[str, Any]] = {}

SAVED_MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "saved_models")
os.makedirs(SAVED_MODELS_DIR, exist_ok=True)


# ── Pydantic models ───────────────────────────────────────────────────────────

class MetricsModel(BaseModel):
    mae: float
    rmse: float
    mape: float


class TrainingResponse(BaseModel):
    job_id: str
    status: str  # "completed" | "failed"
    metrics: MetricsModel
    model_path: str


class ArimaTrainRequest(BaseModel):
    job_id: str
    data: list[dict[str, Any]]
    date_col: str
    value_col: str
    order: list[int] = [1, 1, 1]  # p, d, q


class ETSTrainRequest(BaseModel):
    job_id: str
    data: list[dict[str, Any]]
    date_col: str
    value_col: str
    seasonal_periods: int = 12


class LstmTrainRequest(BaseModel):
    job_id: str
    data: list[dict[str, Any]]
    date_col: str
    value_col: str
    epochs: int = 50
    units: int = 64


# ── Helpers ───────────────────────────────────────────────────────────────────

def _model_path(job_id: str, model_type: str) -> str:
    return os.path.join(SAVED_MODELS_DIR, f"{model_type}_{job_id}.joblib")


def _record_job(job_id: str, status: str, metrics: dict, model_path: str) -> None:
    _jobs[job_id] = {
        "job_id": job_id,
        "status": status,
        "metrics": metrics,
        "model_path": model_path,
    }


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/arima", response_model=TrainingResponse)
async def train_arima(request: ArimaTrainRequest):
    path = _model_path(request.job_id, "arima")
    try:
        df = pd.DataFrame(request.data)
        series = pd.Series(
            df[request.value_col].values,
            index=pd.to_datetime(df[request.date_col]),
            name=request.value_col,
        )
        order = tuple(request.order) if len(request.order) == 3 else (1, 1, 1)
        model = ArimaModel(order=order)
        metrics = model.fit(series)
        model.save(path)
        _record_job(request.job_id, "completed", metrics, path)
        return TrainingResponse(
            job_id=request.job_id,
            status="completed",
            metrics=MetricsModel(**metrics),
            model_path=path,
        )
    except Exception as exc:
        _record_job(request.job_id, "failed", {"mae": 0.0, "rmse": 0.0, "mape": 0.0}, "")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/ets", response_model=TrainingResponse)
async def train_ets(request: ETSTrainRequest):
    path = _model_path(request.job_id, "ets")
    try:
        df = pd.DataFrame(request.data)
        series = pd.Series(
            df[request.value_col].values,
            index=pd.to_datetime(df[request.date_col]),
            name=request.value_col,
        )
        model = ETSModel(seasonal_periods=request.seasonal_periods)
        metrics = model.fit(series)
        model.save(path)
        _record_job(request.job_id, "completed", metrics, path)
        return TrainingResponse(
            job_id=request.job_id,
            status="completed",
            metrics=MetricsModel(**metrics),
            model_path=path,
        )
    except Exception as exc:
        _record_job(request.job_id, "failed", {"mae": 0.0, "rmse": 0.0, "mape": 0.0}, "")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/lstm", response_model=TrainingResponse)
async def train_lstm(request: LstmTrainRequest):
    path = _model_path(request.job_id, "lstm")
    try:
        df = pd.DataFrame(request.data)
        series = pd.Series(
            df[request.value_col].values,
            index=pd.to_datetime(df[request.date_col]),
            name=request.value_col,
        )
        model = LstmModel(units=request.units, epochs=request.epochs)
        metrics = model.fit(series)
        model.save(path)
        _record_job(request.job_id, "completed", metrics, path)
        return TrainingResponse(
            job_id=request.job_id,
            status="completed",
            metrics=MetricsModel(**metrics),
            model_path=path,
        )
    except Exception as exc:
        _record_job(request.job_id, "failed", {"mae": 0.0, "rmse": 0.0, "mape": 0.0}, "")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/status/{job_id}")
async def job_status(job_id: str) -> dict[str, Any]:
    if job_id not in _jobs:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")
    return _jobs[job_id]
