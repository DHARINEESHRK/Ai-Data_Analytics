from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Union

class PythonAnalyticsRequest(BaseModel):
    dataset_id: str = Field(..., description="Target dataset ID")
    operation: str = Field(
        ..., 
        description="'descriptive_statistics' | 'correlation' | 'group_aggregation' | 'outlier_detection' | 'distribution' | 'time_series'"
    )
    # Parameters for different operations
    columns: Optional[List[str]] = Field(default=None, description="Target numerical or categorical columns")
    x_column: Optional[str] = Field(default=None, description="Primary X axis or feature column")
    y_column: Optional[str] = Field(default=None, description="Target Y axis or metric column")
    group_by_column: Optional[str] = Field(default=None, description="Categorical column for grouping")
    metric_column: Optional[str] = Field(default=None, description="Numerical metric to aggregate")
    aggregation_func: Optional[str] = Field(default="mean", description="'sum' | 'mean' | 'count' | 'min' | 'max' | 'median'")
    time_column: Optional[str] = Field(default=None, description="Datetime column for time-series analysis")
    interval: Optional[str] = Field(default="M", description="'D' (daily) | 'W' (weekly) | 'M' (monthly) | 'Y' (yearly)")
    method: Optional[str] = Field(default="iqr", description="Method for outlier detection ('iqr' | 'zscore')")

class PythonAnalyticsResponse(BaseModel):
    success: bool
    operation: str
    dataset_id: str
    dataset_name: str
    parameters: Dict[str, Any]
    results: Dict[str, Any]
    summary: str
    execution_time_ms: float
