"""Model explainability utilities."""

from __future__ import annotations

from typing import Any

import pandas as pd


def get_shap_values(model: Any, X: Any) -> dict[str, Any]:
    """
    Attempt to compute SHAP values for *model* given input *X*.

    Falls back to an empty dict on any error so the rest of the service
    remains operational even when SHAP is unavailable or incompatible with
    the model type.
    """
    try:
        import shap  # type: ignore

        explainer = shap.Explainer(model, X)
        shap_values = explainer(X)
        # Convert to a JSON-serialisable dict
        values = shap_values.values
        if hasattr(values, "tolist"):
            values = values.tolist()
        feature_names = (
            list(X.columns)
            if isinstance(X, pd.DataFrame)
            else [f"feature_{i}" for i in range(len(values[0]) if values else 0)]
        )
        return {
            "shap_values": values,
            "feature_names": feature_names,
            "base_values": (
                shap_values.base_values.tolist()
                if hasattr(shap_values.base_values, "tolist")
                else float(shap_values.base_values)
            ),
        }
    except Exception as exc:  # pragma: no cover
        return {"error": str(exc), "shap_values": [], "feature_names": []}


def get_prophet_components(forecast_df: pd.DataFrame) -> dict[str, Any]:
    """
    Extract interpretable components from a Prophet forecast DataFrame.

    Returns a dict with ``trend``, ``weekly`` (if present), ``yearly``
    (if present) and their corresponding dates.
    """
    if forecast_df is None or forecast_df.empty:
        return {}

    result: dict[str, Any] = {}

    if "ds" in forecast_df.columns:
        result["dates"] = [
            str(d.date()) if hasattr(d, "date") else str(d)
            for d in forecast_df["ds"]
        ]

    for component in ("trend", "weekly", "yearly", "multiplicative_terms"):
        if component in forecast_df.columns:
            result[component] = forecast_df[component].tolist()

    # Also include yhat so consumers can reconstruct the forecast
    if "yhat" in forecast_df.columns:
        result["yhat"] = forecast_df["yhat"].tolist()

    return result
