from fastapi import APIRouter, status
from typing import List, Dict, Any

from app.schemas.postgres import (
    PostgresConnectionRequest,
    PostgresTestResponse,
    PostgresTableSchemaResponse,
    PostgresConnectResponse
)
from app.schemas.datasets import DatasetResponse
from app.services.postgres_service import postgres_service
from app.utils.logger import logger

router = APIRouter(prefix="/postgres", tags=["PostgreSQL Data Source"])

@router.post(
    "/test",
    response_model=PostgresTestResponse,
    status_code=status.HTTP_200_OK,
    summary="Test PostgreSQL Connection",
    description="Tests connectivity to PostgreSQL server and returns list of tables in public schema."
)
def test_postgres_connection(request: PostgresConnectionRequest) -> PostgresTestResponse:
    logger.info(f"Testing PostgreSQL connection to {request.host}:{request.port}/{request.database}")
    result = postgres_service.test_connection(
        host=request.host,
        port=request.port,
        database=request.database,
        username=request.username,
        password=request.password,
        ssl_mode=request.ssl_mode or "prefer"
    )
    return PostgresTestResponse(**result)

@router.post(
    "/schema",
    response_model=PostgresTableSchemaResponse,
    status_code=status.HTTP_200_OK,
    summary="Discover PostgreSQL Table Schema",
    description="Returns columns, data types, and estimated row count for a specific table."
)
def get_postgres_table_schema(request: PostgresConnectionRequest) -> PostgresTableSchemaResponse:
    if not request.table_name:
        from app.utils.exceptions import AppException
        raise AppException("table_name is required for schema discovery.")
    
    result = postgres_service.discover_table_schema(
        host=request.host,
        port=request.port,
        database=request.database,
        username=request.username,
        password=request.password,
        table_name=request.table_name
    )
    return PostgresTableSchemaResponse(**result)

@router.post(
    "/connect",
    response_model=DatasetResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register PostgreSQL Table as Dataset",
    description="Profiles target PostgreSQL table and makes it available to AI Analyst Agent and SQL tools."
)
def connect_postgres_table(request: PostgresConnectionRequest) -> DatasetResponse:
    if not request.table_name:
        from app.utils.exceptions import AppException
        raise AppException("table_name is required to connect as a dataset.")

    dataset = postgres_service.register_postgres_dataset(
        host=request.host,
        port=request.port,
        database=request.database,
        username=request.username,
        password=request.password,
        table_name=request.table_name
    )
    return dataset
