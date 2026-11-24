from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.core.config import API_PREFIX, FRONTEND_ORIGINS
from backend.app.routes.catalog import router as catalog_router
from backend.app.routes.dashboard import router as dashboard_router
from backend.app.routes.evaluation import router as evaluation_router
from backend.app.routes.health import router as health_router
from backend.app.routes.input_data import router as input_router
from backend.app.routes.processing import router as processing_router
from backend.app.routes.recommendations import router as recommendations_router
from backend.app.routes.system_info import router as system_info_router


app = FastAPI(
    title="LAPTOPFIND API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(
    health_router,
    prefix=API_PREFIX,
)
app.include_router(dashboard_router, prefix=API_PREFIX)
app.include_router(input_router, prefix=API_PREFIX)
app.include_router(recommendations_router, prefix=API_PREFIX)
app.include_router(catalog_router, prefix=API_PREFIX)
app.include_router(processing_router, prefix=API_PREFIX)
app.include_router(evaluation_router, prefix=API_PREFIX)
app.include_router(system_info_router, prefix=API_PREFIX)
