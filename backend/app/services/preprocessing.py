import re
from collections.abc import Mapping

import numpy as np
import pandas as pd


FEATURE_COLUMNS = [
    "Price_euros",
    "Ram_GB",
    "Weight_kg",
    "SSD_GB",
    "HDD_GB",
    "CPU_Family_Score",
    "CPU_Base_GHz",
]

LOG_COLUMNS = [
    "Price_euros",
    "Ram_GB",
    "SSD_GB",
    "HDD_GB",
]

CPU_FAMILY_SCORES = {
    "Intel Core i3": 3,
    "Intel Core i5": 5,
    "Intel Core i7": 7,
    "Intel Core i9": 9,
    "Intel Core M": 2,
    "Intel Celeron": 1,
    "Intel Pentium": 2,
    "Intel Atom": 1,
    "AMD Other": 3,
    "Other": 1,
}


def identify_cpu_family(cpu: object) -> str:
    value = str(cpu).lower()
    if "core i9" in value:
        return "Intel Core i9"
    if "core i7" in value:
        return "Intel Core i7"
    if "core i5" in value:
        return "Intel Core i5"
    if "core i3" in value:
        return "Intel Core i3"
    if "core m" in value:
        return "Intel Core M"
    if "celeron" in value:
        return "Intel Celeron"
    if "pentium" in value:
        return "Intel Pentium"
    if "atom" in value:
        return "Intel Atom"
    if "amd" in value:
        return "AMD Other"
    return "Other"


def parse_memory(memory: object) -> dict[str, float]:
    result = {"SSD_GB": 0.0, "HDD_GB": 0.0}
    pattern = (
        r"(\d+(?:\.\d+)?)\s*(TB|GB)\s*"
        r"(SSD|HDD|FLASH STORAGE|HYBRID)"
    )
    for capacity_text, unit, storage_type in re.findall(
        pattern, str(memory).upper()
    ):
        capacity = float(capacity_text)
        if unit == "TB":
            capacity *= 1024
        if storage_type == "SSD":
            result["SSD_GB"] += capacity
        elif storage_type == "HDD":
            result["HDD_GB"] += capacity
    return result


def extract_cpu_base_ghz(cpu: object) -> float:
    match = re.search(
        r"(\d+(?:\.\d+)?)\s*GHz",
        str(cpu),
        flags=re.IGNORECASE,
    )
    if not match:
        raise ValueError("Cpu must contain a parseable GHz value.")
    return float(match.group(1))


def _validate_numeric_features(features: pd.DataFrame) -> None:
    values = features.to_numpy(dtype=float)
    if not np.isfinite(values).all():
        raise ValueError("Model features must all be finite numbers.")
    if (features[FEATURE_COLUMNS].to_numpy(dtype=float) < 0).any():
        raise ValueError(
            "All seven model features must be non-negative."
        )
    cpu_scores = features["CPU_Family_Score"].to_numpy(dtype=float)
    if not np.isin(cpu_scores, list(CPU_FAMILY_SCORES.values())).all():
        raise ValueError(
            "CPU_Family_Score must match a score defined by the "
            "training preprocessing mapping."
        )


def _scale_features(features: pd.DataFrame, scaler: object) -> np.ndarray:
    _validate_numeric_features(features)
    transformed = features.copy()
    transformed[LOG_COLUMNS] = np.log1p(transformed[LOG_COLUMNS])
    scaled = np.asarray(scaler.transform(transformed[FEATURE_COLUMNS]), dtype=float)
    if scaled.shape != (1, len(FEATURE_COLUMNS)):
        raise ValueError(f"Scaler returned unexpected shape {scaled.shape}.")
    if not np.isfinite(scaled).all():
        raise ValueError("Scaled model features must all be finite numbers.")
    return scaled


def preprocess_numeric_features(
    values: Mapping[str, object],
    scaler: object,
) -> np.ndarray:
    missing = [column for column in FEATURE_COLUMNS if column not in values]
    if missing:
        raise ValueError(f"Missing numeric model features: {missing}")
    try:
        features = pd.DataFrame(
            [{column: float(values[column]) for column in FEATURE_COLUMNS}],
            columns=FEATURE_COLUMNS,
        )
    except (TypeError, ValueError) as exc:
        raise ValueError("Numeric model features must be valid numbers.") from exc
    return _scale_features(features, scaler)


def preprocess_raw_laptop(
    values: Mapping[str, object],
    scaler: object,
) -> np.ndarray:
    required = ["Price_euros", "Ram", "Weight", "Memory", "Cpu"]
    missing = [field for field in required if field not in values]
    if missing:
        raise ValueError(f"Missing raw laptop fields: {missing}")

    family = identify_cpu_family(values["Cpu"])
    if family not in CPU_FAMILY_SCORES:
        raise ValueError(
            f"CPU family {family!r} has no score in the training mapping."
        )
    ram_match = re.search(r"(\d+)", str(values["Ram"]))
    weight_match = re.search(r"([\d.]+)", str(values["Weight"]))
    try:
        frequency = extract_cpu_base_ghz(values["Cpu"])
    except ValueError:
        frequency = None
    if not ram_match or not weight_match or frequency is None:
        raise ValueError(
            "Ram, Weight, and Cpu must contain parseable numeric values."
        )
    storage = parse_memory(values["Memory"])
    numeric = {
        "Price_euros": values["Price_euros"],
        "Ram_GB": ram_match.group(1),
        "Weight_kg": weight_match.group(1),
        "SSD_GB": storage["SSD_GB"],
        "HDD_GB": storage["HDD_GB"],
        "CPU_Family_Score": CPU_FAMILY_SCORES[family],
        "CPU_Base_GHz": frequency,
    }
    return preprocess_numeric_features(numeric, scaler)
