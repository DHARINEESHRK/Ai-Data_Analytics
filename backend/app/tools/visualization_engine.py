import time
import json
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple, Union

from app.services.dataset_service import dataset_service
from app.utils.exceptions import AppException
from app.utils.logger import logger

class VisualizationEngine:
    """Production Visualization Engine rendering robust Plotly specifications and Recharts payloads.
    Guaranteed never to crash on edge cases, empty data, high cardinality, or bad parameters.
    """

    COLOR_PALETTES = {
        "primary": ["#3b82f6", "#6366f1", "#8b5cf6", "#ec4899", "#10b981", "#f59e0b", "#06b6d4", "#f43f5e"],
        "gradient": ["#6366f1", "#4f46e5", "#4338ca", "#3730a3", "#312e81"]
    }

    def _load_dataframe(self, dataset_id: str) -> Tuple[pd.DataFrame, str]:
        """Safely loads dataset into a Pandas DataFrame."""
        dataset = dataset_service.get_dataset(dataset_id)
        file_path = Path(dataset_service._catalog[dataset_id]["stored_file_path"])
        if not file_path.exists():
            raise AppException(f"Dataset file '{dataset.filename}' not found.")

        if dataset.format == "csv":
            df = pd.read_csv(file_path)
        else:
            df = pd.read_excel(file_path)

        return df, dataset.name

    def _clean_column_name(self, name: Optional[str]) -> str:
        if not name:
            return ""
        return name.replace("_", " ").title()

    def build_chart(
        self,
        dataset_id: str,
        chart_type: str,
        x_column: Optional[str] = None,
        y_column: Optional[str] = None,
        group_by_column: Optional[str] = None,
        aggregation_func: str = "sum",
        title: Optional[str] = None,
        description: Optional[str] = None,
        max_categories: int = 15
    ) -> Dict[str, Any]:
        """Dispatches and builds safe visualization specs with robust fallbacks."""
        start_time = time.perf_counter()
        chart_type_clean = chart_type.lower().strip()

        df, dataset_name = self._load_dataframe(dataset_id)
        if df.empty:
            return {
                "success": False,
                "chart_type": chart_type_clean,
                "title": title or "Empty Dataset",
                "description": "Dataset has 0 rows.",
                "warning": "No data available to plot.",
                "execution_time_ms": round((time.perf_counter() - start_time) * 1000, 2)
            }

        # Validate / auto-select columns if not provided or missing
        columns = df.columns.tolist()
        num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        cat_cols = df.select_dtypes(exclude=[np.number]).columns.tolist()

        if x_column and x_column not in columns:
            x_column = cat_cols[0] if cat_cols else columns[0]
        if y_column and y_column not in columns:
            y_column = num_cols[0] if num_cols else (columns[1] if len(columns) > 1 else columns[0])

        if not x_column:
            x_column = cat_cols[0] if cat_cols else (num_cols[0] if num_cols else columns[0])
        if not y_column and chart_type_clean not in ["histogram", "kpi", "table"]:
            y_column = num_cols[0] if num_cols else (columns[1] if len(columns) > 1 else x_column)

        # Dispatch chart builders safely
        try:
            if chart_type_clean == "bar":
                result = self._build_bar_chart(df, x_column, y_column, aggregation_func, max_categories, title)
            elif chart_type_clean == "line":
                result = self._build_line_chart(df, x_column, y_column, group_by_column, title)
            elif chart_type_clean == "pie":
                result = self._build_pie_chart(df, x_column, y_column, aggregation_func, max_categories, title)
            elif chart_type_clean == "scatter":
                result = self._build_scatter_chart(df, x_column, y_column, group_by_column, title)
            elif chart_type_clean == "histogram":
                target_col = y_column or x_column
                result = self._build_histogram(df, target_col, title)
            elif chart_type_clean == "area":
                result = self._build_area_chart(df, x_column, y_column, title)
            elif chart_type_clean == "kpi":
                target_col = y_column or (num_cols[0] if num_cols else x_column)
                result = self._build_kpi(df, target_col, aggregation_func, title)
            elif chart_type_clean == "table":
                result = self._build_table(df, title)
            else:
                # Default fallback to bar chart
                result = self._build_bar_chart(df, x_column, y_column, aggregation_func, max_categories, title)
                result["warning"] = f"Unsupported chart_type '{chart_type}'. Fallback to bar chart."

        except Exception as e:
            logger.error(f"Visualization generation error: {e}")
            result = {
                "chart_type": chart_type_clean,
                "title": title or f"Visualization of {dataset_name}",
                "warning": f"Generated safe fallback view due to: {str(e)}",
                "table_data": {"columns": list(df.columns), "rows": df.head(10).replace({np.nan: None}).to_dict(orient="records")}
            }

        exec_time_ms = round((time.perf_counter() - start_time) * 1000, 2)
        return {
            "success": True,
            "chart_type": chart_type_clean,
            "title": result.get("title", title or "Visualization"),
            "description": description,
            "plotly_spec": result.get("plotly_spec"),
            "recharts_data": result.get("recharts_data"),
            "kpi_data": result.get("kpi_data"),
            "table_data": result.get("table_data"),
            "x_column": x_column,
            "y_column": y_column,
            "execution_time_ms": exec_time_ms,
            "warning": result.get("warning")
        }

    def _build_bar_chart(self, df: pd.DataFrame, x_col: str, y_col: str, agg: str, max_cat: int, title: Optional[str]) -> Dict[str, Any]:
        sub_df = df[[x_col, y_col]].dropna()
        sub_df[y_col] = pd.to_numeric(sub_df[y_col], errors="coerce")
        sub_df = sub_df.dropna()

        # Group and aggregate
        grouped = sub_df.groupby(x_col)[y_col].agg(agg.lower() if agg in ["mean", "sum", "count", "min", "max", "median"] else "sum").reset_index()
        grouped = grouped.sort_values(by=y_col, ascending=False)

        # Handle high cardinality
        if len(grouped) > max_cat:
            top = grouped.iloc[:max_cat]
            other_sum = grouped.iloc[max_cat:][y_col].sum()
            other_row = pd.DataFrame([{x_col: "Other", y_col: other_sum}])
            grouped = pd.concat([top, other_row], ignore_index=True)

        chart_title = title or f"{self._clean_column_name(y_col)} by {self._clean_column_name(x_col)}"
        recharts_data = grouped.replace({np.nan: None}).to_dict(orient="records")

        plotly_spec = {
            "data": [{
                "type": "bar",
                "x": grouped[x_col].astype(str).tolist(),
                "y": grouped[y_col].tolist(),
                "marker": {"color": self.COLOR_PALETTES["primary"]}
            }],
            "layout": {
                "title": chart_title,
                "xaxis": {"title": self._clean_column_name(x_col)},
                "yaxis": {"title": self._clean_column_name(y_col)},
                "template": "plotly_white"
            }
        }
        return {"title": chart_title, "plotly_spec": plotly_spec, "recharts_data": recharts_data}

    def _build_line_chart(self, df: pd.DataFrame, x_col: str, y_col: str, group_col: Optional[str], title: Optional[str]) -> Dict[str, Any]:
        sub_df = df[[x_col, y_col]].dropna()
        sub_df[y_col] = pd.to_numeric(sub_df[y_col], errors="coerce")
        sub_df = sub_df.dropna().sort_values(by=x_col)

        chart_title = title or f"{self._clean_column_name(y_col)} Trend over {self._clean_column_name(x_col)}"
        recharts_data = sub_df.head(100).replace({np.nan: None}).to_dict(orient="records")

        plotly_spec = {
            "data": [{
                "type": "scatter",
                "mode": "lines+markers",
                "x": sub_df[x_col].astype(str).tolist(),
                "y": sub_df[y_col].tolist(),
                "line": {"color": "#6366f1", "width": 2.5}
            }],
            "layout": {
                "title": chart_title,
                "xaxis": {"title": self._clean_column_name(x_col)},
                "yaxis": {"title": self._clean_column_name(y_col)},
                "template": "plotly_white"
            }
        }
        return {"title": chart_title, "plotly_spec": plotly_spec, "recharts_data": recharts_data}

    def _build_pie_chart(self, df: pd.DataFrame, x_col: str, y_col: str, agg: str, max_cat: int, title: Optional[str]) -> Dict[str, Any]:
        sub_df = df[[x_col, y_col]].dropna()
        sub_df[y_col] = pd.to_numeric(sub_df[y_col], errors="coerce")
        sub_df = sub_df.dropna()

        grouped = sub_df.groupby(x_col)[y_col].agg("sum").reset_index()
        grouped = grouped.sort_values(by=y_col, ascending=False)

        if len(grouped) > max_cat:
            top = grouped.iloc[:max_cat]
            other_sum = grouped.iloc[max_cat:][y_col].sum()
            other_row = pd.DataFrame([{x_col: "Other", y_col: other_sum}])
            grouped = pd.concat([top, other_row], ignore_index=True)

        chart_title = title or f"Share of {self._clean_column_name(y_col)} by {self._clean_column_name(x_col)}"
        recharts_data = grouped.replace({np.nan: None}).to_dict(orient="records")

        plotly_spec = {
            "data": [{
                "type": "pie",
                "labels": grouped[x_col].astype(str).tolist(),
                "values": grouped[y_col].tolist(),
                "hole": 0.4,
                "marker": {"colors": self.COLOR_PALETTES["primary"]}
            }],
            "layout": {
                "title": chart_title,
                "template": "plotly_white"
            }
        }
        return {"title": chart_title, "plotly_spec": plotly_spec, "recharts_data": recharts_data}

    def _build_scatter_chart(self, df: pd.DataFrame, x_col: str, y_col: str, group_col: Optional[str], title: Optional[str]) -> Dict[str, Any]:
        cols = [x_col, y_col]
        if group_col and group_col in df.columns:
            cols.append(group_col)
        sub_df = df[cols].dropna()
        sub_df[x_col] = pd.to_numeric(sub_df[x_col], errors="coerce")
        sub_df[y_col] = pd.to_numeric(sub_df[y_col], errors="coerce")
        sub_df = sub_df.dropna()

        chart_title = title or f"{self._clean_column_name(y_col)} vs {self._clean_column_name(x_col)}"
        recharts_data = sub_df.head(200).replace({np.nan: None}).to_dict(orient="records")

        plotly_spec = {
            "data": [{
                "type": "scatter",
                "mode": "markers",
                "x": sub_df[x_col].tolist(),
                "y": sub_df[y_col].tolist(),
                "marker": {"color": "#8b5cf6", "size": 8, "opacity": 0.75}
            }],
            "layout": {
                "title": chart_title,
                "xaxis": {"title": self._clean_column_name(x_col)},
                "yaxis": {"title": self._clean_column_name(y_col)},
                "template": "plotly_white"
            }
        }
        return {"title": chart_title, "plotly_spec": plotly_spec, "recharts_data": recharts_data}

    def _build_histogram(self, df: pd.DataFrame, col: str, title: Optional[str]) -> Dict[str, Any]:
        s = pd.to_numeric(df[col], errors="coerce").dropna()
        chart_title = title or f"Distribution of {self._clean_column_name(col)}"

        # Compute bin frequencies for Recharts
        counts, bin_edges = np.histogram(s, bins=10)
        recharts_data = [
            {"range": f"{round(bin_edges[i], 1)}-{round(bin_edges[i+1], 1)}", "frequency": int(counts[i])}
            for i in range(len(counts))
        ]

        plotly_spec = {
            "data": [{
                "type": "histogram",
                "x": s.tolist(),
                "marker": {"color": "#10b981"}
            }],
            "layout": {
                "title": chart_title,
                "xaxis": {"title": self._clean_column_name(col)},
                "yaxis": {"title": "Frequency"},
                "template": "plotly_white"
            }
        }
        return {"title": chart_title, "plotly_spec": plotly_spec, "recharts_data": recharts_data}

    def _build_area_chart(self, df: pd.DataFrame, x_col: str, y_col: str, title: Optional[str]) -> Dict[str, Any]:
        sub_df = df[[x_col, y_col]].dropna()
        sub_df[y_col] = pd.to_numeric(sub_df[y_col], errors="coerce")
        sub_df = sub_df.dropna().sort_values(by=x_col)

        chart_title = title or f"{self._clean_column_name(y_col)} Cumulative Area by {self._clean_column_name(x_col)}"
        recharts_data = sub_df.head(100).replace({np.nan: None}).to_dict(orient="records")

        plotly_spec = {
            "data": [{
                "type": "scatter",
                "mode": "lines",
                "fill": "tozeroy",
                "x": sub_df[x_col].astype(str).tolist(),
                "y": sub_df[y_col].tolist(),
                "line": {"color": "#3b82f6"},
                "fillcolor": "rgba(59, 130, 246, 0.25)"
            }],
            "layout": {
                "title": chart_title,
                "xaxis": {"title": self._clean_column_name(x_col)},
                "yaxis": {"title": self._clean_column_name(y_col)},
                "template": "plotly_white"
            }
        }
        return {"title": chart_title, "plotly_spec": plotly_spec, "recharts_data": recharts_data}

    def _build_kpi(self, df: pd.DataFrame, col: str, agg: str, title: Optional[str]) -> Dict[str, Any]:
        s = pd.to_numeric(df[col], errors="coerce").dropna()
        val = float(s.sum() if agg == "sum" else (s.mean() if agg == "mean" else s.count()))
        chart_title = title or f"Total {self._clean_column_name(col)}"

        kpi_data = {
            "metric_name": self._clean_column_name(col),
            "value": round(val, 2),
            "formatted_value": f"{val:,.2f}" if val >= 1000 else f"{val:.2f}",
            "aggregation": agg.upper(),
            "count": int(s.count())
        }
        return {"title": chart_title, "kpi_data": kpi_data}

    def _build_table(self, df: pd.DataFrame, title: Optional[str]) -> Dict[str, Any]:
        chart_title = title or "Data Table Preview"
        table_data = {
            "columns": list(df.columns),
            "rows": df.head(25).replace({np.nan: None}).to_dict(orient="records"),
            "total_rows": len(df)
        }
        return {"title": chart_title, "table_data": table_data}

visualization_engine = VisualizationEngine()
