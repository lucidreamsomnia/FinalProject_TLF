import re
from math import ceil
from typing import Any

import pandas as pd

from backend.app.services.input_service import EUR_TO_IDR
from backend.app.services.model_loader import ModelBundle
from backend.app.services.preprocessing import identify_cpu_family


def _ram_gb(value: object) -> float:
    match = re.search(r"(\d+(?:\.\d+)?)", str(value))
    return float(match.group(1)) if match else float("nan")


def _weight_kg(value: object) -> float:
    match = re.search(r"(\d+(?:\.\d+)?)", str(value))
    return float(match.group(1)) if match else float("nan")


def _item(row: pd.Series, row_index: int) -> dict[str, Any]:
    price = float(row["Price_euros"])
    return {
        "row_index": row_index,
        "company": row["Company"],
        "product": row["Product"],
        "type_name": row["TypeName"],
        "price_eur": price,
        "price_idr": price * EUR_TO_IDR,
        "ram": row["Ram"],
        "memory": row["Memory"],
        "cpu": row["Cpu"],
        "weight": row["Weight"],
    }


def search_catalog(
    bundle: ModelBundle,
    *,
    search: str | None,
    brand: str | None,
    min_price_idr: float | None,
    max_price_idr: float | None,
    ram_gb: float | None,
    storage: str | None,
    cpu_family: str | None,
    sort: str,
    page: int,
    page_size: int,
) -> dict[str, Any]:
    if page < 1:
        raise ValueError("page must be at least 1.")
    if page_size < 1 or page_size > 100:
        raise ValueError("page_size must be between 1 and 100.")
    if (
        min_price_idr is not None
        and max_price_idr is not None
        and min_price_idr > max_price_idr
    ):
        raise ValueError("min_price_idr cannot exceed max_price_idr.")

    frame = bundle.original_dataset.copy()
    frame["_row_index"] = frame.index
    if search:
        term = search.casefold()
        frame = frame[
            frame["Company"].astype(str).str.casefold().str.contains(term, regex=False)
            | frame["Product"].astype(str).str.casefold().str.contains(term, regex=False)
        ]
    if brand:
        frame = frame[frame["Company"].astype(str).str.casefold() == brand.casefold()]
    if min_price_idr is not None:
        frame = frame[frame["Price_euros"] * EUR_TO_IDR >= min_price_idr]
    if max_price_idr is not None:
        frame = frame[frame["Price_euros"] * EUR_TO_IDR <= max_price_idr]
    if ram_gb is not None:
        frame = frame[frame["Ram"].map(_ram_gb) == ram_gb]
    if storage:
        frame = frame[
            frame["Memory"].astype(str).str.casefold().str.contains(
                storage.casefold(), regex=False
            )
        ]
    if cpu_family:
        frame = frame[
            frame["Cpu"].map(identify_cpu_family).str.casefold()
            == identify_cpu_family(cpu_family).casefold()
        ]

    if sort == "price_asc":
        frame = frame.sort_values("Price_euros", kind="stable")
    elif sort == "price_desc":
        frame = frame.sort_values("Price_euros", ascending=False, kind="stable")
    elif sort == "ram_desc":
        frame = frame.assign(_ram=frame["Ram"].map(_ram_gb)).sort_values(
            "_ram", ascending=False, kind="stable"
        )
    elif sort == "weight_asc":
        frame = frame.assign(_weight=frame["Weight"].map(_weight_kg)).sort_values(
            "_weight", kind="stable"
        )
    elif sort != "default":
        raise ValueError("Unsupported sort option.")

    total = len(frame)
    total_pages = ceil(total / page_size) if total else 0
    start = (page - 1) * page_size
    selected = frame.iloc[start : start + page_size]
    return {
        "items": [
            _item(row, int(row["_row_index"]))
            for _, row in selected.iterrows()
        ],
        "page": page,
        "page_size": page_size,
        "total_records": total,
        "total_pages": total_pages,
    }
