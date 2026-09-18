from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class ChatHistoryMessage(BaseModel):
    role: str = Field(description="'user' | 'assistant'")
    content: str

class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1, description="User question in natural language")
    dataset_id: Optional[str] = Field(default=None, description="Active dataset ID to ground schema context")
    conversation_history: Optional[List[ChatHistoryMessage]] = Field(default_factory=list, description="Prior conversation context")
    model: Optional[str] = Field(default=None, description="Optional override of NVIDIA NIM model")

class ChartConfigResponse(BaseModel):
    type: str = Field(description="'bar' | 'line' | 'area' | 'pie'")
    xAxisKey: str
    yAxisKey: str
    title: str
    data: List[Dict[str, Any]]

class TableDataResponse(BaseModel):
    columns: List[str]
    rows: List[Dict[str, Any]]

class AgentProgressEvent(BaseModel):
    stage: str
    message: str
    timestamp_ms: int

class ChatResponse(BaseModel):
    answer: str = Field(..., description="Structured AI response grounded in verified data")
    dataset_id: Optional[str] = None
    dataset_name: Optional[str] = None
    model: str = Field(..., description="LLM model used for inference")
    tokens_used: Optional[int] = None
    latency_ms: int = Field(..., description="Inference execution duration in milliseconds")
    steps: List[str] = Field(default_factory=list, description="User-safe execution steps")
    sql: Optional[str] = None
    chart: Optional[ChartConfigResponse] = None
    table_data: Optional[TableDataResponse] = None
    stats: Optional[Dict[str, Any]] = None
    suggested_followups: List[str] = Field(default_factory=list, description="Relevant follow-up analytics questions")
    status: str = Field(default="completed", description="'completed' | 'fallback'")
