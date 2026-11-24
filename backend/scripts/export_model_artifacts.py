import json
import platform
import re
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.neighbors import NearestNeighbors
from sklearn.preprocessing import MinMaxScaler


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATASET_DIR = PROJECT_ROOT / "dataset"
ARTIFACT_DIR = PROJECT_ROOT / "backend" / "artifacts"

ORIGINAL_DATASET = DATASET_DIR / "laptop_price.csv"
SCALED_DATASET = DATASET_DIR / "laptop_features_scaled.csv"
FCM_RESULTS = DATASET_DIR / "laptop_fcm_results.csv"
FCM_CENTERS = DATASET_DIR / "fcm_centers.npy"

SCALER_FILENAME = "scaler.joblib"
KNN_FILENAME = "knn_model.joblib"
MANIFEST_FILENAME = "model_manifest.json"

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

MEMBERSHIP_COLUMNS = [
    "Membership_Cluster_1",
    "Membership_Cluster_2",
    "Membership_Cluster_3",
    "Membership_Cluster_4",
]

KNN_COLUMNS = FEATURE_COLUMNS + MEMBERSHIP_COLUMNS


def extract_memory(memory):
    memory = str(memory).upper()

    result = {
        "SSD_GB": 0.0,
        "HDD_GB": 0.0,
        "Flash_GB": 0.0,
        "Hybrid_GB": 0.0,
    }

    pattern = (
        r"(\d+(?:\.\d+)?)\s*(TB|GB)\s*"
        r"(SSD|HDD|FLASH STORAGE|HYBRID)"
    )

    matches = re.findall(pattern, memory)

    for capacity, unit, storage_type in matches:
        capacity = float(capacity)

        if unit == "TB":
            capacity *= 1024

        if storage_type == "SSD":
            result["SSD_GB"] += capacity
        elif storage_type == "HDD":
            result["HDD_GB"] += capacity
        elif storage_type == "FLASH STORAGE":
            result["Flash_GB"] += capacity
        elif storage_type == "HYBRID":
            result["Hybrid_GB"] += capacity

    return pd.Series(result)


def identify_cpu_family(cpu):
    cpu = str(cpu).lower()

    if "core i9" in cpu:
        return "Intel Core i9"
    if "core i7" in cpu:
        return "Intel Core i7"
    if "core i5" in cpu:
        return "Intel Core i5"
    if "core i3" in cpu:
        return "Intel Core i3"
    if "core m" in cpu:
        return "Intel Core M"
    if "celeron" in cpu:
        return "Intel Celeron"
    if "pentium" in cpu:
        return "Intel Pentium"
    if "atom" in cpu:
        return "Intel Atom"
    if "ryzen 9" in cpu:
        return "AMD Ryzen 9"
    if "ryzen 7" in cpu:
        return "AMD Ryzen 7"
    if "ryzen 5" in cpu:
        return "AMD Ryzen 5"
    if "ryzen 3" in cpu:
        return "AMD Ryzen 3"
    if "amd" in cpu:
        return "AMD Other"

    return "Other"


def get_scikit_fuzzy_version():
    try:
        import skfuzzy
    except ImportError:
        return None

    return getattr(skfuzzy, "__version__", "installed")


