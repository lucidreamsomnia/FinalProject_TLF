import logging

from fastapi import APIRouter, HTTPException

from backend.app.services.model_loader import get_model_bundle


router = APIRouter(tags=["system"])
logger = logging.getLogger(__name__)


@router.get("/system-info")
def get_system_info():
    try:
        bundle = get_model_bundle()
    except (FileNotFoundError, OSError, ValueError) as exc:
        logger.exception("System information resources are unavailable: %s", exc)
        raise HTTPException(
            status_code=503,
            detail="System information is temporarily unavailable.",
        ) from exc
    return {
        "name": "LAPTOPFIND",
        "description": "Hybrid Fuzzy C-Means and K-Nearest Neighbors laptop recommendation system.",
        "dataset": bundle.manifest["dataset"],
        "feature_names": bundle.manifest["seven_feature_names"],
        "log1p_columns": bundle.manifest["log1p_columns"],
        "fcm_parameters": bundle.manifest["fcm_parameters"],
        "knn_parameters": bundle.manifest["knn_parameters"],
        "versions": bundle.manifest["versions"],
        "artifacts": bundle.manifest["artifacts"],
        "exchange_rate": {"eur_to_idr": 20_000, "is_demonstration_rate": True},
    }
