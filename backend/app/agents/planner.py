import re
import json
from typing import List, Dict, Any, Optional, Tuple
from openai import AsyncOpenAI
import httpx

from app.config.settings import settings
from app.schemas.datasets import DatasetResponse
from app.schemas.planner import AnalysisPlan, PlanFilter, PlanValidationResult
from app.utils.logger import logger
from app.utils.exceptions import AppException

class QueryLensValidator:
    """Validates AnalysisPlan against real dataset schema and safety rules."""

    ALLOWED_AGGREGATIONS = {"sum", "avg", "mean", "count", "min", "max", "median", "std"}
    ALLOWED_INTENTS = {
        "general_question", "schema_inspection", "data_quality", "aggregation",
        "ranking", "filtering", "comparison", "time_series", "percentage_analysis",
        "descriptive_statistics", "correlation", "outlier_detection", "trend_analysis",
        "multi_step_analysis"
    }
    ALLOWED_VISUALIZATIONS = {"bar", "line", "pie", "scatter", "histogram", "area", "kpi", "table"}

    @classmethod
    def validate(cls, plan: AnalysisPlan, dataset: DatasetResponse) -> PlanValidationResult:
        errors: List[str] = []
        actual_cols = {c.name: c for c in dataset.columns}
        actual_col_names_lower = {c.name.lower(): c.name for c in dataset.columns}

        # Validate Intent
        if plan.intent not in cls.ALLOWED_INTENTS:
            errors.append(f"Unsupported analytical intent: '{plan.intent}'")

        # Skip column validation if clarification is required or missing capability is reported
        if plan.ambiguity_detected or plan.missing_required_capability:
            return PlanValidationResult(valid=True, errors=[], sanitized_plan=plan)

        # Validate Metric Columns
        sanitized_metrics = []
        for col in plan.metric_columns:
            if col in actual_cols:
                sanitized_metrics.append(col)
            elif col.lower() in actual_col_names_lower:
                sanitized_metrics.append(actual_col_names_lower[col.lower()])
            else:
                errors.append(f"Referenced metric column '{col}' does not exist in dataset '{dataset.name}'.")

        # Validate Dimension Columns
        sanitized_dims = []
        for col in plan.dimension_columns:
            if col in actual_cols:
                sanitized_dims.append(col)
            elif col.lower() in actual_col_names_lower:
                sanitized_dims.append(actual_col_names_lower[col.lower()])
            else:
                errors.append(f"Referenced dimension column '{col}' does not exist in dataset '{dataset.name}'.")

        # Validate Time Column
        sanitized_time_col = None
        if plan.time_column:
            if plan.time_column in actual_cols:
                sanitized_time_col = plan.time_column
            elif plan.time_column.lower() in actual_col_names_lower:
                sanitized_time_col = actual_col_names_lower[plan.time_column.lower()]
            else:
                errors.append(f"Referenced time column '{plan.time_column}' does not exist in dataset '{dataset.name}'.")

        # Validate Aggregation
        if plan.aggregation and plan.aggregation.lower() not in cls.ALLOWED_AGGREGATIONS:
            errors.append(f"Unsupported aggregation: '{plan.aggregation}'. Allowed: {', '.join(cls.ALLOWED_AGGREGATIONS)}")

        # Validate Visualization
        if plan.visualization and plan.visualization.lower() not in cls.ALLOWED_VISUALIZATIONS:
            errors.append(f"Unsupported visualization: '{plan.visualization}'. Allowed: {', '.join(cls.ALLOWED_VISUALIZATIONS)}")

        # Enforce Safe Limit
        sanitized_limit = plan.limit
        if sanitized_limit is not None:
            if sanitized_limit < 1:
                sanitized_limit = 10
            elif sanitized_limit > 1000:
                sanitized_limit = 1000

        sanitized_plan = plan.model_copy(update={
            "metric_columns": sanitized_metrics,
            "dimension_columns": sanitized_dims,
            "time_column": sanitized_time_col,
            "aggregation": plan.aggregation.lower() if plan.aggregation else None,
            "visualization": plan.visualization.lower() if plan.visualization else None,
            "limit": sanitized_limit
        })

        is_valid = len(errors) == 0
        return PlanValidationResult(valid=is_valid, errors=errors, sanitized_plan=sanitized_plan if is_valid else None)


