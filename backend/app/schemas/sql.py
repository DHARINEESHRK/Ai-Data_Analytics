from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class SQLQueryRequest(BaseModel):
    dataset_id: str = Field(..., description="Target dataset ID")
    sql_query: str = Field(..., min_length=5, description="Read-only SQL query to execute")
    row_limit: Optional[int] = Field(default=100, ge=1, le=1000, description="Maximum number of rows to return")

class SQLQueryResponse(BaseModel):
    success: bool
    sql: str
    columns: List[str]
    rows: List[Dict[str, Any]]
    execution_time_ms: float
    row_count: int
    total_rows_matched: int
