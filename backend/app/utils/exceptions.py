from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from typing import Any, Dict, Optional

class AppException(Exception):
    """Base application exception with error code and status code."""
    def __init__(
        self,
        message: str,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        code: str = "BAD_REQUEST",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.code = code
        self.details = details or {}

class DatasetValidationError(AppException):
    """Raised when an uploaded dataset fails validation."""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_400_BAD_REQUEST,
            code="DATASET_VALIDATION_ERROR",
            details=details
        )

class DatasetNotFoundError(AppException):
    """Raised when a requested dataset is not found in the catalog."""
    def __init__(self, dataset_id: str):
        super().__init__(
            message=f"Dataset with ID '{dataset_id}' was not found.",
            status_code=status.HTTP_404_NOT_FOUND,
            code="DATASET_NOT_FOUND",
            details={"dataset_id": dataset_id}
        )

def _cors_headers(request: Request) -> Dict[str, str]:
    origin = request.headers.get("origin")
    if origin in ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000", "http://127.0.0.1:3000"]:
        return {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*"
        }
    return {"Access-Control-Allow-Origin": "*"}

async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        headers=_cors_headers(request),
        content={
            "success": False,
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details
            }
        }
    )

async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        headers=_cors_headers(request),
        content={
            "success": False,
            "error": {
                "code": "REQUEST_VALIDATION_ERROR",
                "message": "Invalid request payload parameters.",
                "details": {"errors": exc.errors()}
            }
        }
    )

async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        headers=_cors_headers(request),
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected internal server error occurred.",
                "details": {"error_type": type(exc).__name__, "description": str(exc)}
            }
        }
    )