def reconstruct_original_features():
    df = pd.read_csv(ORIGINAL_DATASET, encoding="latin1")

    if len(df) != 1303:
        raise RuntimeError(
            f"Expected 1303 original rows, found {len(df)}."
        )

    df = df.drop(columns=["laptop_ID"])

    df["Ram_GB"] = (
        df["Ram"]
        .str.extract(r"(\d+)", expand=False)
        .astype(float)
    )

    df["Weight_kg"] = (
        df["Weight"]
        .str.extract(r"([\d.]+)", expand=False)
        .astype(float)
    )

    memory_features = df["Memory"].apply(extract_memory)
    df = pd.concat([df, memory_features], axis=1)

    df["CPU_Family"] = df["Cpu"].apply(identify_cpu_family)

    cpu_family_scores = {
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

    df["CPU_Family_Score"] = (
        df["CPU_Family"].map(cpu_family_scores)
    )

    df["CPU_Base_GHz"] = (
        df["Cpu"]
        .str.extract(
            r"(\d+(?:\.\d+)?)\s*GHz",
            flags=re.IGNORECASE,
            expand=False,
        )
        .astype(float)
    )

    features = df[FEATURE_COLUMNS].copy()

    if features.isna().any().any():
        missing = features.isna().sum().to_dict()
        raise RuntimeError(
            "Missing values found in reconstructed features: "
            f"{missing}"
        )

    return features


def validate_scaler(features):
    features = features.copy()
    features[LOG_COLUMNS] = np.log1p(features[LOG_COLUMNS])

    scaler = MinMaxScaler()
    scaled_matrix = scaler.fit_transform(features)

    stored_scaled = pd.read_csv(SCALED_DATASET)

    if stored_scaled.columns.tolist() != FEATURE_COLUMNS:
        raise RuntimeError(
            "Stored scaled CSV column order differs from the "
            f"expected feature order: {stored_scaled.columns.tolist()}"
        )

    if stored_scaled.shape != (1303, 7):
        raise RuntimeError(
            "Expected stored scaled data with shape (1303, 7), "
            f"found {stored_scaled.shape}."
        )

    max_difference = float(
        np.max(
            np.abs(
                scaled_matrix
                - stored_scaled.to_numpy(dtype=float)
            )
        )
    )

    print(
        f"Maximum scaler difference: {max_difference:.17g}"
    )

    if max_difference > 1e-10:
        raise RuntimeError(
            "Scaler validation failed: maximum absolute difference "
            f"{max_difference:.17g} exceeds 1e-10."
        )

    return scaler, stored_scaled


def validate_row_alignment(stored_scaled, fcm_results):
    if fcm_results.shape[0] != 1303:
        raise RuntimeError(
            f"Expected 1303 FCM result rows, found "
            f"{fcm_results.shape[0]}."
        )

    missing_columns = [
        column
        for column in FEATURE_COLUMNS
        if column not in fcm_results.columns
    ]

    if missing_columns:
        raise RuntimeError(
            f"Missing seven scaled feature columns: {missing_columns}"
        )

    fcm_features = fcm_results[FEATURE_COLUMNS].to_numpy(
        dtype=float
    )

    stored_features = stored_scaled.to_numpy(dtype=float)

    if not np.allclose(
        stored_features,
        fcm_features,
        atol=1e-10,
        rtol=0.0,
    ):
        max_difference = float(
            np.max(
                np.abs(
                    stored_features
                    - fcm_features
                )
            )
        )

        raise RuntimeError(
            "Row alignment validation failed: "
            "laptop_features_scaled.csv and the seven FCM feature "
            "columns differ. "
            f"Maximum absolute difference: "
            f"{max_difference:.17g}"
        )

    print(
        "Row alignment validation passed: "
        "scaled features match in numerical value and row order."
    )


def validate_memberships(fcm_results):
    missing_columns = [
        column
        for column in MEMBERSHIP_COLUMNS
        if column not in fcm_results.columns
    ]

    if missing_columns:
        raise RuntimeError(
            f"Missing FCM membership columns: {missing_columns}"
        )

    membership = fcm_results[
        MEMBERSHIP_COLUMNS
    ].to_numpy(dtype=float)

    if not np.isfinite(membership).all():
        raise RuntimeError(
            "FCM membership validation failed: "
            "membership columns contain non-finite values."
        )

    if np.any(membership < 0):
        raise RuntimeError(
            "FCM membership validation failed: "
            "one or more membership values are negative."
        )

    membership_sums = membership.sum(axis=1)

    if not np.allclose(
        membership_sums,
        np.ones(len(membership)),
        atol=1e-6,
        rtol=0.0,
    ):
        max_row_error = float(
            np.max(
                np.abs(
                    membership_sums
                    - np.ones(len(membership))
                )
            )
        )

        raise RuntimeError(
            "FCM membership validation failed: "
            "membership rows do not sum to approximately 1.0. "
            f"Maximum row sum error: {max_row_error:.17g}"
        )

    print(
        "FCM membership validation passed: "
        "finite, non-negative, and row sums approximately equal 1."
    )


def export_artifacts():
    if not FCM_CENTERS.is_file():
        raise RuntimeError(
            f"Existing FCM centers file not found: {FCM_CENTERS}"
        )

    features = reconstruct_original_features()
    scaler, stored_scaled = validate_scaler(features)

    fcm_results = pd.read_csv(FCM_RESULTS)

    validate_row_alignment(stored_scaled, fcm_results)
    validate_memberships(fcm_results)

    missing_knn_columns = [
        column
        for column in KNN_COLUMNS
        if column not in fcm_results.columns
    ]

    if missing_knn_columns:
        raise RuntimeError(
            f"Missing KNN columns: {missing_knn_columns}"
        )

    knn_training_matrix = fcm_results[
        KNN_COLUMNS
    ].copy()

    if knn_training_matrix.isna().any().any():
        raise RuntimeError(
            "KNN training matrix contains missing values."
        )

    if not np.isfinite(
        knn_training_matrix.to_numpy(dtype=float)
    ).all():
        raise RuntimeError(
            "KNN training matrix contains non-finite values."
        )

    knn_model = NearestNeighbors(
        n_neighbors=5,
        metric="euclidean",
        algorithm="brute",
    )
    knn_model.fit(knn_training_matrix)

    manifest = {
        "versions": {
            "python": platform.python_version(),
            "python_full": sys.version,
            "numpy": np.__version__,
            "pandas": pd.__version__,
            "scikit_learn": sklearn.__version__,
            "scikit_fuzzy": get_scikit_fuzzy_version(),
        },
        "dataset": {
            "filename": ORIGINAL_DATASET.name,
            "row_count": 1303,
        },
        "seven_feature_names": FEATURE_COLUMNS,
        "log1p_columns": LOG_COLUMNS,
        "knn_feature_names": KNN_COLUMNS,
        "fcm_parameters": {
            "c": 4,
            "m": 2.0,
            "error": 0.005,
            "maxiter": 1000,
            "seed": 42,
        },
        "knn_parameters": {
            "n_neighbors": 5,
            "metric": "euclidean",
            "algorithm": "brute",
        },
        "artifacts": {
            "scaler": SCALER_FILENAME,
            "knn_model": KNN_FILENAME,
            "fcm_centers": "dataset/fcm_centers.npy",
            "manifest": MANIFEST_FILENAME,
        },
    }

    output_paths = [
        ARTIFACT_DIR / SCALER_FILENAME,
        ARTIFACT_DIR / KNN_FILENAME,
        ARTIFACT_DIR / MANIFEST_FILENAME,
    ]

    existing_outputs = [
        str(path)
        for path in output_paths
        if path.exists()
    ]

    if existing_outputs:
        raise RuntimeError(
            "Refusing to overwrite existing artifacts: "
            + ", ".join(existing_outputs)
        )

    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)

    joblib.dump(
        scaler,
        ARTIFACT_DIR / SCALER_FILENAME,
    )
    joblib.dump(
        knn_model,
        ARTIFACT_DIR / KNN_FILENAME,
    )

    with (ARTIFACT_DIR / MANIFEST_FILENAME).open(
        "w",
        encoding="utf-8",
    ) as manifest_file:
        json.dump(
            manifest,
            manifest_file,
            indent=2,
            ensure_ascii=False,
        )

    print(
        f"Saved scaler: "
        f"{ARTIFACT_DIR / SCALER_FILENAME}"
    )
    print(
        f"Saved KNN model: "
        f"{ARTIFACT_DIR / KNN_FILENAME}"
    )
    print(
        f"Saved manifest: "
        f"{ARTIFACT_DIR / MANIFEST_FILENAME}"
    )


if __name__ == "__main__":
    export_artifacts()
