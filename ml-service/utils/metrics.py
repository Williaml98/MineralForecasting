"""Forecasting evaluation metrics."""

from __future__ import annotations

import numpy as np


def mae(actual: np.ndarray | list, predicted: np.ndarray | list) -> float:
    """Mean Absolute Error."""
    a = np.asarray(actual, dtype=float)
    p = np.asarray(predicted, dtype=float)
    return float(np.mean(np.abs(a - p)))


def rmse(actual: np.ndarray | list, predicted: np.ndarray | list) -> float:
    """Root Mean Squared Error."""
    a = np.asarray(actual, dtype=float)
    p = np.asarray(predicted, dtype=float)
    return float(np.sqrt(np.mean((a - p) ** 2)))


def mape(actual: np.ndarray | list, predicted: np.ndarray | list) -> float:
    """
    Mean Absolute Percentage Error (in percent).

    Rows where the actual value is zero are excluded to avoid division by zero.
    Returns 0.0 if all actual values are zero.
    """
    a = np.asarray(actual, dtype=float)
    p = np.asarray(predicted, dtype=float)
    nonzero = a != 0
    if not nonzero.any():
        return 0.0
    return float(np.mean(np.abs((a[nonzero] - p[nonzero]) / a[nonzero])) * 100)
