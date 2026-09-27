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
    TableDataResponse,
    DatasetInfoResponse,
    DataUsedInfo
)
from app.schemas.datasets import DatasetResponse
from app.schemas.planner import AnalysisPlan
from app.agents.planner import querylens_planner
from app.services.dataset_service import dataset_service
from app.tools.query_tools import query_tools
from app.tools.visualization_engine import visualization_engine
from app.utils.logger import logger
from app.utils.exceptions import AppException

class AnalystAgent:
    """QueryLens AI Analyst Agent with NVIDIA NIM Semantic Planning & Safe Tool Orchestration."""

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
        """Executes the complete QueryLens semantic analytical flow:
        QUESTION -> SEMANTIC PLANNER (NIM) -> VALIDATE PLAN -> DISPATCH EXECUTION -> FORMAT VISUALIZATION -> BUSINESS INSIGHT
        """
        start_time = time.time()
        steps: List[str] = []
        model = model_override or settings.NVIDIA_NIM_MODEL

        if not dataset:
            latency_ms = int((time.time() - start_time) * 1000)
            return ChatResponse(
                answer="Please select or upload a dataset first so I can inspect the schema and answer your analytical questions.",
                direct_answer="No active dataset selected.",
                key_insight="Upload a CSV or Excel file to get started.",
                model=model,
                latency_ms=latency_ms,
                steps=["Awaiting dataset selection."],
                suggested_followups=["Upload a CSV or Excel dataset"]
            )

        dataset_info = DatasetInfoResponse(
            id=dataset.id,
            name=dataset.name,
            row_count=dataset.row_count,
            column_count=dataset.column_count,
            format=dataset.format
        )

        # Stage 1: Semantic Planning via NVIDIA NIM
        steps.append("Understanding your question & analytical intent with NVIDIA NIM...")
        try:
            plan: AnalysisPlan = await querylens_planner.create_plan(
                question=question,
                dataset=dataset,
                model_override=model_override
            )
        except AppException as e:
            latency_ms = int((time.time() - start_time) * 1000)
            logger.warning(f"QueryLens Planner error: {e}")
            return ChatResponse(
                answer=str(e),
                direct_answer=str(e),
                key_insight="Please ensure your NVIDIA NIM API key is valid and configured in the environment settings.",
                analysis_method="AI Planner",
                dataset_info=dataset_info,
                dataset_id=dataset.id,
                dataset_name=dataset.name,
                model=model,
                latency_ms=latency_ms,
                steps=steps,
                status="error"
            )

        steps.append(f"Formulated execution plan: {plan.intent.replace('_', ' ').title()}")
        if plan.explanation_of_plan:
            steps.append(f"Plan details: {plan.explanation_of_plan}")

        # Stage 2: Handle Ambiguity or Missing Capabilities Gracefully
        if plan.ambiguity_detected and plan.clarification_question:
            latency_ms = int((time.time() - start_time) * 1000)
            followups = [f"Analyze using {col}" for col in plan.ambiguous_columns] if plan.ambiguous_columns else []
            return ChatResponse(
                answer=plan.clarification_question,
                direct_answer=plan.clarification_question,
                key_insight="Clarifying the exact metric prevents misleading or inaccurate numbers.",
                analysis_method="Clarification Required",
                dataset_info=dataset_info,
                dataset_id=dataset.id,
                dataset_name=dataset.name,
                model=model,
                latency_ms=latency_ms,
                steps=steps,
                suggested_followups=followups,
                status="completed"
            )

        if plan.missing_required_capability:
            latency_ms = int((time.time() - start_time) * 1000)
            col_list = ", ".join([f"`{c.name}`" for c in dataset.columns[:5]])
            return ChatResponse(
                answer=f"{plan.missing_required_capability}\n\nAvailable columns in this dataset: {col_list}.",
                direct_answer=plan.missing_required_capability,
                key_insight="Analytical requests like time-series or trends require corresponding data types (e.g. date columns).",
                analysis_method="Schema Assessment",
                dataset_info=dataset_info,
                dataset_id=dataset.id,
                dataset_name=dataset.name,
                model=model,
                latency_ms=latency_ms,
                steps=steps,
                suggested_followups=[f"Show breakdown by {c.name}" for c in dataset.columns if c.column_type == "categorical"][:3],
                status="completed"
            )

        # Stage 3: Real Data Quality Inspection
        if plan.intent == "data_quality":
            steps.append("Executing real dataset quality profiling...")
            missing_cols = [c for c in dataset.columns if c.null_count > 0]
            quality = dataset.quality

            if missing_cols:
                missing_summary = ", ".join([f"{c.name} ({c.null_count:,} missing)" for c in missing_cols])
                direct_answer = f"Found missing values in {len(missing_cols)} column(s): {missing_summary}."
                key_insight = f"Overall data quality is {quality.quality_score}% with {quality.missing_cells:,} total missing cells and {quality.duplicate_rows:,} duplicate rows."
                
                chart_data = [{"column": c.name, "missing_count": c.null_count} for c in missing_cols]
                chart_config = ChartConfigResponse(
                    type="bar",
                    xAxisKey="column",
                    yAxisKey="missing_count",
                    title="Missing Values by Column",
                    data=chart_data[:15]
                )
                table_data = TableDataResponse(
                    columns=["Column Name", "Missing Rows", "Missing Percentage", "Data Type"],
                    rows=[
                        {
                            "Column Name": c.name,
                            "Missing Rows": f"{c.null_count:,}",
                            "Missing Percentage": f"{c.null_percentage}%",
                            "Data Type": c.column_type
                        }
                        for c in missing_cols
                    ]
                )
            else:
                direct_answer = f"No missing values were detected in '{dataset.name}'. Overall data quality score is {quality.quality_score}%."
                key_insight = f"The dataset is 100% complete across all {dataset.row_count:,} rows with {quality.duplicate_rows:,} duplicate rows."
                chart_config = None
                table_data = None

            full_answer = (
                f"### Data Quality Assessment: `{dataset.name}`\n\n"
                f"**Direct Answer:** {direct_answer}\n\n"
                f"**Key Insight:** {key_insight}\n\n"
                f"- **Overall Quality Score:** `{quality.quality_score}%`\n"
                f"- **Total Rows Analyzed:** `{dataset.row_count:,}`\n"
                f"- **Duplicate Rows:** `{quality.duplicate_rows:,}` ({quality.duplicate_percentage}%)\n"
                f"- **Total Missing Cells:** `{quality.missing_cells:,}` ({quality.missing_percentage}%)"
            )
            latency_ms = int((time.time() - start_time) * 1000)
            return ChatResponse(
                answer=full_answer,
                direct_answer=direct_answer,
                key_insight=key_insight,
                analysis_method="Dataset Quality Profiling",
                dataset_info=dataset_info,
                dataset_id=dataset.id,
                dataset_name=dataset.name,
                model=model,
                latency_ms=latency_ms,
                steps=steps,
                chart=chart_config,
                table_data=table_data,
                suggested_followups=["What columns are in this dataset?", "Check for outliers"],
                status="completed"
            )

        # Stage 4: Real Schema Inspection
        if plan.intent == "schema_inspection":
            steps.append("Generating real schema breakdown and column inventory...")
            col_list = ", ".join([f"`{c.name}` ({c.column_type})" for c in dataset.columns])
            num_count = len([c for c in dataset.columns if c.column_type == "numerical"])
            cat_count = len([c for c in dataset.columns if c.column_type == "categorical"])
            date_count = len([c for c in dataset.columns if c.column_type == "datetime"])

            direct_answer = f"'{dataset.name}' has {dataset.row_count:,} rows and {dataset.column_count} columns."
            key_insight = f"The dataset includes {num_count} numerical, {cat_count} categorical, and {date_count} datetime fields."

            table_data = TableDataResponse(
                columns=["Column Name", "Type", "Native Dtype", "Unique Values", "Null Count"],
                rows=[
                    {
                        "Column Name": c.name,
                        "Type": c.column_type,
                        "Native Dtype": c.dtype,
                        "Unique Values": f"{c.unique_count:,}",
                        "Null Count": f"{c.null_count:,}"
                    }
                    for c in dataset.columns
                ]
            )

            full_answer = (
                f"### Dataset Schema Overview: `{dataset.name}`\n\n"
                f"**Direct Answer:** {direct_answer}\n\n"
                f"**Key Insight:** {key_insight}\n\n"
                f"**Available Columns:**\n{col_list}"
            )
            latency_ms = int((time.time() - start_time) * 1000)
            return ChatResponse(
                answer=full_answer,
                direct_answer=direct_answer,
                key_insight=key_insight,
                analysis_method="Schema Inspection",
                dataset_info=dataset_info,
                dataset_id=dataset.id,
                dataset_name=dataset.name,
                model=model,
                latency_ms=latency_ms,
                steps=steps,
                table_data=table_data,
                suggested_followups=["What values are missing?", "What are the key statistics?"],
                status="completed"
            )

        # Stage 5: Python Analytics Engine (Correlation / Outliers / Stats)
        if plan.intent == "correlation" and len(plan.metric_columns) >= 2:
            col_x, col_y = plan.metric_columns[0], plan.metric_columns[1]
            steps.append(f"Computing Pearson correlation between '{col_x}' and '{col_y}'...")
            try:
                stats_res = query_tools.run_statistical_analysis(dataset.id, col_x, col_y)
                preview = dataset_service.get_preview(dataset.id, 25)
                chart_config = ChartConfigResponse(
                    type=plan.visualization or "scatter",
                    xAxisKey=col_x,
                    yAxisKey=col_y,
                    title=f"{col_y} vs {col_x} (r = {stats_res['pearson_correlation']})",
                    data=preview.rows
                )
                direct_answer = f"There is a {stats_res['strength']} {stats_res['direction']} linear correlation (r = {stats_res['pearson_correlation']}) between {col_x} and {col_y}."
                key_insight = f"Covariance is {stats_res['covariance']} across {stats_res['observations_count']:,} observations."
                full_answer = (
                    f"### Correlation Analysis: `{col_x}` & `{col_y}`\n\n"
                    f"**Direct Answer:** {direct_answer}\n\n"
                    f"**Key Insight:** {key_insight}\n\n"
                    f"- **Pearson Correlation (r):** `{stats_res['pearson_correlation']}` ({stats_res['strength']} {stats_res['direction']})\n"
                    f"- **Covariance:** `{stats_res['covariance']}`\n"
                    f"- **Observations Analyzed:** `{stats_res['observations_count']:,}` pairs"
                )
                latency_ms = int((time.time() - start_time) * 1000)
                return ChatResponse(
                    answer=full_answer,
                    direct_answer=direct_answer,
                    key_insight=key_insight,
                    analysis_method="Bivariate Statistical Correlation",
                    dataset_info=dataset_info,
                    dataset_id=dataset.id,
                    dataset_name=dataset.name,
                    model=model,
                    latency_ms=latency_ms,
                    steps=steps,
                    chart=chart_config,
                    stats=stats_res,
                    suggested_followups=[f"Show distribution of {col_x}", f"Detect outliers in {col_y}"],
                    status="completed"
                )
            except Exception as e:
                logger.error(f"Correlation calculation error: {e}")

        # Stage 6: SQL Execution with Self-Healing Retries
        steps.append("Formulating optimized DuckDB SQL query from plan...")
        sql_result = None
        table_data = None
        chart_config = None
        executed_sql = None
        max_sql_attempts = 3
        last_error = None

        for attempt in range(1, max_sql_attempts + 1):
            generated_sql = await self._generate_sql(
                question=question,
                plan=plan,
                dataset=dataset,
                model=model,
                failed_sql=executed_sql,
                error_msg=last_error
            )
            executed_sql = generated_sql
            steps.append(f"Executing query (attempt {attempt}): {generated_sql}")

            try:
                sql_result = query_tools.execute_sql(dataset.id, generated_sql)
                val_res = query_tools.validate_result(sql_result)
                if val_res["valid"] and len(sql_result["rows"]) > 0:
                    table_data = TableDataResponse(
                        columns=sql_result["columns"],
                        rows=sql_result["rows"]
                    )
                    # Configure chart based on plan intent and returned columns
                    chart_config = self._configure_chart_from_plan(plan, sql_result)
                    break
                else:
                    last_error = "Query returned 0 rows matching constraints."
            except Exception as e:
                last_error = str(e)
                logger.warning(f"SQL execution attempt #{attempt} error: {e}")

        if not sql_result or len(sql_result.get("rows", [])) == 0:
            latency_ms = int((time.time() - start_time) * 1000)
            err_msg = f"Could not complete analysis for '{question}'. Reason: {last_error or 'No matching records found.'}"
            return ChatResponse(
                answer=err_msg,
                direct_answer="Analysis could not be completed with the available data.",
                key_insight="Try broadening your question or specifying a different metric/category.",
                analysis_method="SQL Query",
                dataset_info=dataset_info,
                dataset_id=dataset.id,
                dataset_name=dataset.name,
                model=model,
                latency_ms=latency_ms,
                steps=steps,
                sql=executed_sql,
                status="completed"
            )

        # Stage 7: Generate Final Plain-English Business Insights
        steps.append("Synthesizing direct business answer and key findings with NVIDIA NIM...")
        direct_answer, key_insight, full_answer = await self._generate_final_insight(
            question=question,
            plan=plan,
            dataset=dataset,
            sql=executed_sql,
            sql_result=sql_result,
            model=model
        )

        latency_ms = int((time.time() - start_time) * 1000)
        steps.append("Response ready.")

        method_names = {
            "time_series": "Time-Series Aggregation & Trend Analysis",
            "ranking": "Ranked SQL Metric Aggregation",
            "aggregation": "Grouped Metric Aggregation",
            "comparison": "Comparative Cohort Analysis",
            "percentage_analysis": "Proportional Ratio Analysis",
            "filtering": "Filtered Record Retrieval",
            "trend_analysis": "Longitudinal Trend Analysis"
        }
        analysis_method = method_names.get(plan.intent, "SQL Analytical Query")

        followups = self._generate_followups(dataset, plan)

        # Construct DataUsedInfo
        data_used_columns = []
        if plan.metric_columns:
            data_used_columns.extend(plan.metric_columns)
        if plan.dimension_columns:
            data_used_columns.extend(plan.dimension_columns)
        if plan.time_column:
            data_used_columns.append(plan.time_column)
        data_used_columns = list(dict.fromkeys(data_used_columns))

        grouping_desc = None
        if plan.time_granularity and plan.time_column:
            grouping_desc = f"{plan.time_granularity.title()} of {plan.time_column}"
        elif plan.dimension_columns:
            grouping_desc = ", ".join(plan.dimension_columns)

        filters_desc = [f"{f.column} {f.operator} {f.value}" for f in plan.filters] if plan.filters else []

        data_used = DataUsedInfo(
            columns=data_used_columns,
            filters=filters_desc,
            grouping=grouping_desc,
            aggregation=(plan.aggregation or "SUM").upper() if plan.intent not in ["schema_inspection", "data_quality"] else None
        )

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
            data_used=data_used,
            suggested_followups=followups,
            status="completed"
        )

    async def _generate_sql(
        self,
        question: str,
        plan: AnalysisPlan,
        dataset: DatasetResponse,
        model: str,
        failed_sql: Optional[str] = None,
        error_msg: Optional[str] = None
    ) -> str:
        """Generates schema-grounded DuckDB SQL using the plan's exact mapped columns."""
        client = self._get_client()
        col_definitions = ", ".join([f"\"{c.name}\" ({c.dtype})" for c in dataset.columns])

        if not client:
            raise AppException("AI analysis is currently unavailable. Please check the NVIDIA NIM connection.")

        error_feedback = ""
        if failed_sql and error_msg:
            error_feedback = (
                f"\nPREVIOUS QUERY FAILED:\n"
                f"Failed SQL: {failed_sql}\n"
                f"Error Message: {error_msg}\n"
                f"Fix the syntax to run successfully in DuckDB.\n"
            )

        plan_summary = (
            f"Intent: {plan.intent}\n"
            f"Metric Columns: {plan.metric_columns}\n"
            f"Dimension Columns: {plan.dimension_columns}\n"
            f"Time Column: {plan.time_column}\n"
            f"Aggregation: {plan.aggregation or 'SUM'}\n"
            f"Time Granularity: {plan.time_granularity}\n"
            f"Limit: {plan.limit or 15}"
        )

        prompt = (
            f"You are a DuckDB SQL generator for QueryLens.\n"
            f"Target Table: 'data'\n"
            f"Available Columns: {col_definitions}\n"
            f"User Question: \"{question}\"\n"
            f"Analysis Plan:\n{plan_summary}\n"
            f"{error_feedback}\n"
            f"DUCKDB SQL PATTERNS & RULES:\n"
            f"1. Target table 'data'.\n"
            f"2. Always double-quote column names (e.g. \"Order Date\", \"Total Revenue\").\n"
            f"3. For single KPI (e.g. 'What is the total revenue?'):\n"
            f"   SELECT SUM(\"metric_col\") AS total_metric FROM data;\n"
            f"4. For yearly sales by month or multi-year monthly comparisons:\n"
            f"   SELECT strftime(CAST(\"time_col\" AS DATE), '%Y') AS year, strftime(CAST(\"time_col\" AS DATE), '%B') AS month, strftime(CAST(\"time_col\" AS DATE), '%m') AS month_num, SUM(\"metric_col\") AS total_sales FROM data GROUP BY year, month, month_num ORDER BY year, month_num;\n"
            f"5. For standard monthly trends:\n"
            f"   SELECT strftime(CAST(\"time_col\" AS DATE), '%Y-%m') AS month, SUM(\"metric_col\") AS total_metric FROM data GROUP BY month ORDER BY month ASC LIMIT 36;\n"
            f"6. For category rankings:\n"
            f"   SELECT \"dim_col\", SUM(\"metric_col\") AS total_metric FROM data GROUP BY \"dim_col\" ORDER BY total_metric DESC LIMIT 15;\n"
            f"7. Only SELECT queries. Never use mutations (INSERT, UPDATE, DELETE, DROP).\n"
            f"8. Output STRICTLY the executable SQL inside ```sql ... ``` code block. No explanations."
        )

        try:
            res = await client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=350
            )
            raw_text = res.choices[0].message.content or ""
            match = re.search(r"```(?:sql)?\s*(.*?)\s*```", raw_text, re.DOTALL | re.IGNORECASE)
            if match:
                return match.group(1).strip()
            return raw_text.strip()
        except Exception as e:
            logger.error(f"SQL generation LLM error: {e}")
            raise AppException(f"Failed to generate SQL query: {e}")

    def _configure_chart_from_plan(
        self,
        plan: AnalysisPlan,
        sql_result: Dict[str, Any]
    ) -> Optional[ChartConfigResponse]:
        """Configures visualization using the production VisualizationEngine and verified result rows."""
        return visualization_engine.build_chart_from_result(
            result_rows=sql_result.get("rows", []),
            result_columns=sql_result.get("columns", []),
            plan=plan
        )

    async def _generate_final_insight(
        self,
        question: str,
        plan: AnalysisPlan,
        dataset: DatasetResponse,
        sql: Optional[str],
        sql_result: Dict[str, Any],
        model: str
    ) -> Tuple[str, str, str]:
        """Synthesizes business findings into (direct_answer, key_insight, full_markdown)."""
        client = self._get_client()
        rows_sample = sql_result.get("rows", [])[:5]
        columns = sql_result.get("columns", [])

        # Default fallback strictly from actual numbers
        first_row = rows_sample[0] if rows_sample else {}
        first_col = columns[0] if columns else "Result"
        val_col = columns[1] if len(columns) > 1 else first_col
        direct_answer = f"{first_row.get(first_col)} recorded {first_row.get(val_col)} (out of {sql_result['row_count']} returned rows)."
        key_insight = f"Found {sql_result['row_count']} records answering '{question}' in {dataset.name}."

        if client and rows_sample:
            summary_prompt = (
                f"You are QueryLens, an AI data analytics assistant for non-technical business users.\n"
                f"User Question: \"{question}\"\n"
                f"Dataset: {dataset.name}\n"
                f"Query Result Sample (first few rows): {json.dumps(rows_sample)}\n"
                f"Total Matching Records: {sql_result['row_count']}\n\n"
                f"Task:\n"
                f"1. 'direct_answer': 1 clear, friendly sentence directly answering the user's question with the exact key number.\n"
                f"2. 'key_insight': 1 sentence highlighting the business implication or notable trend.\n"
                f"RULES:\n"
                f"- No technical SQL jargon.\n"
                f"- Every number must come strictly from the provided result sample.\n"
                f"- Return ONLY a JSON object: {{\"direct_answer\": \"...\", \"key_insight\": \"...\"}}"
            )
            try:
                res = await client.chat.completions.create(
                    model=model,
                    messages=[{"role": "user", "content": summary_prompt}],
                    temperature=0.1,
                    max_tokens=250
                )
                raw = res.choices[0].message.content or "{}"
                match = re.search(r"\{.*\}", raw, re.DOTALL)
                if match:
                    parsed = json.loads(match.group(0))
                    direct_answer = parsed.get("direct_answer", direct_answer)
                    key_insight = parsed.get("key_insight", key_insight)
            except Exception as e:
                logger.warning(f"Summary generation error: {e}")

        full_answer = (
            f"**Direct Answer:** {direct_answer}\n\n"
            f"**Key Insight:** {key_insight}\n\n"
            f"Retrieved **{sql_result['row_count']} rows** from **{dataset.name}**."
        )
        return direct_answer, key_insight, full_answer

    def _generate_followups(self, dataset: DatasetResponse, plan: AnalysisPlan) -> List[str]:
        followups = []
        cat_cols = [c.name for c in dataset.columns if c.column_type == "categorical"]
        num_cols = [c.name for c in dataset.columns if c.column_type == "numerical"]

        if plan.intent == "time_series" and cat_cols:
            followups.append(f"Break down sales by {cat_cols[0]}")
        elif plan.intent == "ranking" and len(cat_cols) > 1:
            followups.append(f"Compare by {cat_cols[1]}")
        
        if num_cols and cat_cols:
            followups.append(f"Show total {num_cols[0]} by {cat_cols[0]}")
        followups.append("What values are missing in this dataset?")
        return followups[:3]

analyst_agent = AnalystAgent()
