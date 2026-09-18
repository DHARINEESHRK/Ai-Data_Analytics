from fastapi import APIRouter, status
from app.schemas.sql import SQLQueryRequest, SQLQueryResponse
from app.tools.sql_tool import sql_tool
from app.utils.logger import logger

router = APIRouter(prefix="/sql", tags=["SQL Analytics"])

@router.post(
    "/execute",
    response_model=SQLQueryResponse,
    status_code=status.HTTP_200_OK,
    summary="Execute safe analytical SQL",
    description="Executes a sandboxed read-only SQL query against DuckDB in-memory tables."
)
def execute_sql_query(request: SQLQueryRequest) -> SQLQueryResponse:
    logger.info(f"Executing SQL query on dataset {request.dataset_id}: '{request.sql_query}' (limit: {request.row_limit})")
    result = sql_tool.execute_query(
        dataset_id=request.dataset_id,
        sql_query=request.sql_query,
        row_limit=request.row_limit
    )
    return SQLQueryResponse(**result)
