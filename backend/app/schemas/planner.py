from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Literal

class PlanFilter(BaseModel):
    column: str = Field(..., description="Column to filter on")
    operator: str = Field(default="=", description="Comparison operator (=, !=, >, <, >=, <=, IN, LIKE)")
    value: Any = Field(..., description="Filter value or list of values")

class AnalysisPlan(BaseModel):
    """Structured Analysis Plan produced by QueryLens AI Planner."""
    intent: str = Field(
        ...,
        description=(
            "Analytical intent: 'general_question' | 'schema_inspection' | 'data_quality' | "
            "'aggregation' | 'ranking' | 'filtering' | 'comparison' | 'time_series' | "
            "'percentage_analysis' | 'descriptive_statistics' | 'correlation' | "
            "'outlier_detection' | 'trend_analysis' | 'multi_step_analysis'"
        )
    )
    metric_columns: List[str] = Field(
        default_factory=list,
        description="Mapped numerical/measurable columns from the actual dataset"
    )
    dimension_columns: List[str] = Field(
        default_factory=list,
        description="Mapped categorical/grouping columns from the actual dataset"
    )
    time_column: Optional[str] = Field(
        default=None,
        description="Mapped temporal/date column from the actual dataset"
    )
    filters: List[PlanFilter] = Field(
        default_factory=list,
        description="Row filters to apply"
    )
    aggregation: Optional[str] = Field(
        default=None,
        description="Aggregation function: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'median'"
    )
    time_granularity: Optional[str] = Field(
        default=None,
        description="Time interval: 'day' | 'week' | 'month' | 'quarter' | 'year'"
    )
    comparison: Optional[str] = Field(
        default=None,
        description="Comparison type: 'year_over_year' | 'period_over_period' | 'category' | None"
    )
    sort: Optional[str] = Field(
        default=None,
        description="Sort direction: 'asc' | 'desc'"
    )
    limit: Optional[int] = Field(
        default=None,
        description="Maximum rows to retrieve (safe limit between 1 and 1000)"
    )
    visualization: Optional[str] = Field(
        default=None,
        description="Optimal visualization: 'bar' | 'line' | 'pie' | 'scatter' | 'histogram' | 'area' | 'kpi' | 'table'"
    )
    ambiguity_detected: bool = Field(
        default=False,
        description="True if multiple columns could represent the concept and user clarification is required"
    )
    ambiguous_columns: List[str] = Field(
        default_factory=list,
        description="Candidate columns causing ambiguity"
    )
    clarification_question: Optional[str] = Field(
        default=None,
        description="Polite clarifying question presented to the user"
    )
    missing_required_capability: Optional[str] = Field(
        default=None,
        description="Explanation if the dataset lacks a required dimension (e.g. no datetime column for trend analysis)"
    )
    explanation_of_plan: str = Field(
        default="",
        description="Plain-English explanation of how this plan answers the business question"
    )
    steps: List[str] = Field(
        default_factory=list,
        description="Execution steps for multi-step reasoning"
    )

class PlanValidationResult(BaseModel):
    valid: bool
    errors: List[str] = Field(default_factory=list)
    sanitized_plan: Optional[AnalysisPlan] = None
