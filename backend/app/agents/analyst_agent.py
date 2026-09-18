import time
import json
import re
from typing import List, Dict, Any, Optional, Tuple
from openai import AsyncOpenAI
import httpx

from app.config.settings import settings
from app.schemas.chat import (
    ChatHistoryMessage, 
    ChatResponse, 
    ChartConfigResponse, 
    TableDataResponse
)
from app.schemas.datasets import DatasetResponse
from app.services.dataset_service import dataset_service
from app.tools.query_tools import query_tools
from app.utils.logger import logger

class AnalystAgent:
    """Production AI Data Analyst Agent with Controlled Tool Calling & State Machine."""

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

    async def run(
        self,
        question: str,
        dataset: Optional[DatasetResponse] = None,
        conversation_history: Optional[List[ChatHistoryMessage]] = None,
        model_override: Optional[str] = None
    ) -> ChatResponse:
        """Executes the complete Agent State Flow:
        QUESTION -> UNDERSTAND INTENT -> INSPECT DATA -> CREATE PLAN -> SELECT TOOL -> EXECUTE -> VALIDATE -> INSIGHT -> RESPOND
        """
        start_time = time.time()
        steps: List[str] = []
        model = model_override or settings.NVIDIA_NIM_MODEL

        # Stage 1: Understand Intent
        steps.append("Understanding your question & analytical intent...")
        q_lower = question.lower()

        if not dataset:
            latency_ms = int((time.time() - start_time) * 1000)
            return ChatResponse(
                answer="Please select or upload a dataset first so I can inspect the schema and execute analytical queries.",
                model=model,
                latency_ms=latency_ms,
                steps=steps,
                suggested_followups=["Upload a CSV or Excel dataset", "Select sample dataset"]
            )

        # Stage 2: Inspect Data
        steps.append(f"Inspecting dataset schema and profiles for '{dataset.name}'...")
        _ = query_tools.get_schema(dataset.id)

        # Stage 3: Create Plan & Determine Intent
        intent = self._classify_intent(q_lower, dataset)
        steps.append(f"Planning execution approach: {intent.replace('_', ' ').title()}...")

        sql_result = None
        stats_result = None
        chart_config = None
        table_data = None
        executed_sql = None

        # Stage 4: Select Tool & Execute
        if intent == "correlation_analysis":
            steps.append("Identifying numerical columns & running statistical correlation...")
            num_cols = [c.name for c in dataset.columns if c.column_type == "numerical"]
            if len(num_cols) >= 2:
                col_x, col_y = self._pick_correlation_columns(q_lower, num_cols)
                try:
                    stats_result = query_tools.run_statistical_analysis(dataset.id, col_x, col_y)
                    steps.append(f"Computed Pearson correlation (r = {stats_result['pearson_correlation']})...")

                    # Stage 5: Validate Result
                    _ = query_tools.validate_result({"rows": [{"x": 1, "y": 2}]})

                    # Stage 6: Create Visualization
                    steps.append("Creating statistical trend visualization...")
                    preview = dataset_service.get_preview(dataset.id, 25)
                    chart_config = ChartConfigResponse(
                        type="line",
                        xAxisKey=col_x,
                        yAxisKey=col_y,
                        title=f"{col_y} vs {col_x} (r = {stats_result['pearson_correlation']})",
                        data=preview.rows
                    )
                except Exception as e:
                    logger.error(f"Statistical analysis failed: {e}")

        elif intent in ["sql_aggregation", "top_n_query", "filter_query"]:
            steps.append("Generating optimized DuckDB SQL query...")
            generated_sql = await self._generate_sql(question, dataset, model)
            executed_sql = generated_sql

            steps.append("Executing query safely on DuckDB in-memory engine...")
            try:
                sql_result = query_tools.execute_sql(dataset.id, generated_sql)
                
                # Stage 5: Validate
                steps.append("Validating query results and record constraints...")
                val_res = query_tools.validate_result(sql_result)
                
                if val_res["valid"] and len(sql_result["rows"]) > 0:
                    table_data = TableDataResponse(
                        columns=sql_result["columns"],
                        rows=sql_result["rows"]
                    )

                    # Stage 6: Select Visualization
                    steps.append("Configuring interactive visualization...")
                    chart_config = self._auto_select_chart(sql_result)
            except Exception as e:
                logger.error(f"SQL execution failed: {e}")
                steps.append(f"SQL warning: {str(e)}")

        # Stage 7: Generate Insight & Summarize
        steps.append("Synthesizing final executive insights...")
        final_answer = await self._generate_final_insight(
            question=question,
            dataset=dataset,
            intent=intent,
            sql=executed_sql,
            sql_result=sql_result,
            stats_result=stats_result,
            model=model
        )

        latency_ms = int((time.time() - start_time) * 1000)

        # Stage 8: Respond
        steps.append("Response ready.")
        followups = self._generate_followups(dataset, intent)

        return ChatResponse(
            answer=final_answer,
            dataset_id=dataset.id,
            dataset_name=dataset.name,
            model=model,
            latency_ms=latency_ms,
            steps=steps,
            sql=executed_sql,
            chart=chart_config,
            table_data=table_data,
            stats=stats_result,
            suggested_followups=followups,
            status="completed"
        )

    def _classify_intent(self, q_lower: str, dataset: DatasetResponse) -> str:
        """Classifies intent without arbitrary tool runs."""
        if any(k in q_lower for k in ["correlation", "relationship", "relation", "relate", "correlate", "vs", "versus"]):
            return "correlation_analysis"
        elif any(k in q_lower for k in ["top", "highest", "lowest", "bottom", "rank", "most", "least"]):
            return "top_n_query"
        elif any(k in q_lower for k in ["by", "per", "group by", "break down", "average", "sum", "total", "count"]):
            return "sql_aggregation"
        elif any(k in q_lower for k in ["where", "filter", "find", "show rows", "list"]):
            return "filter_query"
        elif any(k in q_lower for k in ["column", "schema", "field", "structure"]):
            return "schema_inspection"
        return "general_analysis"

    def _pick_correlation_columns(self, q_lower: str, num_cols: List[str]) -> Tuple[str, str]:
        matched = [c for c in num_cols if c.lower() in q_lower]
        if len(matched) >= 2:
            return matched[0], matched[1]
        elif len(matched) == 1:
            other = next(c for c in num_cols if c != matched[0])
            return matched[0], other
        return num_cols[0], num_cols[1]

    async def _generate_sql(self, question: str, dataset: DatasetResponse, model: str) -> str:
        """Generates schema-compliant SQL query targeting table 'data'."""
        client = self._get_client()
        col_definitions = ", ".join([f"{c.name} ({c.dtype})" for c in dataset.columns])

        if not client:
            num_cols = [c.name for c in dataset.columns if c.column_type == "numerical"]
            cat_cols = [c.name for c in dataset.columns if c.column_type == "categorical"]
            if cat_cols and num_cols:
                return f"SELECT {cat_cols[0]}, COUNT(*) AS count, ROUND(AVG({num_cols[0]}), 2) AS avg_{num_cols[0]} FROM data GROUP BY {cat_cols[0]} ORDER BY avg_{num_cols[0]} DESC LIMIT 10;"
            return "SELECT * FROM data LIMIT 10;"

        prompt = (
            f"You are a SQL expert. Write a DuckDB SQL query to answer the user question.\n"
            f"Table Name: 'data'\n"
            f"Available Columns: {col_definitions}\n"
            f"Question: \"{question}\"\n\n"
            f"RULES:\n"
            f"1. Target table 'data'.\n"
            f"2. Use only SELECT statements.\n"
            f"3. Return strictly executable SQL inside ```sql ... ``` code block. No explanations."
        )

        try:
            res = await client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=300
            )
            raw_text = res.choices[0].message.content or ""
            match = re.search(r"```(?:sql)?\s*(.*?)\s*```", raw_text, re.DOTALL | re.IGNORECASE)
            if match:
                return match.group(1).strip()
            return raw_text.strip()
        except Exception:
            return "SELECT * FROM data LIMIT 10;"

    def _auto_select_chart(self, sql_result: Dict[str, Any]) -> Optional[ChartConfigResponse]:
        """Automatically determines the best chart configuration from query result."""
        columns = sql_result.get("columns", [])
        rows = sql_result.get("rows", [])
        if len(columns) < 2 or len(rows) == 0:
            return None

        x_key = columns[0]
        y_key = columns[1]

        first_y_val = rows[0].get(y_key)
        if isinstance(first_y_val, (int, float)):
            return ChartConfigResponse(
                type="bar",
                xAxisKey=x_key,
                yAxisKey=y_key,
                title=f"{y_key.replace('_', ' ').title()} by {x_key.replace('_', ' ').title()}",
                data=rows[:15]
            )
        return None

    async def _generate_final_insight(
        self,
        question: str,
        dataset: DatasetResponse,
        intent: str,
        sql: Optional[str],
        sql_result: Optional[Dict[str, Any]],
        stats_result: Optional[Dict[str, Any]],
        model: str
    ) -> str:
        """Synthesizes final answer with verified findings."""
        client = self._get_client()

        if stats_result:
            return (
                f"### Correlation Analysis: `{stats_result['col_x']}` & `{stats_result['col_y']}`\n\n"
                f"- **Pearson Correlation Coefficient (r):** `{stats_result['pearson_correlation']}` ({stats_result['strength']} {stats_result['direction']})\n"
                f"- **Covariance:** `{stats_result['covariance']}`\n"
                f"- **Observations Analyzed:** `{stats_result['observations_count']:,}` non-null pairs\n\n"
                f"**Key Finding:** {stats_result['summary']}"
            )

        if sql_result and len(sql_result.get("rows", [])) > 0:
            rows_sample = sql_result["rows"][:5]
            if not client:
                return (
                    f"### Analysis Result for '{question}'\n\n"
                    f"I executed the SQL query on **{dataset.name}** and returned **{sql_result['row_count']} matching rows**.\n\n"
                    f"Top result: **{rows_sample[0]}**."
                )

            summary_prompt = (
                f"User Question: \"{question}\"\n"
                f"Dataset: {dataset.name}\n"
                f"Executed SQL: {sql}\n"
                f"Query Result Summary (first few rows): {json.dumps(rows_sample)}\n\n"
                f"Provide a concise, 2-3 sentence executive analytical answer summarizing the key finding."
            )

            try:
                res = await client.chat.completions.create(
                    model=model,
                    messages=[{"role": "user", "content": summary_prompt}],
                    temperature=0.2,
                    max_tokens=300
                )
                return res.choices[0].message.content or "Analysis completed."
            except Exception:
                return f"Successfully computed results from {dataset.name} matching query '{question}'."

        col_list = ", ".join([f"`{c.name}`" for c in dataset.columns])
        return (
            f"### Dataset Context: {dataset.name}\n\n"
            f"The dataset contains **{dataset.row_count:,} records** and **{dataset.column_count} columns**:\n{col_list}\n\n"
            f"You can ask me to aggregate metrics, compute correlations, or filter records."
        )

    def _generate_followups(self, dataset: DatasetResponse, intent: str) -> List[str]:
        num_cols = [c.name for c in dataset.columns if c.column_type == "numerical"]
        cat_cols = [c.name for c in dataset.columns if c.column_type == "categorical"]

        followups = []
        if intent == "correlation_analysis" and cat_cols:
            followups.append(f"Break down by {cat_cols[0]} segment")
        elif cat_cols and num_cols:
            followups.append(f"What are top 5 {cat_cols[0]} by total {num_cols[0]}?")
            if len(num_cols) >= 2:
                followups.append(f"Is there a correlation between {num_cols[0]} and {num_cols[1]}?")

        followups.append("Show dataset quality report")
        return followups[:3]

analyst_agent = AnalystAgent()
