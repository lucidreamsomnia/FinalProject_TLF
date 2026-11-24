import logging

from fastapi import APIRouter, HTTPException

from backend.app.models.schemas import RecommendationResponse, RecommendationRequest
from backend.app.services.input_service import preference_to_numeric
from backend.app.services.model_loader import get_model_bundle
from backend.app.services.recommendation_service import (
    LaptopPreferences,
    recommend_laptops,
)


router = APIRouter(tags=["recommendations"])
logger = logging.getLogger(__name__)


@router.post("/recommendations", response_model=RecommendationResponse)
def create_recommendations(request: RecommendationRequest):
    try:
        bundle = get_model_bundle()
    except (FileNotFoundError, OSError, ValueError) as exc:
        logger.exception("Recommendation resources are unavailable: %s", exc)
        raise HTTPException(
            status_code=503,
            detail="Recommendation service is temporarily unavailable.",
        ) from exc
    try:
        budget_eur, values = preference_to_numeric(
            request.model_dump(),
            bundle,
        )
        preferences = LaptopPreferences(
            max_budget_eur=budget_eur,
            ram_gb=values["ram_gb"],
            weight_kg=values["weight_kg"],
            ssd_gb=values["ssd_gb"],
            hdd_gb=values["hdd_gb"],
            cpu_family=values["cpu_family"],
            cpu_base_ghz=values["cpu_base_ghz"],
        )
        recommendations = recommend_laptops(
            preferences,
            bundle,
            top_n=request.top_n,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except RuntimeError as exc:
        logger.exception("Recommendation computation failed: %s", exc)
        raise HTTPException(
            status_code=503,
            detail="Recommendation computation failed.",
        ) from exc
    return {
        "budget_idr": request.budget_idr,
        "budget_eur": budget_eur,
        "recommendations": [recommendation.__dict__ for recommendation in recommendations],
    }
