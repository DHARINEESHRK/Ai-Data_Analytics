from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Union

class VisualizationRequest(BaseModel):
    dataset_id: str = Field(..., description="Target dataset ID")
    chart_type: str = Field(
        ..., 
        description="'bar' | 'line' | 'pie' | 'scatter' | 'histogram' | 'area' | 'kpi' | 'table'"
    )
    x_column: Optional[str] = Field(default=None, description="Primary X axis, category, date, or dimension column")
    y_column: Optional[str] = Field(default=None, description="Primary Y axis, metric, or value column")
    group_by_column: Optional[str] = Field(default=None, description="Optional secondary grouping / color dimension")
    aggregation_func: Optional[str] = Field(default="sum", description="'sum' | 'mean' | 'count' | 'min' | 'max' | 'median'")
    title: Optional[str] = Field(default=None, description="Human-readable chart title")
    description: Optional[str] = Field(default=None, description="Optional chart description or subtitle")
    max_categories: Optional[int] = Field(default=15, ge=3, le=100, description="Max categorical items before grouping into 'Other'")

class VisualizationResponse(BaseModel):
    success: bool
    chart_type: str
    title: str
    description: Optional[str] = None
    plotly_spec: Optional[Dict[str, Any]] = None  # Plotly.js compatible data and layout spec
    recharts_data: Optional[List[Dict[str, Any]]] = None  # Recharts flat rows format
    kpi_data: Optional[Dict[str, Any]] = None  # For KPI chart type
    table_data: Optional[Dict[str, Any]] = None  # For Table chart type
    x_column: Optional[str] = None
    y_column: Optional[str] = None
    execution_time_ms: float
    warning: Optional[str] = None
