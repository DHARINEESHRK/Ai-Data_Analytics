from fastapi import APIRouter, status
from app.schemas.analytics import PythonAnalyticsRequest, PythonAnalyticsResponse
from app.tools.python_analytics import python_analytics_engine
from app.utils.logger import logger

router = APIRouter(prefix="/analytics", tags=["Python Analytics Engine"])

@router.post(
    "/execute",
    response_model=PythonAnalyticsResponse,
    status_code=status.HTTP_200_OK,
    summary="Execute Controlled Python Analytics",
    description="Executes predefined analytical operations (correlation, statistics, outliers, aggregation, time series) using Pandas, NumPy, and SciPy."
)
def execute_analytics_operation(request: PythonAnalyticsRequest) -> PythonAnalyticsResponse:
    logger.info(f"Executing Python analytics operation '{request.operation}' on dataset {request.dataset_id}")
    result = python_analytics_engine.execute_operation(request.model_dump())
    return PythonAnalyticsResponse(**result)
