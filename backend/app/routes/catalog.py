import logging

from fastapi import APIRouter, HTTPException, Query

from backend.app.models.schemas import CatalogResponse
from backend.app.services.catalog_service import search_catalog
from backend.app.services.model_loader import get_model_bundle


router = APIRouter(tags=["catalog"])
logger = logging.getLogger(__name__)


@router.get("/catalog", response_model=CatalogResponse)
def get_catalog(
    search: str | None = None,
    brand: str | None = None,
    min_price_idr: float | None = Query(default=None, ge=0),
    max_price_idr: float | None = Query(default=None, ge=0),
    ram_gb: float | None = Query(default=None, ge=0),
    storage: str | None = None,
    cpu_family: str | None = None,
    sort: str = "default",
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=8, ge=1, le=100),
):
    try:
        bundle = get_model_bundle()
    except (FileNotFoundError, OSError, ValueError) as exc:
        logger.exception("Catalog resources are unavailable: %s", exc)
        raise HTTPException(
            status_code=503,
            detail="Catalog data is temporarily unavailable.",
        ) from exc
    try:
        return search_catalog(
            bundle,
            search=search,
            brand=brand,
            min_price_idr=min_price_idr,
            max_price_idr=max_price_idr,
            ram_gb=ram_gb,
            storage=storage,
            cpu_family=cpu_family,
            sort=sort,
            page=page,
            page_size=page_size,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
