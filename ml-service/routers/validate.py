"""Dataset validation endpoint for the ML service.

Checks a CSV file (by path) or inline data for structural and quality issues
before training begins. Returns a structured report so the frontend can show
meaningful error messages to the user.
"""

from __future__ import annotations

import os
from typing import Any

import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()


class ValidateByPathRequest(BaseModel):
    file_path: str
    date_col: str = "date"
    value_col: str = "demand"


class ValidateByDataRequest(BaseModel):
    data: list[dict[str, Any]]
    date_col: str
    value_col: str


class ValidationResult(BaseModel):
    valid: bool
    row_count: int
    usable_rows: int
    date_range: str
    missing_value_pct: float
    issues: list[str]
    warnings: list[str]
    suggestions: list[str]
    column_summary: dict[str, str]


def _validate_df(df: pd.DataFrame, date_col: str, value_col: str) -> ValidationResult:
    issues: list[str] = []
    warnings: list[str] = []
    suggestions: list[str] = []
    column_summary: dict[str, str] = {}

    # 1. Required columns present?
    if date_col not in df.columns:
        issues.append(
            f"Date column '{date_col}' not found. "
            f"Available columns: {', '.join(df.columns.tolist())}"
        )
    if value_col not in df.columns:
        issues.append(
            f"Value column '{value_col}' not found. "
            f"Available columns: {', '.join(df.columns.tolist())}"
        )

    if issues:
        return ValidationResult(
            valid=False, row_count=len(df), usable_rows=0,
            date_range="N/A", missing_value_pct=0.0,
            issues=issues, warnings=warnings, suggestions=suggestions,
            column_summary=column_summary,
        )

    # 2. Parse dates
    try:
        df[date_col] = pd.to_datetime(df[date_col])
    except Exception as exc:
        issues.append(f"Cannot parse date column '{date_col}' as dates: {exc}")

    # 3. Parse value column
    df[value_col] = pd.to_numeric(df[value_col], errors="coerce")

    # 4. Missing values
    null_mask = df[value_col].isna()
    null_count = int(null_mask.sum())
    total_rows = len(df)
    missing_pct = (null_count / total_rows * 100) if total_rows > 0 else 0.0

    if missing_pct > 30:
        issues.append(
            f"Value column '{value_col}' has {missing_pct:.1f}% missing values "
            f"({null_count}/{total_rows} rows). Maximum allowed is 30%."
        )
    elif missing_pct > 10:
        warnings.append(
            f"Value column '{value_col}' has {missing_pct:.1f}% missing values. "
            "These will be interpolated during preprocessing."
        )

    # 5. Usable rows (non-null values)
    usable = int((~null_mask).sum())

    # 6. Minimum data requirement
    MIN_ROWS = 24
    if usable < MIN_ROWS:
        issues.append(
            f"Only {usable} usable data points found. "
            f"At least {MIN_ROWS} non-null rows are required for reliable time-series training."
        )
    elif usable < 48:
        warnings.append(
            f"Only {usable} data points. More data generally improves forecast accuracy. "
            "Consider collecting at least 48 months of history."
        )

    # 7. Date range
    if date_col in df.columns and not df[date_col].isna().all():
        try:
            date_min = df[date_col].min().strftime("%Y-%m-%d")
            date_max = df[date_col].max().strftime("%Y-%m-%d")
            date_range = f"{date_min} to {date_max}"
        except Exception:
            date_range = "Unable to parse"
    else:
        date_range = "N/A"

    # 8. Negative values
    if df[value_col].min(skipna=True) < 0:
        warnings.append(
            f"Value column '{value_col}' contains negative values. "
            "Verify this is expected for your demand metric."
        )

    # 9. Duplicated dates
    if date_col in df.columns:
        dup_dates = int(df[date_col].duplicated().sum())
        if dup_dates > 0:
            warnings.append(
                f"{dup_dates} duplicate date(s) detected. "
                "Only the last entry per date will be used during training."
            )

    # 10. Column summary (all columns)
    for col in df.columns:
        dtype = str(df[col].dtype)
        nulls = int(df[col].isna().sum())
        column_summary[col] = f"dtype={dtype}, nulls={nulls}/{total_rows}"

    # 11. Suggestions
    other_cols = [c for c in df.columns if c not in (date_col, value_col)]
    if other_cols:
        suggestions.append(
            f"Extra columns detected: {', '.join(other_cols)}. "
            "The ML models currently use only the date and value columns. "
            "Consider filtering to mineral type and region before training for better accuracy."
        )
    if usable >= MIN_ROWS and not issues:
        suggestions.append(
            "Data looks good. For best ARIMA/ETS results use monthly aggregated demand. "
            "Set seasonal_periods=12 for yearly patterns."
        )

    valid = len(issues) == 0
    return ValidationResult(
        valid=valid,
        row_count=total_rows,
        usable_rows=usable,
        date_range=date_range,
        missing_value_pct=round(missing_pct, 2),
        issues=issues,
        warnings=warnings,
        suggestions=suggestions,
        column_summary=column_summary,
    )


@router.post("/by-path", response_model=ValidationResult)
async def validate_by_path(request: ValidateByPathRequest) -> ValidationResult:
    """Validate a CSV dataset at the given file path."""
    if not os.path.exists(request.file_path):
        raise HTTPException(status_code=404, detail=f"File not found: {request.file_path}")
    try:
        df = pd.read_csv(request.file_path)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Cannot read CSV: {exc}") from exc
    return _validate_df(df, request.date_col, request.value_col)


@router.post("/by-data", response_model=ValidationResult)
async def validate_by_data(request: ValidateByDataRequest) -> ValidationResult:
    """Validate inline data (list of records) sent from the backend."""
    if not request.data:
        raise HTTPException(status_code=422, detail="No data provided.")
    df = pd.DataFrame(request.data)
    return _validate_df(df, request.date_col, request.value_col)
