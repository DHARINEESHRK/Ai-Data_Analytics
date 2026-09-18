from fastapi import APIRouter, status
from app.schemas.visualization import VisualizationRequest, VisualizationResponse
from app.tools.visualization_engine import visualization_engine
from app.utils.logger import logger

router = APIRouter(prefix="/visualizations", tags=["Visualization Engine"])

@router.post(
    "/build",
    response_model=VisualizationResponse,
    status_code=status.HTTP_200_OK,
    summary="Build Predefined Visualization",
    description="Generates rich, interactive Plotly specs and Recharts tabular feeds without requiring the LLM to write code."
)
def build_visualization(request: VisualizationRequest) -> VisualizationResponse:
    logger.info(f"Building visualization '{request.chart_type}' for dataset {request.dataset_id}")
    result = visualization_engine.build_chart(
        dataset_id=request.dataset_id,
        chart_type=request.chart_type,
        x_column=request.x_column,
        y_column=request.y_column,
        group_by_column=request.group_by_column,
        aggregation_func=request.aggregation_func or "sum",
        title=request.title,
        description=request.description,
        max_categories=request.max_categories or 15
    )
    return VisualizationResponse(**result)
