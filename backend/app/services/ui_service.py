from typing import Any

import pandas as pd

from backend.app.services.evaluation_service import get_evaluation
from backend.app.services.model_loader import MEMBERSHIP_COLUMNS, ModelBundle
from backend.app.services.preprocessing import parse_memory


def _cluster_profiles(bundle: ModelBundle) -> list[dict[str, Any]]:
    source = bundle.original_dataset
    cluster_labels = bundle.fcm_results["Cluster"].to_numpy(dtype=int)
    ram = pd.to_numeric(
        source["Ram"].astype(str).str.extract(r"(\d+(?:\.\d+)?)", expand=False),
        errors="coerce",
    )
    weight = pd.to_numeric(
        source["Weight"].astype(str).str.extract(r"(\d+(?:\.\d+)?)", expand=False),
        errors="coerce",
    )
    ssd = source["Memory"].map(lambda value: parse_memory(value)["SSD_GB"])

    profiles = []
    for cluster in range(1, 5):
        cluster_rows = cluster_labels == cluster
        profiles.append(
            {
                "cluster": cluster,
                "count": int(cluster_rows.sum()),
                "average_ram_gb": float(ram[cluster_rows].mean()),
                "average_price_eur": float(
                    source.loc[cluster_rows, "Price_euros"].mean()
                ),
                "average_weight_kg": float(weight[cluster_rows].mean()),
                "average_ssd_gb": float(ssd[cluster_rows].mean()),
            }
        )
    return profiles


def dashboard_data(bundle: ModelBundle) -> dict[str, Any]:
    labels = bundle.fcm_results["Cluster"].value_counts().sort_index()
    featured = []
    for row_index in [0, 1]:
        row = bundle.original_dataset.iloc[row_index]
        featured.append(
            {
                "row_index": row_index,
                "company": row["Company"],
                "product": row["Product"],
                "price_eur": float(row["Price_euros"]),
                "ram": row["Ram"],
                "memory": row["Memory"],
                "cpu": row["Cpu"],
                "weight": row["Weight"],
            }
        )
    sample_membership = bundle.fcm_results.iloc[0][MEMBERSHIP_COLUMNS]
    return {
        "summary": {
            "total_laptops": len(bundle.original_dataset),
            "model_features": 7,
            "fcm_clusters": 4,
            "default_recommendations": 5,
            "method": "Hybrid FCM + KNN",
        },
        "cluster_distribution": [
            {"cluster": int(cluster), "count": int(labels.get(cluster, 0))}
            for cluster in range(1, 5)
        ],
        "cluster_profiles": _cluster_profiles(bundle),
        "evaluation": get_evaluation(bundle)["main"],
        "featured_laptops": featured,
        "recommendation_activity": [],
        "activity_is_demo_data": False,
        "sample_membership": {
            column: float(sample_membership[column])
            for column in MEMBERSHIP_COLUMNS
        },
    }


def processing_data(bundle: ModelBundle, status: str, message: str) -> dict[str, Any]:
    manifest = bundle.manifest
    return {
        "status": status,
        "message": message,
        "execution": {
            "mode": "demonstration",
            "description": (
                "The run endpoint executes a bounded recommendation using "
                "a fixed demonstration profile; it does not retrain models."
            ),
        },
        "ready": True,
        "fcm_parameters": manifest["fcm_parameters"],
        "knn_parameters": {
            **manifest["knn_parameters"],
            "training_samples": len(bundle.original_dataset),
            "input_dimensions": 11,
        },
        "pipeline": [
            "Input Data",
            "Preprocessing and Feature Extraction",
            "Log1p Transformation",
            "MinMaxScaler Normalization",
            "Fuzzy C-Means",
            "Membership Degree Calculation",
            "Combine 7 features + 4 memberships",
            "KNN Euclidean Distance",
            "Top-5 Recommendations",
        ],
        "feature_names": manifest["seven_feature_names"],
        "membership_columns": MEMBERSHIP_COLUMNS,
        "cluster_distribution": bundle.fcm_results["Cluster"].value_counts().sort_index().to_dict(),
        "example_membership": {
            column: float(bundle.fcm_results.iloc[0][column])
            for column in MEMBERSHIP_COLUMNS
        },
        "pca": {
            "available": False,
            "message": "PCA visualization coordinates are not available.",
        },
    }
