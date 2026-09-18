from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List

class CategoryFrequency(BaseModel):
    value: Any
    count: int
    percentage: float

class ColumnStats(BaseModel):
    # Numerical
    min: Optional[Any] = None
    max: Optional[Any] = None
    mean: Optional[float] = None
    median: Optional[float] = None
    std: Optional[float] = None

    # Categorical
    most_frequent: Optional[List[CategoryFrequency]] = None

    # Temporal / Date
    min_date: Optional[str] = None
    max_date: Optional[str] = None

class ColumnMetadata(BaseModel):
    name: str
    dtype: str
    column_type: str = Field(description="numerical, categorical, datetime, boolean, text")
    null_count: int
    null_percentage: float
    unique_count: int
    sample_values: List[Any] = Field(default_factory=list)
    stats: Optional[ColumnStats] = None

class DataQualityMetrics(BaseModel):
    quality_score: float = Field(description="0-100% composite score")
    total_cells: int
    missing_cells: int
    missing_percentage: float
    duplicate_rows: int
    duplicate_percentage: float
    column_type_breakdown: Dict[str, int]

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
    quality: DataQualityMetrics
    columns: List[ColumnMetadata] = Field(default_factory=list)

class DatasetSummaryResponse(BaseModel):
    id: str
    name: str
    filename: str
    format: str
    file_size_formatted: str
    row_count: int
    column_count: int
    quality_score: float
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