class QueryLensPlanner:
    """NVIDIA NIM-powered semantic planning layer translating natural business language into structured execution plans."""

    def __init__(self):
        self.timeout_seconds = 35.0

    def _get_client(self) -> Optional[AsyncOpenAI]:
        api_key = settings.NVIDIA_NIM_API_KEY.strip()
        if not api_key:
            return None
        return AsyncOpenAI(
            base_url=settings.NVIDIA_NIM_BASE_URL,
            api_key=api_key,
            http_client=httpx.AsyncClient(timeout=self.timeout_seconds)
        )

    def build_grounded_context(self, dataset: DatasetResponse) -> str:
        """Constructs concise, privacy-safe dataset context without exposing entire files."""
        col_descriptions = []
        for c in dataset.columns:
            samples = ", ".join([f"'{s}'" for s in c.sample_values[:3]])
            col_descriptions.append(
                f"- \"{c.name}\" (type: {c.column_type}, dtype: {c.dtype}, nulls: {c.null_count}, uniques: {c.unique_count}) | Samples: [{samples}]"
            )

        context = (
            f"Dataset: \"{dataset.name}\"\n"
            f"Total Records: {dataset.row_count:,} rows | Columns: {dataset.column_count}\n"
            f"Data Quality: {dataset.quality.quality_score}% (Missing Cells: {dataset.quality.missing_cells}, Duplicate Rows: {dataset.quality.duplicate_rows})\n"
            f"Columns and Profiles:\n" + "\n".join(col_descriptions)
        )
        return context

    async def create_plan(
        self,
        question: str,
        dataset: DatasetResponse,
        model_override: Optional[str] = None
    ) -> AnalysisPlan:
        """Generates a structured, validated AnalysisPlan using NVIDIA NIM."""
        q_lower = question.lower()
        client = self._get_client()

        # Empirical metadata inspection if client is not configured
        if not client:
            if any(k in q_lower for k in ["what columns", "columns are", "which columns", "show columns", "schema", "fields", "structure", "tell me about"]):
                return AnalysisPlan(
                    intent="schema_inspection",
                    explanation_of_plan="Empirical dataset schema and column breakdown from real profile metadata."
                )
            if any(k in q_lower for k in ["missing", "null", "duplicate", "data quality", "quality score"]):
                return AnalysisPlan(
                    intent="data_quality",
                    explanation_of_plan="Empirical dataset quality and missing-value assessment from real profile metadata."
                )
            raise AppException(
                "AI analysis is currently unavailable. Please check the NVIDIA NIM connection."
            )

        model = model_override or settings.NVIDIA_NIM_MODEL
        dataset_context = self.build_grounded_context(dataset)

        system_prompt = (
            "You are QueryLens AI Planner, an expert data analytics planner designed for non-technical users.\n"
            "Your objective is to examine the user's natural language question and the REAL dataset schema, then output a structured JSON analysis plan.\n\n"
            "CRITICAL RULES:\n"
            "1. SEMANTIC COLUMN MAPPING: Map natural concepts to REAL columns in the dataset. Never assume standard names like 'sales' or 'revenue'. Use the exact column names provided.\n"
            "2. AMBIGUITY DETECTION: If the user asks a broad question (e.g., 'What were our sales?') and multiple columns could represent the metric (e.g. 'Gross Sales', 'Net Sales', 'Revenue'), set 'ambiguity_detected': true, populate 'ambiguous_columns', and provide a polite 'clarification_question' asking which metric they prefer.\n"
            "3. MISSING CAPABILITY: If the user asks for time series, monthly, or yearly trends, but the dataset lacks a datetime or date column, set 'missing_required_capability' explaining that no date/time column is available, and set 'intent': 'general_question'.\n"
            "4. DATA QUALITY QUESTIONS: If the user asks 'What values are missing?', 'Which columns have missing data?', 'Are there duplicates?', or about data quality, set 'intent': 'data_quality'.\n"
            "5. SCHEMA QUESTIONS: If the user asks 'What columns are in this dataset?', 'What data do I have?', or 'Tell me about this dataset', set 'intent': 'schema_inspection'.\n"
            "6. TIME SERIES QUESTIONS: For monthly or yearly trends (e.g. 'Show yearly sales by month'), set 'intent': 'time_series', identify the time column, set 'time_granularity' (e.g. 'month'), aggregation ('sum'), and 'visualization': 'line' or 'area'.\n"
            "7. VISUALIZATIONS: Recommend the optimal chart:\n"
            "   - 'line' or 'area' for time series / trends\n"
            "   - 'bar' for categorical rankings and comparisons\n"
            "   - 'pie' for part-to-whole / percentage breakdowns\n"
            "   - 'scatter' for bivariate correlations\n"
            "   - 'histogram' for numerical distributions\n"
            "   - 'kpi' for single aggregated metrics (e.g. total revenue, overall average)\n"
            "   - 'table' for detailed record listings\n"
            "8. OUTPUT FORMAT: Respond ONLY with a valid JSON object matching the AnalysisPlan schema. No markdown formatting outside the JSON, no commentary."
        )

        user_prompt = (
            f"DATASET CONTEXT:\n{dataset_context}\n\n"
            f"USER QUESTION: \"{question}\"\n\n"
            "Produce the structured JSON analysis plan now:"
        )

        max_attempts = 2
        last_error = ""

        for attempt in range(1, max_attempts + 1):
            try:
                res = await client.chat.completions.create(
                    model=model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt if attempt == 1 else f"{user_prompt}\n\nPREVIOUS ERROR: {last_error}\nEnsure strictly valid JSON."}
                    ],
                    temperature=0.1,
                    max_tokens=600
                )
                raw_content = res.choices[0].message.content or ""
                plan_json = self._extract_json(raw_content)
                plan = AnalysisPlan.model_validate(plan_json)

                # Validate against dataset schema
                val_result = QueryLensValidator.validate(plan, dataset)
                if val_result.valid and val_result.sanitized_plan:
                    return val_result.sanitized_plan
                else:
                    last_error = f"Schema validation errors: {', '.join(val_result.errors)}"
                    logger.warning(f"Planner attempt #{attempt} produced schema mismatches: {last_error}")

            except Exception as e:
                last_error = str(e)
                logger.warning(f"Planner attempt #{attempt} failed: {e}")

        # If LLM failed after retries, raise clear exception rather than fabricating
        raise AppException(f"Could not generate a valid analysis plan for your question. Error: {last_error}")

    def _extract_json(self, raw_text: str) -> Dict[str, Any]:
        """Extracts JSON payload from potential code fences or conversational text."""
        cleaned = raw_text.strip()
        fence_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", cleaned, re.DOTALL)
        if fence_match:
            return json.loads(fence_match.group(1))

        brace_match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if brace_match:
            return json.loads(brace_match.group(0))

        return json.loads(cleaned)

querylens_planner = QueryLensPlanner()
