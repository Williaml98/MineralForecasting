"""Tests for model classes: ArimaModel, ProphetModel, LstmModel."""

import sys
import os

# Ensure the project root is on the path so absolute imports work.
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import numpy as np
import pandas as pd
import pytest

# ── Synthetic dataset ─────────────────────────────────────────────────────────

np.random.seed(42)
_DATES = pd.date_range("2020-01-01", periods=50, freq="MS")
_VALUES = np.sin(np.arange(50) * 0.3) + np.random.normal(0, 0.1, 50)
_SERIES = pd.Series(_VALUES, index=_DATES, name="value")
_DF = pd.DataFrame({"date": _DATES.strftime("%Y-%m-%d"), "value": _VALUES})


# ── ARIMA ─────────────────────────────────────────────────────────────────────

def test_arima_fit_predict():
    from models.arima_model import ArimaModel

    model = ArimaModel(order=(1, 1, 1))
    metrics = model.fit(_SERIES)

    # Metrics dict has required keys
    assert set(metrics.keys()) >= {"mae", "rmse", "mape"}
    # All metric values are non-negative floats
    for key in ("mae", "rmse", "mape"):
        assert isinstance(metrics[key], float)
        assert metrics[key] >= 0.0

    # Predict 3 steps
    preds = model.predict(3)
    assert len(preds) == 3
    assert all(isinstance(v, float) for v in preds)


def test_arima_predict_without_fit():
    from models.arima_model import ArimaModel

    model = ArimaModel()
    with pytest.raises(RuntimeError):
        model.predict(1)


# ── Prophet ───────────────────────────────────────────────────────────────────

def test_prophet_fit_predict():
    from models.prophet_model import ProphetModel

    model = ProphetModel(changepoint_prior_scale=0.05)
    metrics = model.fit(_DF, date_col="date", value_col="value")

    assert set(metrics.keys()) >= {"mae", "rmse", "mape"}
    for key in ("mae", "rmse", "mape"):
        assert isinstance(metrics[key], float)
        assert metrics[key] >= 0.0

    forecast_df = model.predict(periods=3, freq="MS")
    # Should return at least 3 rows of future data
    assert len(forecast_df) >= 3
    assert "yhat" in forecast_df.columns


def test_prophet_predict_without_fit():
    from models.prophet_model import ProphetModel

    model = ProphetModel()
    with pytest.raises(RuntimeError):
        model.predict(1)


# ── LSTM ──────────────────────────────────────────────────────────────────────

def test_lstm_fit_predict():
    from models.lstm_model import LstmModel

    # Use a very small model to keep the test fast
    model = LstmModel(units=8, epochs=2, sequence_length=6)
    metrics = model.fit(_SERIES)

    assert set(metrics.keys()) >= {"mae", "rmse", "mape"}
    for key in ("mae", "rmse", "mape"):
        assert isinstance(metrics[key], float)
        assert metrics[key] >= 0.0

    preds = model.predict(3)
    assert len(preds) == 3
    assert all(isinstance(v, float) for v in preds)


def test_lstm_predict_without_fit():
    from models.lstm_model import LstmModel

    model = LstmModel()
    with pytest.raises(RuntimeError):
        model.predict(1)


# ── Save / load round-trip (ARIMA only — lightweight) ─────────────────────────

def test_arima_save_load(tmp_path):
    from models.arima_model import ArimaModel

    model = ArimaModel(order=(1, 1, 1))
    model.fit(_SERIES)
    path = str(tmp_path / "arima_test.joblib")
    model.save(path)

    loaded = ArimaModel.load(path)
    preds_original = model.predict(5)
    preds_loaded = loaded.predict(5)

    assert preds_original == pytest.approx(preds_loaded, rel=1e-4)
