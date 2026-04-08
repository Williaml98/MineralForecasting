"""Tests for utils/preprocessing.py."""

import sys
import os

# Ensure the project root is on the path so absolute imports work.
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import numpy as np
import pandas as pd
import pytest

from utils.preprocessing import (
    clean_missing,
    compute_correlations,
    detect_outliers,
    validate_dataset,
)


# ── validate_dataset ──────────────────────────────────────────────────────────

def test_validate_dataset_valid():
    data = [
        {"date": "2020-01-01", "value": 10.0},
        {"date": "2020-02-01", "value": 20.0},
        {"date": "2020-03-01", "value": 30.0},
    ]
    result = validate_dataset(data)
    assert result["valid"] is True
    assert result["errors"] == []
    assert result["row_count"] == 3


def test_validate_dataset_missing_column():
    data = [
        {"date": "2020-01-01"},
        {"date": "2020-02-01"},
    ]
    result = validate_dataset(data)
    assert result["valid"] is False
    assert any("value" in err for err in result["errors"])


def test_validate_dataset_empty():
    result = validate_dataset([])
    assert result["valid"] is False
    assert result["row_count"] == 0


def test_validate_dataset_non_numeric_value():
    data = [{"date": "2020-01-01", "value": "not_a_number"}]
    result = validate_dataset(data)
    assert result["valid"] is False


# ── clean_missing ─────────────────────────────────────────────────────────────

def test_clean_missing_mean():
    df = pd.DataFrame({"a": [1.0, np.nan, 3.0], "b": [np.nan, 2.0, 3.0]})
    cleaned = clean_missing(df, strategy="mean")
    assert cleaned.isnull().sum().sum() == 0
    assert cleaned["a"].iloc[1] == pytest.approx(2.0)


def test_clean_missing_ffill():
    df = pd.DataFrame({"a": [1.0, np.nan, np.nan, 4.0]})
    cleaned = clean_missing(df, strategy="ffill")
    assert cleaned.isnull().sum().sum() == 0
    assert cleaned["a"].tolist() == [1.0, 1.0, 1.0, 4.0]


def test_clean_missing_drop():
    df = pd.DataFrame({"a": [1.0, np.nan, 3.0], "b": [1.0, 2.0, 3.0]})
    cleaned = clean_missing(df, strategy="drop")
    assert len(cleaned) == 2
    assert cleaned.isnull().sum().sum() == 0


def test_clean_missing_invalid_strategy():
    df = pd.DataFrame({"a": [1.0, 2.0]})
    with pytest.raises(ValueError):
        clean_missing(df, strategy="unknown")


# ── detect_outliers ───────────────────────────────────────────────────────────

def test_detect_outliers_zscore():
    # Create a series where one value is a clear outlier
    values = [1.0, 2.0, 1.5, 2.0, 1.8, 100.0, 1.9, 2.1, 1.7, 2.0]
    df = pd.DataFrame({"value": values})
    mask = detect_outliers(df, "value", method="zscore")
    # The value 100.0 must be flagged
    assert mask.iloc[5] is np.bool_(True)
    # Most regular values must not be flagged
    assert mask.sum() <= 2


def test_detect_outliers_iqr():
    values = list(range(1, 20)) + [200]
    df = pd.DataFrame({"value": values})
    mask = detect_outliers(df, "value", method="iqr")
    assert mask.iloc[-1] is np.bool_(True)


def test_detect_outliers_no_outliers():
    df = pd.DataFrame({"value": [1.0, 1.1, 0.9, 1.05, 0.95]})
    mask = detect_outliers(df, "value", method="zscore")
    assert mask.sum() == 0


def test_detect_outliers_invalid_method():
    df = pd.DataFrame({"value": [1.0, 2.0]})
    with pytest.raises(ValueError):
        detect_outliers(df, "value", method="invalid")


# ── compute_correlations ──────────────────────────────────────────────────────

def test_compute_correlations_structure():
    df = pd.DataFrame(
        {
            "a": [1.0, 2.0, 3.0, 4.0, 5.0],
            "b": [2.0, 4.0, 6.0, 8.0, 10.0],
        }
    )
    corr = compute_correlations(df)

    # Should have keys for each numeric column
    assert "a" in corr
    assert "b" in corr

    # Self-correlation must be 1.0
    assert corr["a"]["a"] == pytest.approx(1.0)
    assert corr["b"]["b"] == pytest.approx(1.0)

    # Perfect positive linear relationship
    assert corr["a"]["b"] == pytest.approx(1.0, abs=1e-4)


def test_compute_correlations_negative():
    df = pd.DataFrame(
        {
            "x": [1.0, 2.0, 3.0, 4.0, 5.0],
            "y": [5.0, 4.0, 3.0, 2.0, 1.0],
        }
    )
    corr = compute_correlations(df)
    assert corr["x"]["y"] == pytest.approx(-1.0, abs=1e-4)
