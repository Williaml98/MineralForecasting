"""Prophet model wrapper."""

from __future__ import annotations

import warnings

import pandas as pd

try:
    import joblib
    from prophet import Prophet  # type: ignore

    _PROPHET_AVAILABLE = True
except ImportError as _e:  # pragma: no cover
    _PROPHET_AVAILABLE = False
    _IMPORT_ERROR = str(_e)

from utils.metrics import mae as _mae
from utils.metrics import mape as _mape
from utils.metrics import rmse as _rmse


class ProphetModel:
    """Thin wrapper around Facebook Prophet."""

    def __init__(self, changepoint_prior_scale: float = 0.05) -> None:
        if not _PROPHET_AVAILABLE:
            raise ImportError(f"prophet is required for ProphetModel: {_IMPORT_ERROR}")  # noqa: F821
        self.changepoint_prior_scale = changepoint_prior_scale
        self._model: Prophet | None = None
        self._train_df: pd.DataFrame | None = None

    # ── Public API ────────────────────────────────────────────────────────────

    def fit(
        self,
        df: pd.DataFrame,
        date_col: str,
        value_col: str,
    ) -> dict[str, float]:
        """Fit Prophet and return in-sample metrics."""
        prophet_df = df[[date_col, value_col]].rename(
            columns={date_col: "ds", value_col: "y"}
        )
        prophet_df["ds"] = pd.to_datetime(prophet_df["ds"])
        self._train_df = prophet_df.copy()

        self._model = Prophet(
            changepoint_prior_scale=self.changepoint_prior_scale,
            yearly_seasonality=True,
            weekly_seasonality=False,
            daily_seasonality=False,
        )
        with warnings.catch_warnings():
            warnings.filterwarnings("ignore")
            self._model.fit(prophet_df)

        in_sample_forecast = self._model.predict(prophet_df[["ds"]])
        actual = prophet_df["y"].values
        predicted = in_sample_forecast["yhat"].values

        return {
            "mae": float(_mae(actual, predicted)),
            "rmse": float(_rmse(actual, predicted)),
            "mape": float(_mape(actual, predicted)),
        }

    def predict(self, periods: int, freq: str = "MS") -> pd.DataFrame:
        """
        Generate *periods* future forecasts.

        Returns a DataFrame with columns: ds, yhat, yhat_lower, yhat_upper.
        """
        if self._model is None or self._train_df is None:
            raise RuntimeError("Model must be fitted before calling predict().")
        future = self._model.make_future_dataframe(periods=periods, freq=freq)
        with warnings.catch_warnings():
            warnings.filterwarnings("ignore")
            forecast = self._model.predict(future)
        return forecast[["ds", "yhat", "yhat_lower", "yhat_upper"]]

    def save(self, path: str) -> None:
        joblib.dump(self, path)

    @staticmethod
    def load(path: str) -> "ProphetModel":
        return joblib.load(path)
