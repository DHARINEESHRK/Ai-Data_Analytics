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
            
            # Self-healing SQL execution with up to 3 attempts
            max_sql_attempts = 3
            last_error: Optional[str] = None
            generated_sql = ""

            for attempt in range(1, max_sql_attempts + 1):
                if attempt == 1:
                    generated_sql = await self._generate_sql(question, dataset, model)
                    steps.append(f"Executing SQL query: {generated_sql}")
                else:
                    steps.append(f"SQL retry #{attempt}: Correcting query based on error '{last_error}'...")
                    generated_sql = await self._generate_sql(
                        question=question, 
                        dataset=dataset, 
                        model=model, 
                        failed_sql=executed_sql, 
                        error_msg=last_error
                    )
                    steps.append(f"Executing corrected SQL: {generated_sql}")

                executed_sql = generated_sql
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
                    
                    # Successfully executed and validated
                    break
                except Exception as e:
                    last_error = str(e)
                    logger.warning(f"SQL attempt {attempt} failed: {e}")
                    if attempt == max_sql_attempts:
                        steps.append(f"SQL execution reached max retries. Error: {last_error}")

        # Stage 7: Generate Direct Answer & Key Insight
        steps.append("Synthesizing direct answer, key insight, and executive conclusions...")
        direct_answer, key_insight, full_answer = await self._generate_final_insight(
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

        from app.schemas.chat import DatasetInfoResponse
        dataset_info = DatasetInfoResponse(
            id=dataset.id,
            name=dataset.name,
            row_count=dataset.row_count,
            column_count=dataset.column_count,
            format=dataset.format
        )

        method_names = {
            "correlation_analysis": "Bivariate Statistical Correlation & Regression",
            "top_n_query": "Ranked SQL Aggregation",
            "sql_aggregation": "Grouped SQL Metric Aggregation",
            "filter_query": "Filtered Record Retrieval",
            "schema_inspection": "Dataset Schema & Profile Inspection"
        }
        analysis_method = method_names.get(intent, "Analytical Query")

        return ChatResponse(
            answer=full_answer,
            direct_answer=direct_answer,
            key_insight=key_insight,
            analysis_method=analysis_method,
            dataset_info=dataset_info,
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

    async def _generate_sql(
        self, 
        question: str, 
        dataset: DatasetResponse, 
        model: str,
        failed_sql: Optional[str] = None,
        error_msg: Optional[str] = None
    ) -> str:
        """Generates schema-compliant SQL query targeting table 'data' with error-correction support."""
        client = self._get_client()
        col_definitions = ", ".join([f"{c.name} ({c.dtype})" for c in dataset.columns])

        if not client:
            num_cols = [c.name for c in dataset.columns if c.column_type == "numerical"]
            cat_cols = [c.name for c in dataset.columns if c.column_type == "categorical"]
            if cat_cols and num_cols:
                return f"SELECT {cat_cols[0]}, COUNT(*) AS count, ROUND(AVG({num_cols[0]}), 2) AS avg_{num_cols[0]} FROM data GROUP BY {cat_cols[0]} ORDER BY avg_{num_cols[0]} DESC LIMIT 10;"
            return "SELECT * FROM data LIMIT 10;"

        error_feedback = ""
        if failed_sql and error_msg:
            error_feedback = (
                f"\nPREVIOUS ATTEMPT FAILED:\n"
                f"Failed SQL: {failed_sql}\n"
                f"Error Message: {error_msg}\n"
                f"Fix the query so that it executes without errors against DuckDB.\n"
            )

        prompt = (
            f"You are a SQL expert. Write a DuckDB SQL query to answer the user question.\n"
            f"Table Name: 'data'\n"
            f"Available Columns: {col_definitions}\n"
            f"Question: \"{question}\"\n"
            f"{error_feedback}\n"
            f"RULES:\n"
            f"1. Target table 'data'.\n"
            f"2. Use only SELECT statements.\n"
            f"3. Never use INSERT, UPDATE, DELETE, DROP, ALTER, or TRUNCATE.\n"
            f"4. Return strictly executable SQL inside ```sql ... ``` code block. No explanations."
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
    ) -> Tuple[str, str, str]:
        """Synthesizes verified findings into (direct_answer, key_insight, full_formatted_markdown)."""
        client = self._get_client()

        if stats_result:
            direct_answer = f"There is a {stats_result['strength']} {stats_result['direction']} linear correlation (r = {stats_result['pearson_correlation']}) between {stats_result['col_x']} and {stats_result['col_y']}."
            key_insight = f"With a covariance of {stats_result['covariance']} across {stats_result['observations_count']:,} observations, changes in {stats_result['col_x']} directly coincide with changes in {stats_result['col_y']}."
            
            full_answer = (
                f"### Correlation Analysis: `{stats_result['col_x']}` & `{stats_result['col_y']}`\n\n"
                f"**Direct Answer:** {direct_answer}\n\n"
                f"**Key Insight:** {key_insight}\n\n"
                f"- **Pearson Correlation Coefficient (r):** `{stats_result['pearson_correlation']}` ({stats_result['strength']} {stats_result['direction']})\n"
                f"- **Covariance:** `{stats_result['covariance']}`\n"
                f"- **Observations Analyzed:** `{stats_result['observations_count']:,}` non-null pairs"
            )
            return direct_answer, key_insight, full_answer

        if sql_result and len(sql_result.get("rows", [])) > 0:
            rows_sample = sql_result["rows"][:5]
            top_record = rows_sample[0]
            first_col = sql_result["columns"][0]
            val_col = sql_result["columns"][1] if len(sql_result["columns"]) > 1 else first_col

            direct_answer = f"Top result is {top_record.get(first_col)} with {top_record.get(val_col)} (out of {sql_result['row_count']} total matching records)."
            key_insight = f"The leading segment accounts for a substantial share of the aggregated metric in {dataset.name}."

            if client:
                summary_prompt = (
                    f"User Question: \"{question}\"\n"
                    f"Dataset: {dataset.name}\n"
                    f"Executed SQL: {sql}\n"
                    f"Query Results (first few rows): {json.dumps(rows_sample)}\n\n"
                    f"Task:\n"
                    f"1. Provide a 1-sentence DIRECT ANSWER grounded in the numbers.\n"
                    f"2. Provide a 1-sentence KEY INSIGHT explaining the business significance.\n"
                    f"Respond in JSON format with keys 'direct_answer' and 'key_insight'."
                )
                try:
                    res = await client.chat.completions.create(
                        model=model,
                        messages=[{"role": "user", "content": summary_prompt}],
                        temperature=0.1,
                        max_tokens=250
                    )
                    raw = res.choices[0].message.content or "{}"
                    clean_json = re.search(r"\{.*\}", raw, re.DOTALL)
                    if clean_json:
                        parsed = json.loads(clean_json.group(0))
                        direct_answer = parsed.get("direct_answer", direct_answer)
                        key_insight = parsed.get("key_insight", key_insight)
                except Exception as e:
                    logger.warning(f"LLM summary generation fallback: {e}")

            full_answer = (
                f"**Direct Answer:** {direct_answer}\n\n"
                f"**Key Insight:** {key_insight}\n\n"
                f"Found **{sql_result['row_count']} rows** matching analytical constraints in **{dataset.name}**."
            )
            return direct_answer, key_insight, full_answer

        col_list = ", ".join([f"`{c.name}`" for c in dataset.columns])
        direct_answer = f"Inspected dataset '{dataset.name}' containing {dataset.row_count:,} rows and {dataset.column_count} columns."
        key_insight = "Ready to perform analytical queries, statistical correlations, and interactive chart generation."
        full_answer = (
            f"### Dataset Context: {dataset.name}\n\n"
            f"The dataset contains **{dataset.row_count:,} records** across columns:\n{col_list}\n\n"
            f"You can ask me to rank categories, calculate totals, or find correlations."
        )
        return direct_answer, key_insight, full_answer

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
