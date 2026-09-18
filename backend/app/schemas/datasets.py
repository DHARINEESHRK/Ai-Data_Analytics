from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List

class ColumnStats(BaseModel):
    min: Optional[Any] = None
    max: Optional[Any] = None
    mean: Optional[float] = None
    median: Optional[float] = None
    std: Optional[float] = None

class ColumnMetadata(BaseModel):
    name: str
    dtype: str
    null_count: int
    unique_count: int
    sample_values: List[Any] = Field(default_factory=list)
    stats: Optional[ColumnStats] = None

class DatasetResponse(BaseModel):
    id: str
    name: str
    filename: str
    format: str
    file_size_bytes: int
    file_size_formatted: str
    row_count: int
    column_count: int
    uploaded_at: str
    columns: List[ColumnMetadata] = Field(default_factory=list)

class DatasetSummaryResponse(BaseModel):
    id: str
    name: str
    filename: str
    format: str
    file_size_formatted: str
    row_count: int
    column_count: int
    uploaded_at: str

class DatasetListResponse(BaseModel):
    datasets: List[DatasetSummaryResponse]
    total: int

class DatasetPreviewResponse(BaseModel):
    dataset_id: str
    total_rows: int
    preview_limit: int
    columns: List[str]
    rows: List[Dict[str, Any]]
