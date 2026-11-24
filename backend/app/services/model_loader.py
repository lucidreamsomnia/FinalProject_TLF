import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from backend.app.core.config import ARTIFACTS_ROOT, DATASET_ROOT
from backend.app.services.preprocessing import (
    FEATURE_COLUMNS,
    preprocess_raw_laptop,
)


MEMBERSHIP_COLUMNS = [
    "Membership_Cluster_1",
    "Membership_Cluster_2",
    "Membership_Cluster_3",
    "Membership_Cluster_4",
]
EXPECTED_ROWS = 1303


@dataclass(frozen=True)
class ModelBundle:
    scaler: object
    knn_model: object
    fcm_centers: np.ndarray
    manifest: dict
    original_dataset: pd.DataFrame
    scaled_features: pd.DataFrame
    fcm_results: pd.DataFrame


def _require_files(paths: list[Path]) -> None:
    missing = [str(path) for path in paths if not path.is_file()]
    if missing:
        raise FileNotFoundError("Required model files are missing: " + ", ".join(missing))


def load_model_bundle() -> ModelBundle:
    scaler_path = ARTIFACTS_ROOT / "scaler.joblib"
    knn_path = ARTIFACTS_ROOT / "knn_model.joblib"
    manifest_path = ARTIFACTS_ROOT / "model_manifest.json"
    centers_path = DATASET_ROOT / "fcm_centers.npy"
    original_path = DATASET_ROOT / "laptop_price.csv"
    scaled_path = DATASET_ROOT / "laptop_features_scaled.csv"
    fcm_results_path = DATASET_ROOT / "laptop_fcm_results.csv"
    _require_files(
        [
            scaler_path,
            knn_path,
            manifest_path,
            centers_path,
            original_path,
            scaled_path,
            fcm_results_path,
        ]
    )

    scaler = joblib.load(scaler_path)
    knn_model = joblib.load(knn_path)
    centers = np.load(centers_path)
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    original = pd.read_csv(original_path, encoding="latin1")
    scaled = pd.read_csv(scaled_path)
    fcm_results = pd.read_csv(fcm_results_path)

    if centers.shape != (4, 7):
        raise ValueError(f"FCM centers must have shape (4, 7), got {centers.shape}.")
    if not np.isfinite(centers).all():
        raise ValueError("FCM centers contain non-finite values.")
    if getattr(scaler, "n_features_in_", None) != 7:
        raise ValueError("Scaler must accept seven input features.")
    if getattr(knn_model, "n_features_in_", None) != 11:
        raise ValueError("KNN model must accept eleven input features.")
    training_matrix = getattr(knn_model, "_fit_X", None)
    if training_matrix is None or training_matrix.shape != (EXPECTED_ROWS, 11):
        shape = None if training_matrix is None else training_matrix.shape
        raise ValueError(f"KNN training matrix must have shape (1303, 11), got {shape}.")
    if len(original) != EXPECTED_ROWS:
        raise ValueError(f"Original dataset must have 1303 rows, got {len(original)}.")
    raw_required = ["Price_euros", "Ram", "Weight", "Memory", "Cpu"]
    missing_raw = [column for column in raw_required if column not in original]
    if missing_raw:
        raise ValueError(f"Original dataset is missing columns: {missing_raw}")
    if scaled.shape != (EXPECTED_ROWS, 7) or scaled.columns.tolist() != FEATURE_COLUMNS:
        raise ValueError("Scaled training data must be 1303 rows with the seven expected columns.")
    missing = [column for column in FEATURE_COLUMNS + MEMBERSHIP_COLUMNS if column not in fcm_results]
    if missing:
        raise ValueError(f"FCM results are missing columns: {missing}")
    if len(fcm_results) != EXPECTED_ROWS:
        raise ValueError(f"FCM results must have 1303 rows, got {len(fcm_results)}.")

    scaled_values = scaled.to_numpy(dtype=float)
    fcm_values = fcm_results[FEATURE_COLUMNS].to_numpy(dtype=float)
    memberships = fcm_results[MEMBERSHIP_COLUMNS].to_numpy(dtype=float)
    if not np.isfinite(scaled_values).all() or not np.isfinite(fcm_values).all():
        raise ValueError("Stored training features contain non-finite values.")
    if not np.isfinite(memberships).all() or (memberships < 0).any():
        raise ValueError("Stored FCM memberships must be finite and non-negative.")
    if not np.allclose(scaled_values, fcm_values, atol=1e-10, rtol=0.0):
        raise ValueError("Scaled training data and FCM feature columns are not row-aligned.")
    if not np.allclose(memberships.sum(axis=1), 1.0, atol=1e-6, rtol=0.0):
        raise ValueError("Stored FCM membership rows must sum approximately to 1.")
    expected_knn = fcm_results[
        FEATURE_COLUMNS + MEMBERSHIP_COLUMNS
    ].to_numpy(dtype=float)
    if not np.allclose(
        expected_knn,
        np.asarray(training_matrix, dtype=float),
        atol=1e-10,
        rtol=0.0,
    ):
        raise ValueError("Serialized KNN training rows do not match FCM results.")

    rebuilt_scaled = np.vstack(
        [
            preprocess_raw_laptop(
                {
                    "Price_euros": row["Price_euros"],
                    "Ram": row["Ram"],
                    "Weight": row["Weight"],
                    "Memory": row["Memory"],
                    "Cpu": row["Cpu"],
                },
                scaler,
            )[0]
            for _, row in original.iterrows()
        ]
    )
    if not np.allclose(
        rebuilt_scaled,
        scaled_values,
        atol=1e-10,
        rtol=0.0,
    ):
        raise ValueError(
            "Original dataset preprocessing does not preserve FCM row alignment."
        )

    return ModelBundle(
        scaler=scaler,
        knn_model=knn_model,
        fcm_centers=centers,
        manifest=manifest,
        original_dataset=original,
        scaled_features=scaled,
        fcm_results=fcm_results,
    )


@lru_cache(maxsize=1)
def get_model_bundle() -> ModelBundle:
    """Load and validate the model resources once per process."""
    return load_model_bundle()
