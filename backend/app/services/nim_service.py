import time
import asyncio
from typing import List, Dict, Any, Optional
from openai import AsyncOpenAI
import httpx

from app.config.settings import settings
from app.schemas.chat import ChatHistoryMessage, ChatResponse
from app.schemas.datasets import DatasetResponse
from app.utils.logger import logger
from app.utils.exceptions import AppException

class NimService:
    def __init__(self):
        self.timeout_seconds = 30.0
        self.max_retries = 2

    def _get_client(self) -> Optional[AsyncOpenAI]:
        """Instantiates AsyncOpenAI configured for NVIDIA NIM."""
        api_key = settings.NVIDIA_NIM_API_KEY.strip()
        if not api_key:
            return None

        return AsyncOpenAI(
            base_url=settings.NVIDIA_NIM_BASE_URL,
            api_key=api_key,
            http_client=httpx.AsyncClient(timeout=self.timeout_seconds)
        )

    def build_system_prompt(self, dataset: Optional[DatasetResponse] = None) -> str:
        """Constructs schema-grounded system prompt."""
        base_prompt = (
            "You are Nova, an enterprise AI Data Analyst agent. Your job is to answer questions about datasets "
            "with mathematical accuracy, clear explanations, and precision.\n\n"
            "STRICT GROUNDING RULES:\n"
            "1. ONLY reference columns and tables that explicitly exist in the provided dataset schema.\n"
            "2. NEVER invent, hallucinate, or assume columns that are not listed.\n"
            "3. If asked about columns or available data, enumerate only the provided column names and types.\n"
            "4. Be concise, structured, and professional. Use markdown formatting where appropriate.\n"
        )

        if not dataset:
            return base_prompt + "\nNo active dataset is currently selected. Advise the user to select or upload a dataset."

        # Serialize schema & column statistics into compact prompt context
        schema_lines = [
            f"Active Dataset: '{dataset.name}' (Format: {dataset.format.upper()}, File: {dataset.filename})",
            f"Total Records: {dataset.row_count:,} rows | Columns: {dataset.column_count} columns",
            f"Data Quality Score: {dataset.quality.quality_score}% (Missing Cells: {dataset.quality.missing_cells}, Duplicates: {dataset.quality.duplicate_rows})",
            "\nEXACT COLUMNS AND PROFILES:"
        ]

        for col in dataset.columns:
            col_info = f"- '{col.name}' ({col.column_type}, native dtype: {col.dtype})"
            col_info += f" | {col.unique_count:,} unique values, {col.null_count} nulls"
            
            if col.stats:
                if col.column_type == "numerical":
                    col_info += f" | min: {col.stats.min}, max: {col.stats.max}, mean: {col.stats.mean}, median: {col.stats.median}"
                elif col.column_type in ["categorical", "boolean", "text"] and col.stats.most_frequent:
                    top_vals = [f"{v.value} ({v.count})" for v in col.stats.most_frequent[:3]]
                    col_info += f" | top values: {', '.join(top_vals)}"
                elif col.column_type == "datetime" and col.stats.min_date:
                    col_info += f" | date range: [{col.stats.min_date} to {col.stats.max_date}]"
            
            if col.sample_values:
                samples = [str(s) for s in col.sample_values[:3]]
                col_info += f" | samples: [{', '.join(samples)}]"

            schema_lines.append(col_info)

        return base_prompt + "\n" + "\n".join(schema_lines)

    async def generate_response(
        self,
        question: str,
        dataset: Optional[DatasetResponse] = None,
        conversation_history: Optional[List[ChatHistoryMessage]] = None,
        model_override: Optional[str] = None
    ) -> ChatResponse:
        """Queries NVIDIA NIM with retries, timeout handling, and schema grounding."""
        start_time = time.time()
        model = model_override or settings.NVIDIA_NIM_MODEL
        client = self._get_client()

        # Fallback if no API key is configured
        if not client:
            logger.warning("NVIDIA_NIM_API_KEY is not configured in .env. Providing schema-grounded fallback response.")
            return self._build_offline_fallback(question, dataset, model, start_time)

        system_prompt = self.build_system_prompt(dataset)
        messages = [{"role": "system", "content": system_prompt}]

        if conversation_history:
            for msg in conversation_history[-6:]:
                messages.append({"role": msg.role, "content": msg.content})

        messages.append({"role": "user", "content": question})

        # Retry loop for transient failures / rate limits
        last_error = None
        for attempt in range(self.max_retries + 1):
            try:
                logger.info(f"Dispatching query to NVIDIA NIM (Model: {model}, Attempt: {attempt + 1})")
                response = await client.chat.completions.create(
                    model=model,
                    messages=messages,
                    temperature=0.2,
                    max_tokens=1024,
                    timeout=self.timeout_seconds
                )

                latency_ms = int((time.time() - start_time) * 1000)
                tokens_used = response.usage.total_tokens if response.usage else None
                answer = response.choices[0].message.content or "No response generated."

                # Generate followups
                followups = self._generate_suggested_followups(question, dataset)

                logger.info(f"NVIDIA NIM response completed in {latency_ms}ms (Tokens: {tokens_used})")
                return ChatResponse(
                    answer=answer,
                    dataset_id=dataset.id if dataset else None,
                    dataset_name=dataset.name if dataset else None,
                    model=model,
                    tokens_used=tokens_used,
                    latency_ms=latency_ms,
                    suggested_followups=followups,
                    status="completed"
                )

            except httpx.TimeoutException:
                last_error = "Request to NVIDIA NIM timed out after 30 seconds."
                logger.error(f"NVIDIA NIM timeout on attempt {attempt + 1}")
            except Exception as e:
                last_error = str(e)
                logger.error(f"NVIDIA NIM API error on attempt {attempt + 1}: {e}")

            if attempt < self.max_retries:
                await asyncio.sleep(1.0 * (attempt + 1))

        # If retries fail, return fallback response
        logger.warning("All NVIDIA NIM attempts failed. Falling back to local schema engine.")
        return self._build_offline_fallback(
            question, 
            dataset, 
            model, 
            start_time, 
            error_note=f"Note: Live NVIDIA NIM inference failed ({last_error}). Providing verified schema response."
        )

    def _build_offline_fallback(
        self,
        question: str,
        dataset: Optional[DatasetResponse],
        model: str,
        start_time: float,
        error_note: Optional[str] = None
    ) -> ChatResponse:
        """Deterministic schema-grounded response when NIM is offline or key missing."""
        latency_ms = int((time.time() - start_time) * 1000)
        q_lower = question.lower()

        if not dataset:
            answer = "No dataset is currently selected. Please select or upload a dataset to begin asking analytical questions."
            followups = ["Select SaaS Monthly Subscriptions dataset", "Upload a new CSV dataset"]
        elif any(k in q_lower for k in ["column", "schema", "field", "attribute", "structure"]):
            col_list = "\n".join([f"- **`{c.name}`** ({c.column_type}, `{c.dtype}`): {c.unique_count:,} unique values, {c.null_count} nulls" for c in dataset.columns])
            answer = (
                f"### Dataset Schema: {dataset.name}\n\n"
                f"The dataset contains **{dataset.row_count:,} records** and **{dataset.column_count} columns**:\n\n"
                f"{col_list}\n\n"
                f"**Data Quality Score:** {dataset.quality.quality_score}%"
            )
            followups = [
                f"What are the summary statistics for numerical columns in {dataset.name}?",
                f"Show distribution for {dataset.columns[1].name if len(dataset.columns) > 1 else 'categorical columns'}"
            ]
        elif any(k in q_lower for k in ["stat", "summary", "mean", "min", "max", "average"]):
            num_cols = [c for c in dataset.columns if c.column_type == "numerical" and c.stats]
            if num_cols:
                stats_lines = "\n".join([
                    f"- **`{c.name}`**: Min: `{c.stats.min}`, Max: `{c.stats.max}`, Mean: `{c.stats.mean}`, Median: `{c.stats.median}`, Std: `{c.stats.std}`"
                    for c in num_cols
                ])
                answer = f"### Statistical Summary for {dataset.name}\n\nNumerical column distributions:\n\n{stats_lines}"
            else:
                answer = f"There are no numerical columns in `{dataset.name}` to compute statistical averages."
            followups = ["Which column has the highest variance?", "What are the most frequent categories?"]
        else:
            answer = (
                f"### Analysis Overview for `{dataset.name}`\n\n"
                f"I have inspected the schema for **{dataset.name}** ({dataset.row_count:,} rows, {dataset.column_count} columns). "
                f"Available fields: {', '.join([f'`{c.name}`' for c in dataset.columns])}."
            )
            followups = ["What columns are available?", "Summarize dataset quality"]

        if error_note:
            answer = f"> [!NOTE]\n> {error_note}\n\n" + answer

        return ChatResponse(
            answer=answer,
            dataset_id=dataset.id if dataset else None,
            dataset_name=dataset.name if dataset else None,
            model=model,
            tokens_used=0,
            latency_ms=latency_ms,
            suggested_followups=followups,
            status="fallback"
        )

    def _generate_suggested_followups(self, question: str, dataset: Optional[DatasetResponse]) -> List[str]:
        """Generates dynamic relevant next questions based on schema."""
        if not dataset:
            return ["What datasets are available?"]

        followups = []
        num_cols = [c.name for c in dataset.columns if c.column_type == "numerical"]
        cat_cols = [c.name for c in dataset.columns if c.column_type == "categorical"]

        if num_cols and cat_cols:
            followups.append(f"Break down average {num_cols[0]} by {cat_cols[0]}")
        if len(num_cols) >= 2:
            followups.append(f"Is there a correlation between {num_cols[0]} and {num_cols[1]}?")
        if cat_cols:
            followups.append(f"What is the distribution of {cat_cols[0]}?")

        followups.append("Show overall data quality summary")
        return followups[:3]

nim_service = NimService()
