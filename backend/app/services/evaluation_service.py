import numpy as np
from sklearn.metrics import davies_bouldin_score, silhouette_score

from backend.app.services.model_loader import MEMBERSHIP_COLUMNS, ModelBundle


def get_evaluation(bundle: ModelBundle) -> dict:
    stored_memberships = bundle.fcm_results[MEMBERSHIP_COLUMNS].to_numpy(dtype=float)
    stored_labels = bundle.fcm_results["Cluster"].to_numpy(dtype=int)
    main = {
        "fpc": float(np.mean(np.sum(stored_memberships**2, axis=1))),
        "silhouette": float(
            silhouette_score(
                bundle.scaled_features,
                stored_labels - 1,
            )
        ),
        "davies_bouldin": float(
            davies_bouldin_score(
                bundle.scaled_features,
                stored_labels - 1,
            )
        ),
    }
    return {
        "main": main,
        "cluster_sensitivity": [],
        "fuzziness_sensitivity": [],
        "sensitivity_status": {
            "available": False,
            "message": (
                "Sensitivity results are unavailable because the stored "
                "notebook outputs do not contain verifiable numeric tables. "
                "The API does not rerun FCM experiments."
            ),
        },
        "recommendation_comparison": [
            {
                "profile": "Ekonomis",
                "knn_mae": 0.03240,
                "fcm_knn_mae": 0.03240,
                "jaccard_similarity": 1.0,
            },
            {
                "profile": "Produktivitas",
                "knn_mae": 0.02393,
                "fcm_knn_mae": 0.02393,
                "jaccard_similarity": 1.0,
            },
            {
                "profile": "Performa tinggi",
                "knn_mae": 0.11137,
                "fcm_knn_mae": 0.11357,
                "jaccard_similarity": 0.666667,
            },
        ],
        "pca": {
            "available": False,
            "message": "PCA visualization coordinates are not available.",
        },
    }
