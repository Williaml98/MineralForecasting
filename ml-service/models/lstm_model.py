"""LSTM model wrapper using TensorFlow / Keras."""

from __future__ import annotations

import warnings

import numpy as np
import pandas as pd

try:
    import joblib

    _JOBLIB_AVAILABLE = True
except ImportError:  # pragma: no cover
    _JOBLIB_AVAILABLE = False

try:
    import os

    os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")  # suppress TF logs

    import tensorflow as tf  # type: ignore
    from tensorflow.keras.layers import LSTM, Dense  # type: ignore
    from tensorflow.keras.models import Sequential  # type: ignore

    _TF_AVAILABLE = True
except ImportError as _e:  # pragma: no cover
    _TF_AVAILABLE = False
    _TF_IMPORT_ERROR = str(_e)
    print(
        f"[LstmModel] TensorFlow not available ({_e}). "
        "Running in CPU-only fallback stub mode — predictions will be zeros."
    )

from utils.metrics import mae as _mae
from utils.metrics import mape as _mape
from utils.metrics import rmse as _rmse


class LstmModel:
    """
    Simple LSTM forecasting model.

    If TensorFlow is unavailable the model degrades gracefully to a
    zero-valued stub so the rest of the service still starts cleanly.
    """

    def __init__(
        self,
        units: int = 64,
        epochs: int = 50,
        sequence_length: int = 12,
    ) -> None:
        self.units = units
        self.epochs = epochs
        self.sequence_length = sequence_length
        self._keras_model = None
        self._scaler_min: float = 0.0
        self._scaler_max: float = 1.0
        self._last_sequence: np.ndarray | None = None

    # ── Internal helpers ──────────────────────────────────────────────────────

    def _normalize(self, values: np.ndarray) -> np.ndarray:
        self._scaler_min = float(values.min())
        self._scaler_max = float(values.max())
        rng = self._scaler_max - self._scaler_min
        if rng == 0:
            return np.zeros_like(values, dtype=float)
        return (values - self._scaler_min) / rng

    def _denormalize(self, values: np.ndarray) -> np.ndarray:
        rng = self._scaler_max - self._scaler_min
        return values * rng + self._scaler_min

    def _make_sequences(
        self, data: np.ndarray
    ) -> tuple[np.ndarray, np.ndarray]:
        X, y = [], []
        for i in range(len(data) - self.sequence_length):
            X.append(data[i : i + self.sequence_length])
            y.append(data[i + self.sequence_length])
        return np.array(X)[..., np.newaxis], np.array(y)

    def _build_model(self) -> "Sequential":
        model = Sequential(
            [
                LSTM(self.units, input_shape=(self.sequence_length, 1)),
                Dense(1),
            ]
        )
        model.compile(optimizer="adam", loss="mse")
        return model

    # ── Public API ────────────────────────────────────────────────────────────

    def fit(self, series: pd.Series) -> dict[str, float]:
        """
        Fit the LSTM on *series* and return in-sample metrics.
        """
        values = series.values.astype(float)
        norm = self._normalize(values)

        if _TF_AVAILABLE and len(norm) > self.sequence_length:
            X, y = self._make_sequences(norm)
            self._keras_model = self._build_model()
            with warnings.catch_warnings():
                warnings.filterwarnings("ignore")
                self._keras_model.fit(
                    X, y,
                    epochs=self.epochs,
                    batch_size=16,
                    verbose=0,
                )
            # In-sample predictions
            preds_norm = self._keras_model.predict(X, verbose=0).flatten()
            preds = self._denormalize(preds_norm)
            actual = values[self.sequence_length:]
        else:
            # Fallback: naive last-value prediction
            actual = values[1:]
            preds = values[:-1]

        # Store last sequence for autoregressive prediction
        self._last_sequence = norm[-self.sequence_length:].copy()

        return {
            "mae": float(_mae(actual, preds)),
            "rmse": float(_rmse(actual, preds)),
            "mape": float(_mape(actual, preds)),
        }

    def predict(self, steps: int) -> list[float]:
        """Autoregressively predict the next *steps* values."""
        if self._last_sequence is None:
            raise RuntimeError("Model must be fitted before calling predict().")

        if not _TF_AVAILABLE or self._keras_model is None:
            # Fallback: return denormalized mean
            return [float(self._denormalize(np.array([self._last_sequence.mean()])))] * steps

        seq = self._last_sequence.copy()
        results = []
        for _ in range(steps):
            x = seq.reshape(1, self.sequence_length, 1)
            pred_norm = float(self._keras_model.predict(x, verbose=0)[0, 0])
            results.append(float(self._denormalize(np.array([pred_norm]))[0]))
            seq = np.roll(seq, -1)
            seq[-1] = pred_norm
        return results

    def save(self, path: str) -> None:
        if not _JOBLIB_AVAILABLE:
            raise ImportError("joblib is required to save the model.")
        # Keras models cannot be directly pickled via joblib; we save weights
        # separately alongside the wrapper.
        if self._keras_model is not None:
            weights_path = path + ".weights.h5"
            self._keras_model.save_weights(weights_path)
            self._weights_path = weights_path

        # Temporarily remove the Keras model object before pickling
        keras_model_tmp = self._keras_model
        self._keras_model = None
        joblib.dump(self, path)
        self._keras_model = keras_model_tmp

    @staticmethod
    def load(path: str) -> "LstmModel":
        instance: LstmModel = joblib.load(path)
        weights_path = path + ".weights.h5"
        if _TF_AVAILABLE and hasattr(instance, "_weights_path"):
            try:
                instance._keras_model = instance._build_model()
                instance._keras_model.load_weights(instance._weights_path)
            except Exception:  # pragma: no cover
                instance._keras_model = None
        return instance
