from fastapi import APIRouter, status, Query
from typing import Optional

from app.schemas.history import HistoryItemCreate, HistoryItemResponse, HistoryListResponse
from app.services.history_service import history_service
from app.utils.exceptions import AppException
from app.utils.logger import logger

router = APIRouter(prefix="/history", tags=["Analysis History"])

@router.get(
    "",
    response_model=HistoryListResponse,
    status_code=status.HTTP_200_OK,
    summary="List and search analysis history",
    description="Returns paginated historical analytical questions, answers, SQL, and chart configurations."
)
def list_history(
    q: Optional[str] = Query(default=None, description="Search keyword in question or dataset name"),
    analysis_type: Optional[str] = Query(default=None, description="Filter by analysis method"),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0)
) -> HistoryListResponse:
    return history_service.list_entries(query=q, analysis_type=analysis_type, limit=limit, offset=offset)

@router.post(
    "",
    response_model=HistoryItemResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record analysis history entry"
)
def create_history_entry(entry: HistoryItemCreate) -> HistoryItemResponse:
    return history_service.add_entry(entry)

@router.get(
    "/{item_id}",
    response_model=HistoryItemResponse,
    status_code=status.HTTP_200_OK,
    summary="Get single history entry"
)
def get_history_entry(item_id: str) -> HistoryItemResponse:
    item = history_service.get_entry(item_id)
    if not item:
        raise AppException("History entry not found", status_code=status.HTTP_404_NOT_FOUND)
    return item

@router.delete(
    "/{item_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete analysis history entry"
)
def delete_history_entry(item_id: str):
    success = history_service.delete_entry(item_id)
    if not success:
        raise AppException("History entry not found", status_code=status.HTTP_404_NOT_FOUND)
    return {"success": True, "message": "Analysis history item deleted."}

@router.delete(
    "",
    status_code=status.HTTP_200_OK,
    summary="Clear all analysis history"
)
def clear_history():
    history_service.clear_all()
    return {"success": True, "message": "Analysis history cleared."}
