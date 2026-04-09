"""Holt-Winters Exponential Smoothing (ETS) model wrapper."""

from __future__ import annotations

import warnings

import numpy as np
import pandas as pd

try:
    import joblib
    from statsmodels.tsa.holtwinters import ExponentialSmoothing

    _STATSMODELS_AVAILABLE = True
except ImportError as _e:  # pragma: no cover
    _STATSMODELS_AVAILABLE = False
    _IMPORT_ERROR = str(_e)

from utils.metrics import mae as _mae
from utils.metrics import mape as _mape
from utils.metrics import rmse as _rmse


class ETSModel:
    """
    Holt-Winters Triple Exponential Smoothing with additive trend and
    additive seasonality. Works well for seasonal mineral commodity data
    with consistent yearly cycles.
    """

    def __init__(self, seasonal_periods: int = 12) -> None:
        if not _STATSMODELS_AVAILABLE:
            raise ImportError(  # noqa: F821
                f"statsmodels is required for ETSModel: {_IMPORT_ERROR}"
            )
        self.seasonal_periods = seasonal_periods
        self._fitted = None
        self._last_values: list[float] = []

    # ── Public API ────────────────────────────────────────────────────────────

    def fit(self, series: pd.Series) -> dict[str, float]:
        """Fit Holt-Winters on *series* and return in-sample metrics."""
        self._last_values = list(series.values[-self.seasonal_periods:])
        values = series.values.astype(float)

        # Need at least 2 full seasonal cycles for triple ETS
        use_seasonal = len(values) >= self.seasonal_periods * 2

        with warnings.catch_warnings():
            warnings.filterwarnings("ignore")
            model = ExponentialSmoothing(
                values,
                trend="add",
                seasonal="add" if use_seasonal else None,
                seasonal_periods=self.seasonal_periods if use_seasonal else None,
                initialization_method="estimated",
            )
            self._fitted = model.fit(optimized=True)

        in_sample = self._fitted.fittedvalues
        actual = values[len(values) - len(in_sample):]
        predicted = in_sample

        return {
            "mae": float(_mae(actual, predicted)),
            "rmse": float(_rmse(actual, predicted)),
            "mape": float(_mape(actual, predicted)),
        }

    def predict(self, steps: int) -> list[float]:
        """Forecast the next *steps* values beyond the training data."""
        if self._fitted is None:
            raise RuntimeError("Model must be fitted before calling predict().")
        forecast = self._fitted.forecast(steps)
        return [float(v) for v in forecast]

    def save(self, path: str) -> None:
        joblib.dump(self, path)

    @staticmethod
    def load(path: str) -> "ETSModel":
        return joblib.load(path)
