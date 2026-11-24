from collections.abc import Mapping
from dataclasses import dataclass
from numbers import Integral

import numpy as np
import pandas as pd

from backend.app.services.fcm_service import (
    build_knn_input,
    predict_membership,
)
from backend.app.services.model_loader import ModelBundle
from backend.app.services.preprocessing import (
    CPU_FAMILY_SCORES,
    FEATURE_COLUMNS,
    extract_cpu_base_ghz,
    identify_cpu_family,
    preprocess_numeric_features,
)


MEMBERSHIP_COLUMNS = [
    "Membership_Cluster_1",
    "Membership_Cluster_2",
    "Membership_Cluster_3",
    "Membership_Cluster_4",
]


DISPLAY_EUR_TO_IDR = 20_000


@dataclass(frozen=True)
class LaptopPreferences:
    max_budget_eur: float
    ram_gb: float
    weight_kg: float
    ssd_gb: float
    hdd_gb: float
    cpu_family: str
    cpu_base_ghz: float


@dataclass(frozen=True)
class Recommendation:
    rank: int
    row_index: int
    company: object
    product: object
    price_eur: float
    price_idr: float
    ram: object
    weight: object
    memory: object
    cpu: object
    cpu_base_ghz: float
    fcm_cluster: int
    memberships: tuple[float, float, float, float]
    query_memberships: tuple[float, float, float, float]
    laptop_memberships: tuple[float, float, float, float]
    distance: float
    within_budget: bool


def _preference_value(preferences: LaptopPreferences | Mapping[str, object], name: str) -> object:
    if isinstance(preferences, Mapping):
        if name not in preferences:
            raise ValueError(f"Missing preference: {name}")
        return preferences[name]
    return getattr(preferences, name)


def _as_non_negative_finite(value: object, name: str) -> float:
    if isinstance(value, bool):
        raise ValueError(f"{name} must be a finite non-negative number.")
    try:
        numeric = float(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{name} must be a finite non-negative number.") from exc
    if not np.isfinite(numeric) or numeric < 0:
        raise ValueError(f"{name} must be a finite non-negative number.")
    return numeric


def _normalize_preferences(
    preferences: LaptopPreferences | Mapping[str, object],
) -> LaptopPreferences:
    cpu_family_input = _preference_value(preferences, "cpu_family")
    if not isinstance(cpu_family_input, str) or not cpu_family_input.strip():
        raise ValueError("cpu_family must be a supported CPU family string.")
    cpu_family = identify_cpu_family(cpu_family_input)
    if cpu_family not in CPU_FAMILY_SCORES:
        raise ValueError(
            f"CPU family {cpu_family!r} has no score in the training mapping."
        )
    return LaptopPreferences(
        max_budget_eur=_as_non_negative_finite(
            _preference_value(preferences, "max_budget_eur"),
            "max_budget_eur",
        ),
        ram_gb=_as_non_negative_finite(
            _preference_value(preferences, "ram_gb"), "ram_gb"
        ),
        weight_kg=_as_non_negative_finite(
            _preference_value(preferences, "weight_kg"), "weight_kg"
        ),
        ssd_gb=_as_non_negative_finite(
            _preference_value(preferences, "ssd_gb"), "ssd_gb"
        ),
        hdd_gb=_as_non_negative_finite(
            _preference_value(preferences, "hdd_gb"), "hdd_gb"
        ),
        cpu_family=cpu_family,
        cpu_base_ghz=_as_non_negative_finite(
            _preference_value(preferences, "cpu_base_ghz"),
            "cpu_base_ghz",
        ),
    )


def _validate_top_n(top_n: object, available: int) -> int:
    if isinstance(top_n, bool) or not isinstance(top_n, Integral):
        raise ValueError("top_n must be a positive integer.")
    if top_n < 1 or top_n > available:
        raise ValueError(
            f"top_n must be between 1 and the {available} available training samples."
        )
    return int(top_n)


def recommend_laptops(
    preferences: LaptopPreferences | Mapping[str, object],
    model_bundle: ModelBundle,
    top_n: int = 5,
) -> list[Recommendation]:
    normalized_preferences = _normalize_preferences(preferences)
    available = len(model_bundle.original_dataset)
    count = _validate_top_n(top_n, available)

    numeric_features = {
        "Price_euros": normalized_preferences.max_budget_eur,
        "Ram_GB": normalized_preferences.ram_gb,
        "Weight_kg": normalized_preferences.weight_kg,
        "SSD_GB": normalized_preferences.ssd_gb,
        "HDD_GB": normalized_preferences.hdd_gb,
        "CPU_Family_Score": CPU_FAMILY_SCORES[normalized_preferences.cpu_family],
        "CPU_Base_GHz": normalized_preferences.cpu_base_ghz,
    }
    scaled_features = preprocess_numeric_features(
        numeric_features,
        model_bundle.scaler,
    )
    memberships = predict_membership(
        scaled_features,
        model_bundle.fcm_centers,
    )
    query = build_knn_input(scaled_features, memberships)
    if query.shape != (1, 11):
        raise RuntimeError(f"Unexpected KNN query shape: {query.shape}")
    query_frame = pd.DataFrame(
        query,
        columns=FEATURE_COLUMNS + MEMBERSHIP_COLUMNS,
    )

    distances, indices = model_bundle.knn_model.kneighbors(
        query_frame,
        n_neighbors=count,
    )
    distances = np.asarray(distances[0], dtype=float)
    indices = np.asarray(indices[0], dtype=int)
    if (
        distances.shape != (count,)
        or indices.shape != (count,)
        or not np.isfinite(distances).all()
        or (distances < 0).any()
    ):
        raise RuntimeError("KNN returned invalid distances or indices.")

    results: list[Recommendation] = []
    for rank, (distance, row_index) in enumerate(
        zip(distances, indices, strict=True),
        start=1,
    ):
        row = model_bundle.original_dataset.iloc[int(row_index)]
        fcm_row = model_bundle.fcm_results.iloc[int(row_index)]
        laptop_memberships = tuple(
            float(fcm_row[column]) for column in MEMBERSHIP_COLUMNS
        )
        price_eur = float(row["Price_euros"])
        results.append(
            Recommendation(
                rank=rank,
                row_index=int(row_index),
                company=row["Company"],
                product=row["Product"],
                price_eur=price_eur,
                price_idr=price_eur * DISPLAY_EUR_TO_IDR,
                ram=row["Ram"],
                weight=row["Weight"],
                memory=row["Memory"],
                cpu=row["Cpu"],
                cpu_base_ghz=extract_cpu_base_ghz(row["Cpu"]),
                fcm_cluster=int(fcm_row["Cluster"]),
                memberships=tuple(float(value) for value in memberships),
                query_memberships=tuple(float(value) for value in memberships),
                laptop_memberships=laptop_memberships,
                distance=float(distance),
                within_budget=price_eur <= normalized_preferences.max_budget_eur,
            )
        )
    return results
