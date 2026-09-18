from pydantic import BaseModel, Field
from typing import Optional, Dict, Any

class HealthResponse(BaseModel):
    status: str = Field(default="healthy", description="Current status of the backend service")
    app_name: str = Field(..., description="Application name")
    version: str = Field(default="0.1.0", description="API Version")
    debug: bool = Field(..., description="Debug mode indicator")
    environment: Dict[str, Any] = Field(default_factory=dict, description="Configured components status")
