"""ARIMA model wrapper using statsmodels."""

from __future__ import annotations

import warnings

import numpy as np
import pandas as pd

try:
    import joblib
    from statsmodels.tsa.arima.model import ARIMA
    from statsmodels.tools.sm_exceptions import ConvergenceWarning

    _STATSMODELS_AVAILABLE = True
except ImportError as _e:  # pragma: no cover
    _STATSMODELS_AVAILABLE = False
    _IMPORT_ERROR = str(_e)

from utils.metrics import mae as _mae
from utils.metrics import mape as _mape
from utils.metrics import rmse as _rmse


class ArimaModel:
    """Thin wrapper around ``statsmodels.tsa.arima.model.ARIMA``."""

    def __init__(self, order: tuple[int, int, int] = (1, 1, 1)) -> None:
        if not _STATSMODELS_AVAILABLE:
            raise ImportError(f"statsmodels is required for ArimaModel: {_IMPORT_ERROR}")  # noqa: F821
        self.order = order
        self._fitted = None
        self._last_series: pd.Series | None = None

    # ── Public API ────────────────────────────────────────────────────────────

    def fit(self, series: pd.Series) -> dict[str, float]:
        """Fit ARIMA on *series* and return in-sample metrics."""
        self._last_series = series.copy()
        with warnings.catch_warnings():
            warnings.filterwarnings("ignore", category=ConvergenceWarning)
            warnings.filterwarnings("ignore", category=UserWarning)
            model = ARIMA(series, order=self.order)
            self._fitted = model.fit()

        in_sample = self._fitted.fittedvalues
        actual = series.values[len(series) - len(in_sample):]
        predicted = in_sample.values

        return {
            "mae": float(_mae(actual, predicted)),
            "rmse": float(_rmse(actual, predicted)),
            "mape": float(_mape(actual, predicted)),
        }

    def predict(self, steps: int) -> list[float]:
        """Forecast the next *steps* values beyond the training data."""
        if self._fitted is None:
            raise RuntimeError("Model must be fitted before calling predict().")
        forecast = self._fitted.forecast(steps=steps)
        return [float(v) for v in forecast]

    def save(self, path: str) -> None:
        """Persist this instance to *path* using joblib."""
        joblib.dump(self, path)

    @staticmethod
    def load(path: str) -> "ArimaModel":
        """Load a previously saved ``ArimaModel`` from *path*."""
        return joblib.load(path)
