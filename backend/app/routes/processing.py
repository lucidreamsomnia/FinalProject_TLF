import logging

from fastapi import APIRouter, HTTPException

from backend.app.services.model_loader import get_model_bundle
from backend.app.services.recommendation_service import (
    LaptopPreferences,
    recommend_laptops,
)
from backend.app.services.ui_service import processing_data


router = APIRouter(prefix="/processing", tags=["processing"])
logger = logging.getLogger(__name__)
_last_status = "waiting"
_last_message = (
    "Model resources are ready; no demonstration process has been requested."
)


@router.get("")
def get_processing():
    global _last_status, _last_message
    try:
        bundle = get_model_bundle()
    except (FileNotFoundError, OSError, ValueError, RuntimeError) as exc:
        _last_status = "failed"
        _last_message = "Model resources are unavailable."
        logger.exception("Processing resources are unavailable: %s", exc)
        raise HTTPException(status_code=503, detail=_last_message) from exc
    return processing_data(bundle, _last_status, _last_message)


@router.post("/run")
def run_processing():
    global _last_status, _last_message
    try:
        _last_status = "processing"
        bundle = get_model_bundle()
        demo_profile = LaptopPreferences(
            max_budget_eur=1200,
            ram_gb=16,
            weight_kg=2,
            ssd_gb=512,
            hdd_gb=0,
            cpu_family="Intel Core i5",
            cpu_base_ghz=2.5,
        )
        results = recommend_laptops(
            demo_profile,
            bundle,
            top_n=5,
        )
        _last_status = "completed"
        _last_message = (
            "Bounded demonstration recommendation computation completed."
        )
        payload = processing_data(bundle, _last_status, _last_message)
        payload["run"] = {
            "recommendation_count": len(results),
            "distances": [result.distance for result in results],
        }
        return payload
    except (FileNotFoundError, OSError, ValueError) as exc:
        _last_status = "failed"
        _last_message = "Demonstration processing failed."
        logger.exception("Demonstration processing failed: %s", exc)
        raise HTTPException(status_code=503, detail=_last_message) from exc
