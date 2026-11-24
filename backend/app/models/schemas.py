from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


class PreferenceRequest(BaseModel):
    budget_idr: float = Field(ge=0)
    ram_gb: float = Field(ge=0)
    ssd_gb: float = Field(ge=0)
    hdd_gb: float = Field(ge=0)
    weight_kg: float = Field(ge=0)
    cpu_family: str
    cpu_base_ghz: float = Field(ge=0)

    @field_validator(
        "budget_idr",
        "ram_gb",
        "ssd_gb",
        "hdd_gb",
        "weight_kg",
        "cpu_base_ghz",
    )
    @classmethod
    def finite_number(cls, value: float) -> float:
        if value != value or value in (float("inf"), float("-inf")):
            raise ValueError("Value must be finite.")
        return value

    @field_validator("cpu_family")
    @classmethod
    def non_empty_cpu_family(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("cpu_family must not be empty.")
        return value


class RecommendationRequest(PreferenceRequest):
    top_n: int = Field(default=5, ge=1, le=1303)


class RecommendationItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    rank: int
    row_index: int
    company: Any
    product: Any
    price_eur: float
    price_idr: float
    ram: Any
    weight: Any
    memory: Any
    cpu: Any
    cpu_base_ghz: float
    fcm_cluster: int
    memberships: list[float]
    query_memberships: list[float]
    laptop_memberships: list[float]
    distance: float
    within_budget: bool


class RecommendationResponse(BaseModel):
    budget_idr: float
    budget_eur: float
    recommendations: list[RecommendationItem]


class ValidationResponse(BaseModel):
    valid: bool
    budget_idr: float
    budget_eur: float
    values: dict[str, Any]


class UploadValidationResponse(BaseModel):
    valid: bool
    filename: str
    row_count: int
    columns: list[str]
    preview: list[dict[str, Any]]
    errors: list[str]


class CatalogItem(BaseModel):
    row_index: int
    company: Any
    product: Any
    type_name: Any
    price_eur: float
    price_idr: float
    ram: Any
    memory: Any
    cpu: Any
    weight: Any


class CatalogResponse(BaseModel):
    items: list[CatalogItem]
    page: int
    page_size: int
    total_records: int
    total_pages: int

