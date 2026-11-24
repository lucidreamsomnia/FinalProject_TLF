import logging

from fastapi import APIRouter, HTTPException

from backend.app.services.evaluation_service import get_evaluation
from backend.app.services.model_loader import get_model_bundle


router = APIRouter(tags=["evaluation"])
logger = logging.getLogger(__name__)


@router.get("/evaluation")
def get_model_evaluation():
    try:
        return get_evaluation(get_model_bundle())
    except (FileNotFoundError, OSError, ValueError) as exc:
        logger.exception("Evaluation resources are unavailable: %s", exc)
        raise HTTPException(
            status_code=503,
            detail="Evaluation data is temporarily unavailable.",
        ) from exc
