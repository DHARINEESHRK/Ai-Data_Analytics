from fastapi import APIRouter, status
from app.schemas.health import HealthResponse
from app.config.settings import settings

router = APIRouter(tags=["Health"])

@router.get(
    "/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    summary="System Health & Status",
    description="Check backend operational status and service environment."
)
async def check_health() -> HealthResponse:
    return HealthResponse(
        status="healthy",
        app_name=settings.APP_NAME,
        version="0.1.0",
        debug=settings.DEBUG,
        environment={
            "storage_ready": settings.UPLOAD_DIR.exists(),
            "nim_configured": bool(settings.NVIDIA_NIM_API_KEY),
            "nim_model": settings.NVIDIA_NIM_MODEL,
            "max_upload_size_mb": settings.MAX_UPLOAD_SIZE_MB,
            "allowed_extensions": settings.ALLOWED_EXTENSIONS
        }
    )
