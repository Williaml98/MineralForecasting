from typing import Any

import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from utils.preprocessing import (
    clean_missing,
    compute_correlations,
    decompose_series,
    engineer_features,
    validate_dataset,
)

router = APIRouter()


# ── Request / Response models ────────────────────────────────────────────────

class ValidateRequest(BaseModel):
    data: list[dict[str, Any]]


class ValidateResponse(BaseModel):
    valid: bool
    errors: list[str]
    row_count: int


class CleanRequest(BaseModel):
    data: list[dict[str, Any]]
    strategy: str = "mean"  # mean | ffill | drop


class CleanResponse(BaseModel):
    data: list[dict[str, Any]]
    summary: dict[str, Any]


class DecomposeRequest(BaseModel):
    data: list[dict[str, Any]]
    date_col: str
    value_col: str


class DecomposeResponse(BaseModel):
    trend: list[float | None]
    seasonal: list[float | None]
    residual: list[float | None]
    dates: list[str]


class CorrelationsRequest(BaseModel):
    data: list[dict[str, Any]]


class FeatureEngineerRequest(BaseModel):
    data: list[dict[str, Any]]
    value_col: str
    rolling_windows: list[int] = [3, 6, 12]
    lag_steps: list[int] = [1, 3, 6]


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/validate", response_model=ValidateResponse)
async def validate(request: ValidateRequest):
    result = validate_dataset(request.data)
    return ValidateResponse(**result)


@router.post("/clean", response_model=CleanResponse)
async def clean(request: CleanRequest):
    if request.strategy not in ("mean", "ffill", "drop"):
        raise HTTPException(
            status_code=422,
            detail="strategy must be one of: mean, ffill, drop",
        )
    df = pd.DataFrame(request.data)
    cleaned = clean_missing(df, request.strategy)

    summary: dict[str, Any] = {
        "rows_before": len(df),
        "rows_after": len(cleaned),
        "missing_before": int(df.isnull().sum().sum()),
        "missing_after": int(cleaned.isnull().sum().sum()),
        "columns": list(cleaned.columns),
    }
    return CleanResponse(
        data=cleaned.where(cleaned.notna(), None).to_dict(orient="records"),
        summary=summary,
    )


@router.post("/decompose", response_model=DecomposeResponse)
async def decompose(request: DecomposeRequest):
    df = pd.DataFrame(request.data)
    try:
        result = decompose_series(df, request.date_col, request.value_col)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return DecomposeResponse(**result)


@router.post("/correlations")
async def correlations(request: CorrelationsRequest) -> dict[str, dict[str, float]]:
    df = pd.DataFrame(request.data)
    try:
        return compute_correlations(df)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/feature-engineer")
async def feature_engineer(request: FeatureEngineerRequest) -> dict[str, Any]:
    df = pd.DataFrame(request.data)
    try:
        engineered = engineer_features(
            df, request.value_col, request.rolling_windows, request.lag_steps
        )
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {
        "data": engineered.where(engineered.notna(), None).to_dict(orient="records"),
        "columns": list(engineered.columns),
        "row_count": len(engineered),
    }
