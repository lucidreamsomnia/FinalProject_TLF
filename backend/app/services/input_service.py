from io import BytesIO
from typing import Any

import numpy as np
import pandas as pd

from backend.app.services.model_loader import ModelBundle
from backend.app.services.preprocessing import (
    CPU_FAMILY_SCORES,
    FEATURE_COLUMNS,
    identify_cpu_family,
    preprocess_numeric_features,
)


EUR_TO_IDR = 20_000
MAX_UPLOAD_BYTES = 10 * 1024 * 1024


def preference_to_numeric(
    values: dict[str, Any],
    bundle: ModelBundle,
) -> tuple[float, dict[str, Any]]:
    budget_idr = float(values["budget_idr"])
    if not np.isfinite(budget_idr) or budget_idr < 0:
        raise ValueError("budget_idr must be finite and non-negative.")
    cpu_family = identify_cpu_family(values["cpu_family"])
    if cpu_family not in CPU_FAMILY_SCORES:
        raise ValueError(
            f"CPU family {cpu_family!r} has no score in the training mapping."
        )
    budget_eur = budget_idr / EUR_TO_IDR
    numeric = {
        "Price_euros": budget_eur,
        "Ram_GB": values["ram_gb"],
        "Weight_kg": values["weight_kg"],
        "SSD_GB": values["ssd_gb"],
        "HDD_GB": values["hdd_gb"],
        "CPU_Family_Score": CPU_FAMILY_SCORES[cpu_family],
        "CPU_Base_GHz": values["cpu_base_ghz"],
    }
    preprocess_numeric_features(numeric, bundle.scaler)
    return budget_eur, {
        "budget_idr": budget_idr,
        "budget_eur": budget_eur,
        "ram_gb": float(values["ram_gb"]),
        "ssd_gb": float(values["ssd_gb"]),
        "hdd_gb": float(values["hdd_gb"]),
        "weight_kg": float(values["weight_kg"]),
        "cpu_family": cpu_family,
        "cpu_family_score": CPU_FAMILY_SCORES[cpu_family],
        "cpu_base_ghz": float(values["cpu_base_ghz"]),
    }


def validate_csv_upload(filename: str, content: bytes) -> dict[str, Any]:
    errors: list[str] = []
    if not filename.lower().endswith(".csv"):
        return {
            "valid": False,
            "filename": filename,
            "row_count": 0,
            "columns": [],
            "preview": [],
            "errors": ["Only CSV files are accepted."],
        }
    if len(content) > MAX_UPLOAD_BYTES:
        return {
            "valid": False,
            "filename": filename,
            "row_count": 0,
            "columns": [],
            "preview": [],
            "errors": ["CSV file exceeds the 10 MB limit."],
        }
    try:
        frame = pd.read_csv(BytesIO(content))
    except (pd.errors.ParserError, UnicodeDecodeError, ValueError):
        return {
            "valid": False,
            "filename": filename,
            "row_count": 0,
            "columns": [],
            "preview": [],
            "errors": ["CSV format is invalid or unreadable."],
        }

    missing = [column for column in FEATURE_COLUMNS if column not in frame.columns]
    errors.extend(f"Missing required column: {column}" for column in missing)
    for column in [column for column in FEATURE_COLUMNS if column in frame]:
        numeric = pd.to_numeric(frame[column], errors="coerce")
        if numeric.isna().any():
            errors.append(f"{column} contains missing or non-numeric values.")
        elif not np.isfinite(numeric.to_numpy(dtype=float)).all():
            errors.append(f"{column} contains non-finite values.")
        elif (numeric.to_numpy(dtype=float) < 0).any():
            errors.append(f"{column} contains negative values.")
    if "CPU_Family_Score" in frame:
        numeric = pd.to_numeric(frame["CPU_Family_Score"], errors="coerce")
        if numeric.notna().all() and not numeric.isin(
            list(CPU_FAMILY_SCORES.values())
        ).all():
            errors.append("CPU_Family_Score contains unsupported scores.")

    preview_frame = frame.head(5).replace({np.nan: None})
    return {
        "valid": not errors,
        "filename": filename,
        "row_count": len(frame),
        "columns": frame.columns.tolist(),
        "preview": preview_frame.to_dict(orient="records"),
        "errors": errors,
    }
