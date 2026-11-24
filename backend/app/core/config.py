from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[3]

BACKEND_ROOT = PROJECT_ROOT / "backend"
ARTIFACTS_ROOT = BACKEND_ROOT / "artifacts"
DATASET_ROOT = PROJECT_ROOT / "dataset"

FRONTEND_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

API_PREFIX = "/api"
