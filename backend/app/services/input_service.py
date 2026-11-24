import re
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
LAPTOP_DATASET_COLUMNS = (
    "laptop_ID",
    "Company",
    "Product",
    "TypeName",
    "Inches",
    "ScreenResolution",
    "Cpu",
    "Ram",
    "Memory",
    "Gpu",
    "OpSys",
    "Weight",
    "Price_euros",
)
LAPTOP_DATASET_NUMERIC_COLUMNS = ("laptop_ID", "Inches", "Price_euros")
LAPTOP_DATASET_SIGNATURE = {"laptop_ID", "ScreenResolution", "Memory", "Cpu", "Ram"}
LAPTOP_DATASET_UNIT_COLUMNS = {
    "Ram": (r"(\d+)GB", "8GB"),
    "Weight": (r"(\d+(?:\.\d+)?)kg", "1.37kg"),
}


def preference_to_numeric(
    values: dict[str, Any],
    bundle: ModelBundle,
) -> tuple[float, dict[str, Any]]:
    if isinstance(values["budget_idr"], bool):
        raise ValueError("budget_idr must be finite and non-negative.")
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


def _read_uploaded_csv(content: bytes) -> pd.DataFrame:
    try:
        return pd.read_csv(BytesIO(content), encoding="utf-8-sig")
    except UnicodeDecodeError:
        return pd.read_csv(BytesIO(content), encoding="cp1252")


def _validate_positive_unit_column(
    frame: pd.DataFrame,
    column: str,
    pattern: str,
    example: str,
) -> str | None:
    if column not in frame or frame[column].isna().any():
        return None

    values = frame[column].astype(str).str.strip()
    if not values.str.fullmatch(pattern, flags=re.IGNORECASE).all():
        return (
            f"{column} must be a positive value with the expected format "
            f"(e.g. {example})."
        )

    amounts = pd.to_numeric(
        values.str.extract(pattern, flags=re.IGNORECASE)[0],
        errors="coerce",
    )
    if not np.isfinite(amounts.to_numpy(dtype=float)).all():
        return f"{column} must contain finite values."
    if (amounts <= 0).any():
        return f"{column} values must be greater than zero."
    return None


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
        frame = _read_uploaded_csv(content)
    except UnicodeDecodeError:
        return {
            "valid": False,
            "filename": filename,
            "row_count": 0,
            "columns": [],
            "preview": [],
            "errors": [
                "CSV encoding is invalid or unsupported. Please use UTF-8 or Windows-1252."
            ],
        }
    except (pd.errors.ParserError, ValueError):
        return {
            "valid": False,
            "filename": filename,
            "row_count": 0,
            "columns": [],
            "preview": [],
            "errors": ["CSV format is invalid or unreadable."],
        }

    is_laptop_dataset = len(LAPTOP_DATASET_SIGNATURE.intersection(frame.columns)) >= 2
    required_columns = LAPTOP_DATASET_COLUMNS if is_laptop_dataset else FEATURE_COLUMNS
    numeric_columns = (
        LAPTOP_DATASET_NUMERIC_COLUMNS if is_laptop_dataset else FEATURE_COLUMNS
    )
    missing = [column for column in required_columns if column not in frame.columns]
    errors.extend(f"Missing required column: {column}" for column in missing)
    for column in [column for column in numeric_columns if column in frame]:
        numeric = pd.to_numeric(frame[column], errors="coerce")
        if numeric.isna().any():
            errors.append(f"{column} contains missing or non-numeric values.")
        elif not np.isfinite(numeric.to_numpy(dtype=float)).all():
            errors.append(f"{column} contains non-finite values.")
        elif (numeric.to_numpy(dtype=float) < 0).any():
            errors.append(f"{column} contains negative values.")
    if is_laptop_dataset:
        for column in LAPTOP_DATASET_COLUMNS:
            if (
                column in frame
                and column not in LAPTOP_DATASET_NUMERIC_COLUMNS
                and frame[column].isna().any()
            ):
                errors.append(f"{column} contains missing values.")
        for column, (pattern, example) in LAPTOP_DATASET_UNIT_COLUMNS.items():
            unit_error = _validate_positive_unit_column(
                frame,
                column,
                pattern,
                example,
            )
            if unit_error:
                errors.append(unit_error)
    elif "CPU_Family_Score" in frame:
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
