from fastapi import APIRouter, UploadFile, File, Query, status
from app.schemas.datasets import (
    DatasetResponse,
    DatasetListResponse,
    DatasetPreviewResponse
)
from app.services.validator_service import validator_service
from app.services.dataset_service import dataset_service

router = APIRouter(prefix="/datasets", tags=["Datasets"])

@router.post(
    "/upload",
    response_model=DatasetResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload & Profile Dataset",
    description="Upload CSV or Excel dataset, perform automated validation, schema inference, and column profiling."
)
async def upload_dataset(file: UploadFile = File(...)) -> DatasetResponse:
    # 1. Validate file extension and metadata
    ext = validator_service.validate_file_metadata(file)

    # 2. Read file bytes
    content = await file.read()

    # 3. Validate content, size, encoding, structural correctness
    df = validator_service.validate_file_content(content, ext)

    # 4. Profile schema, save file and register catalog entry
    dataset_meta = dataset_service.profile_and_save(
        filename=file.filename or "dataset.csv",
        content=content,
        df=df,
        ext=ext
    )

    return dataset_meta

@router.get(
    "",
    response_model=DatasetListResponse,
    summary="List All Datasets",
    description="Retrieve high-level catalog summaries of all uploaded datasets."
)
async def list_datasets() -> DatasetListResponse:
    return dataset_service.list_datasets()

@router.get(
    "/{dataset_id}",
    response_model=DatasetResponse,
    summary="Get Dataset Metadata & Column Profiles",
    description="Fetch comprehensive schema statistics, data types, and null counts for a dataset."
)
async def get_dataset(dataset_id: str) -> DatasetResponse:
    return dataset_service.get_dataset(dataset_id)

@router.get(
    "/{dataset_id}/preview",
    response_model=DatasetPreviewResponse,
    summary="Preview Dataset Rows",
    description="Retrieve the top N tabular records for data visualization or grid inspection."
)
async def preview_dataset(
    dataset_id: str,
    limit: int = Query(default=50, ge=1, le=500, description="Number of rows to return")
) -> DatasetPreviewResponse:
    return dataset_service.get_preview(dataset_id, limit=limit)
