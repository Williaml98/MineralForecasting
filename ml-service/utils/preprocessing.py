"""Data preprocessing utilities for the ML forecasting service."""

from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler, StandardScaler
from statsmodels.tsa.seasonal import seasonal_decompose


# ── Validation ────────────────────────────────────────────────────────────────

def validate_dataset(data: list[dict[str, Any]]) -> dict[str, Any]:
    """
    Check that *data* contains the required 'date' and 'value' columns.

    Returns::

        {
            "valid": bool,
            "errors": list[str],
            "row_count": int,
        }
    """
    errors: list[str] = []
    row_count = len(data)

    if row_count == 0:
        errors.append("Dataset is empty.")
        return {"valid": False, "errors": errors, "row_count": 0}

    columns = set(data[0].keys())
    required = {"date", "value"}
    missing = required - columns
    if missing:
        errors.append(f"Missing required column(s): {', '.join(sorted(missing))}")

    # Spot-check that 'value' is numeric where present
    if "value" in columns:
        for i, row in enumerate(data):
            v = row.get("value")
            if v is not None:
                try:
                    float(v)
                except (TypeError, ValueError):
                    errors.append(
                        f"Row {i}: 'value' is not numeric ({v!r}). "
                        "Only the first occurrence is reported."
                    )
                    break

    return {"valid": len(errors) == 0, "errors": errors, "row_count": row_count}


# ── Cleaning ──────────────────────────────────────────────────────────────────

def clean_missing(df: pd.DataFrame, strategy: str = "mean") -> pd.DataFrame:
    """
    Handle missing values in *df* using the given *strategy*.

    Supported strategies:
        - ``"mean"``  — replace NaN with column mean (numeric cols only)
        - ``"ffill"`` — forward-fill
        - ``"drop"``  — drop rows that contain any NaN
    """
    df = df.copy()
    if strategy == "mean":
        for col in df.select_dtypes(include=[np.number]).columns:
            df[col].fillna(df[col].mean(), inplace=True)
    elif strategy == "ffill":
        df.ffill(inplace=True)
    elif strategy == "drop":
        df.dropna(inplace=True)
    else:
        raise ValueError(f"Unknown strategy: {strategy!r}. Use 'mean', 'ffill', or 'drop'.")
    return df


# ── Outlier detection ─────────────────────────────────────────────────────────

def detect_outliers(
    df: pd.DataFrame,
    col: str,
    method: str = "zscore",
) -> pd.Series:
    """
    Return a boolean Series where ``True`` marks outliers in *col*.

    Methods:
        - ``"zscore"`` — |z| > 3
        - ``"iqr"``    — below Q1-1.5×IQR or above Q3+1.5×IQR
    """
    series = df[col].astype(float)

    if method == "zscore":
        mean = series.mean()
        std = series.std()
        if std == 0:
            return pd.Series([False] * len(series), index=series.index)
        z = (series - mean) / std
        return z.abs() > 3

    if method == "iqr":
        q1 = series.quantile(0.25)
        q3 = series.quantile(0.75)
        iqr = q3 - q1
        lower = q1 - 1.5 * iqr
        upper = q3 + 1.5 * iqr
        return (series < lower) | (series > upper)

    raise ValueError(f"Unknown outlier method: {method!r}. Use 'zscore' or 'iqr'.")


# ── Normalisation ─────────────────────────────────────────────────────────────

def normalize(
    df: pd.DataFrame,
    col: str,
    method: str = "minmax",
) -> tuple[pd.DataFrame, Any]:
    """
    Normalize column *col* in *df* and return ``(df_copy, scaler)``.

    Methods: ``"minmax"`` (default) or ``"standard"`` (z-score).
    """
    df = df.copy()
    values = df[[col]].astype(float)

    if method == "minmax":
        scaler = MinMaxScaler()
    elif method == "standard":
        scaler = StandardScaler()
    else:
        raise ValueError(f"Unknown normalize method: {method!r}. Use 'minmax' or 'standard'.")

    df[col] = scaler.fit_transform(values).flatten()
    return df, scaler


# ── Decomposition ─────────────────────────────────────────────────────────────

def decompose_series(
    df: pd.DataFrame,
    date_col: str,
    value_col: str,
) -> dict[str, list]:
    """
    Decompose a time series into trend / seasonal / residual components.

    Returns::

        {
            "trend":    list[float | None],
            "seasonal": list[float | None],
            "residual": list[float | None],
            "dates":    list[str],
        }
    """
    ts = df[[date_col, value_col]].copy()
    ts[date_col] = pd.to_datetime(ts[date_col])
    ts = ts.sort_values(date_col).set_index(date_col)
    ts.index.freq = pd.infer_freq(ts.index)

    series = ts[value_col].astype(float)
    # Use additive model; require at least 2 full periods (24 obs for monthly)
    period = 12 if len(series) >= 24 else max(2, len(series) // 2)
    result = seasonal_decompose(series, model="additive", period=period, extrapolate_trend="freq")

    def _to_list(arr) -> list:
        return [None if np.isnan(v) else float(v) for v in arr]

    return {
        "trend": _to_list(result.trend.values),
        "seasonal": _to_list(result.seasonal.values),
        "residual": _to_list(result.resid.values),
        "dates": [str(d.date()) for d in result.trend.index],
    }


# ── Correlations ──────────────────────────────────────────────────────────────

def compute_correlations(df: pd.DataFrame) -> dict[str, dict[str, float]]:
    """Return the Pearson correlation matrix as a nested dict."""
    numeric_df = df.select_dtypes(include=[np.number])
    corr = numeric_df.corr()
    # Replace NaN with None for JSON serialisability
    return {
        col: {
            row: (None if np.isnan(v) else round(float(v), 6))
            for row, v in corr[col].items()
        }
        for col in corr.columns
    }


# ── Feature engineering ───────────────────────────────────────────────────────

def engineer_features(
    df: pd.DataFrame,
    value_col: str,
    rolling_windows: list[int],
    lag_steps: list[int],
) -> pd.DataFrame:
    """
    Add rolling statistics and lag features for *value_col*.

    For each window ``w`` in *rolling_windows* adds:
        - ``{value_col}_roll_mean_{w}``
        - ``{value_col}_roll_std_{w}``

    For each lag ``l`` in *lag_steps* adds:
        - ``{value_col}_lag_{l}``
    """
    df = df.copy()
    series = df[value_col].astype(float)

    for w in rolling_windows:
        df[f"{value_col}_roll_mean_{w}"] = series.rolling(window=w, min_periods=1).mean()
        df[f"{value_col}_roll_std_{w}"] = series.rolling(window=w, min_periods=1).std()

    for lag in lag_steps:
        df[f"{value_col}_lag_{lag}"] = series.shift(lag)

    return df
