import logging

from fastapi import APIRouter, File, HTTPException, UploadFile

from backend.app.models.schemas import (
    PreferenceRequest,
    UploadValidationResponse,
    ValidationResponse,
)
from backend.app.services.input_service import (
    MAX_UPLOAD_BYTES,
    preference_to_numeric,
    validate_csv_upload,
)
from backend.app.services.model_loader import get_model_bundle


router = APIRouter(prefix="/input", tags=["input"])
logger = logging.getLogger(__name__)


@router.post("/validate", response_model=ValidationResponse)
def validate_preferences(request: PreferenceRequest):
    try:
        bundle = get_model_bundle()
    except (FileNotFoundError, OSError, ValueError) as exc:
        logger.exception("Input validation resources are unavailable: %s", exc)
        raise HTTPException(
            status_code=503,
            detail="Input validation is temporarily unavailable.",
        ) from exc
    try:
        budget_eur, values = preference_to_numeric(
            request.model_dump(),
            bundle,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {
        "valid": True,
        "budget_idr": request.budget_idr,
        "budget_eur": budget_eur,
        "values": values,
    }


@router.post("/upload", response_model=UploadValidationResponse)
async def upload_dataset(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="A filename is required.")
    content = await file.read(MAX_UPLOAD_BYTES + 1)
    return validate_csv_upload(file.filename, content)
