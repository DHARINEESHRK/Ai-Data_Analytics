from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class HistoryItemCreate(BaseModel):
    question: str
    dataset_id: str
    dataset_name: str
    answer: str
    direct_answer: Optional[str] = None
    key_insight: Optional[str] = None
    analysis_type: Optional[str] = "SQL Aggregation"
    sql: Optional[str] = None
    chart_config: Optional[Dict[str, Any]] = None
    duration_ms: Optional[int] = 0

class HistoryItemResponse(BaseModel):
    id: str
    question: str
    dataset_id: str
    dataset_name: str
    timestamp: str
    answer: str
    direct_answer: Optional[str] = None
    key_insight: Optional[str] = None
    analysis_type: str
    sql: Optional[str] = None
    chart_config: Optional[Dict[str, Any]] = None
    duration_ms: int

class HistoryListResponse(BaseModel):
    total: int
    items: List[HistoryItemResponse]
