from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class PostgresConnectionRequest(BaseModel):
    host: str = Field(..., description="PostgreSQL host address (e.g., localhost, db.cloud.com)")
    port: int = Field(default=5432, ge=1, le=65535, description="PostgreSQL port")
    database: str = Field(..., description="Database name")
    username: str = Field(..., description="Database user")
    password: str = Field(..., description="Database password")
    ssl_mode: Optional[str] = Field(default="prefer", description="'disable' | 'allow' | 'prefer' | 'require'")
    table_name: Optional[str] = Field(default=None, description="Optional target table to inspect immediately")

class PostgresTestResponse(BaseModel):
    success: bool
    message: str
    server_version: Optional[str] = None
    database: str
    tables_count: int
    tables: List[str]

class PostgresTableSchemaResponse(BaseModel):
    success: bool
    database: str
    table_name: str
    row_count_estimate: int
    columns: List[Dict[str, Any]]

class PostgresConnectResponse(BaseModel):
    success: bool
    dataset_id: str
    dataset_name: str
    database: str
    table_name: str
    row_count: int
    column_count: int
    columns: List[Dict[str, Any]]
