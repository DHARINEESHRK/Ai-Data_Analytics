from fastapi import APIRouter
from app.api.v1.endpoints import health, datasets, chat, sql, analytics, visualizations

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(datasets.router)
api_router.include_router(chat.router)
api_router.include_router(sql.router)
api_router.include_router(analytics.router)
api_router.include_router(visualizations.router)



