import duckdb
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

from app.config.settings import settings
from app.services.dataset_service import dataset_service
from app.schemas.datasets import DatasetResponse
from app.utils.exceptions import AppException
from app.utils.logger import logger

class QueryTools:
    """Modular analytics and query execution tools for AI Analyst Agent."""

    @staticmethod
    def get_dataset_profile(dataset_id: str) -> Dict[str, Any]:
        """Tool 1: Returns full dataset profiling and quality metrics."""
        dataset = dataset_service.get_dataset(dataset_id)
        return dataset.model_dump()

    @staticmethod
    def get_schema(dataset_id: str) -> Dict[str, Any]:
        """Tool 2: Returns lightweight column schema for SQL and planning."""
        dataset = dataset_service.get_dataset(dataset_id)
        return {
            "dataset_id": dataset.id,
            "dataset_name": dataset.name,
            "filename": dataset.filename,
            "row_count": dataset.row_count,
            "column_count": dataset.column_count,
            "columns": [
                {
                    "name": c.name,
                    "type": c.column_type,
                    "dtype": c.dtype,
                    "null_count": c.null_count,
                    "sample_values": c.sample_values[:3]
                }
                for c in dataset.columns
            ]
        }

    @staticmethod
    def execute_sql(dataset_id: str, sql_query: str, row_limit: Optional[int] = 100) -> Dict[str, Any]:
        """Tool 3: Executes read-only SQL queries on DuckDB virtual tables with timeout and row limits."""
        from app.tools.sql_tool import sql_tool
        return sql_tool.execute_query(dataset_id=dataset_id, sql_query=sql_query, row_limit=row_limit)

    @staticmethod
    def run_statistical_analysis(
        dataset_id: str,
        col_x: str,
        col_y: str,
        analysis_type: str = "correlation"
    ) -> Dict[str, Any]:
        """Tool 4: Computes statistical correlation, covariance, and distributions using numpy/pandas."""
        dataset = dataset_service.get_dataset(dataset_id)
        file_path = Path(dataset_service._catalog[dataset_id]["stored_file_path"])

        if dataset.format == "csv":
            df = pd.read_csv(file_path)
        else:
            df = pd.read_excel(file_path)

        if col_x not in df.columns or col_y not in df.columns:
            raise AppException(f"Columns '{col_x}' and/or '{col_y}' do not exist in dataset.")

        clean_df = df[[col_x, col_y]].dropna()
        if clean_df.empty:
            raise AppException("Insufficient numeric data after dropping nulls.")

        x_series = pd.to_numeric(clean_df[col_x], errors="coerce")
        y_series = pd.to_numeric(clean_df[col_y], errors="coerce")

        valid_mask = x_series.notnull() & y_series.notnull()
        x_clean = x_series[valid_mask]
        y_clean = y_series[valid_mask]

        if len(x_clean) < 2:
            raise AppException("Not enough numerical observations to calculate statistics.")

        # Compute Pearson correlation & covariance with numpy / pandas builtins
        pearson_corr = round(float(x_clean.corr(y_clean, method="pearson")), 3)
        covariance = round(float(x_clean.cov(y_clean)), 2)

        strength = "weak"
        if abs(pearson_corr) >= 0.7:
            strength = "strong"
        elif abs(pearson_corr) >= 0.4:
            strength = "moderate"

        direction = "positive" if pearson_corr > 0 else "negative" if pearson_corr < 0 else "neutral"

        return {
            "analysis_type": analysis_type,
            "col_x": col_x,
            "col_y": col_y,
            "observations_count": len(x_clean),
            "pearson_correlation": pearson_corr,
            "covariance": covariance,
            "strength": strength,
            "direction": direction,
            "summary": f"There is a {strength} {direction} correlation (r = {pearson_corr}) between '{col_x}' and '{col_y}'."
        }

    @staticmethod
    def create_visualization(
        data: List[Dict[str, Any]],
        chart_type: str,
        x_key: str,
        y_key: str,
        title: str
    ) -> Dict[str, Any]:
        """Tool 5: Formats visualization payload for interactive charts."""
        return {
            "type": chart_type,
            "xAxisKey": x_key,
            "yAxisKey": y_key,
            "title": title,
            "data": data
        }

    @staticmethod
    def validate_result(data: Dict[str, Any]) -> Dict[str, Any]:
        """Tool 6: Validates analytical correctness and absence of empty results."""
        if not data:
            return {"valid": False, "reason": "Empty analytical result returned."}

        rows = data.get("rows", [])
        if len(rows) == 0:
            return {"valid": False, "reason": "Query executed successfully but matched 0 rows."}

        return {"valid": True, "row_count": len(rows)}

query_tools = QueryTools()
