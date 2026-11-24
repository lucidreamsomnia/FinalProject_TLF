import logging

from fastapi import APIRouter, HTTPException

from backend.app.services.model_loader import get_model_bundle
from backend.app.services.ui_service import dashboard_data


router = APIRouter(tags=["dashboard"])
logger = logging.getLogger(__name__)


@router.get("/dashboard")
def get_dashboard():
    try:
        return dashboard_data(get_model_bundle())
    except (FileNotFoundError, OSError, ValueError) as exc:
        logger.exception("Dashboard resources are unavailable: %s", exc)
        raise HTTPException(
            status_code=503,
            detail="Dashboard data is temporarily unavailable.",
        ) from exc
