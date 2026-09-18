import time
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple, Union

try:
    from scipy import stats as sp_stats
    HAS_SCIPY = True
except ImportError:
    HAS_SCIPY = False

from app.services.dataset_service import dataset_service
from app.utils.exceptions import AppException
from app.utils.logger import logger

class PythonAnalyticsEngine:
    """Safe, controlled Python analytics layer executing predefined analytical operations using Pandas, NumPy, and SciPy."""

    def _load_dataframe(self, dataset_id: str) -> Tuple[pd.DataFrame, str]:
        """Safely loads dataset into a Pandas DataFrame."""
        dataset = dataset_service.get_dataset(dataset_id)
        file_path = Path(dataset_service._catalog[dataset_id]["stored_file_path"])
        if not file_path.exists():
            raise AppException(f"Dataset file '{dataset.filename}' not found on storage.")

        if dataset.format == "csv":
            df = pd.read_csv(file_path)
        else:
            df = pd.read_excel(file_path)

        return df, dataset.name

    def _validate_columns(self, df: pd.DataFrame, required_cols: List[str]):
        """Ensures all requested columns actually exist in the dataframe."""
        missing = [col for col in required_cols if col not in df.columns]
        if missing:
            raise AppException(
                f"Requested column(s) do not exist in dataset: {', '.join(missing)}. "
                f"Available columns: {', '.join(df.columns.tolist())}"
            )

    def calculate_statistics(
        self, 
        dataset_id: str, 
        columns: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Computes comprehensive descriptive statistics across specified or all numerical columns."""
        df, dataset_name = self._load_dataframe(dataset_id)
        
        if columns:
            self._validate_columns(df, columns)
            target_df = df[columns]
        else:
            target_df = df.select_dtypes(include=[np.number])

        if target_df.empty:
            raise AppException("No numerical columns available for descriptive statistics.")

        stats_dict = {}
        for col in target_df.columns:
            s = pd.to_numeric(target_df[col], errors="coerce").dropna()
            if s.empty:
                continue

            q25 = float(s.quantile(0.25))
            q50 = float(s.median())
            q75 = float(s.quantile(0.75))
            iqr = q75 - q25
            skewness = float(s.skew()) if len(s) > 2 else 0.0
            kurt = float(s.kurtosis()) if len(s) > 3 else 0.0

            stats_dict[col] = {
                "count": int(s.count()),
                "mean": round(float(s.mean()), 3),
                "std": round(float(s.std()), 3) if len(s) > 1 else 0.0,
                "min": round(float(s.min()), 3),
                "q25": round(q25, 3),
                "median": round(q50, 3),
                "q75": round(q75, 3),
                "max": round(float(s.max()), 3),
                "iqr": round(iqr, 3),
                "variance": round(float(s.var()), 3) if len(s) > 1 else 0.0,
                "skewness": round(skewness, 3),
                "kurtosis": round(kurt, 3)
            }

        return {
            "statistics": stats_dict,
            "columns_analyzed": list(stats_dict.keys()),
            "summary": f"Calculated descriptive statistics across {len(stats_dict)} numerical columns for '{dataset_name}'."
        }

    def calculate_correlation(
        self, 
        dataset_id: str, 
        x_column: str, 
        y_column: str,
        method: str = "pearson"
    ) -> Dict[str, Any]:
        """Calculates Pearson & Spearman correlation, p-value, covariance, and linear regression parameters."""
        df, dataset_name = self._load_dataframe(dataset_id)
        self._validate_columns(df, [x_column, y_column])

        sub_df = df[[x_column, y_column]].dropna()
        x_series = pd.to_numeric(sub_df[x_column], errors="coerce")
        y_series = pd.to_numeric(sub_df[y_column], errors="coerce")

        valid_mask = x_series.notnull() & y_series.notnull()
        x_clean = x_series[valid_mask]
        y_clean = y_series[valid_mask]

        if len(x_clean) < 2:
            raise AppException("Insufficient paired numerical observations to calculate correlation.")

        pearson_r = float(x_clean.corr(y_clean, method="pearson"))
        spearman_r = float(x_clean.corr(y_clean, method="spearman"))
        covariance = float(x_clean.cov(y_clean))

        p_value = None
        if HAS_SCIPY and len(x_clean) >= 3:
            try:
                _, p_value = sp_stats.pearsonr(x_clean, y_clean)
                p_value = round(float(p_value), 6)
            except Exception:
                p_value = None

        strength = "weak"
        abs_r = abs(pearson_r)
        if abs_r >= 0.7:
            strength = "strong"
        elif abs_r >= 0.4:
            strength = "moderate"

        direction = "positive" if pearson_r > 0 else "negative" if pearson_r < 0 else "neutral"

        # Fit simple trendline: y = mx + b
        try:
            m, b = np.polyfit(x_clean, y_clean, 1)
            slope = round(float(m), 4)
            intercept = round(float(b), 4)
        except Exception:
            slope, intercept = 0.0, 0.0

        return {
            "x_column": x_column,
            "y_column": y_column,
            "observations_count": len(x_clean),
            "pearson_r": round(pearson_r, 4),
            "spearman_r": round(spearman_r, 4),
            "covariance": round(covariance, 3),
            "p_value": p_value,
            "slope": slope,
            "intercept": intercept,
            "strength": strength,
            "direction": direction,
            "summary": f"Identified a {strength} {direction} correlation (Pearson r = {round(pearson_r, 3)}) between '{x_column}' and '{y_column}'."
        }

    def detect_outliers(
        self, 
        dataset_id: str, 
        column: str, 
        method: str = "iqr"
    ) -> Dict[str, Any]:
        """Detects outliers using IQR (Interquartile Range) or Z-score method."""
        df, dataset_name = self._load_dataframe(dataset_id)
        self._validate_columns(df, [column])

        s = pd.to_numeric(df[column], errors="coerce").dropna()
        if len(s) < 4:
            raise AppException("At least 4 observations are required for outlier detection.")

        if method == "zscore" and HAS_SCIPY:
            z_scores = np.abs(sp_stats.zscore(s))
            outlier_mask = z_scores > 3.0
            outlier_values = s[outlier_mask].tolist()
            threshold_info = {"zscore_threshold": 3.0}
        else:
            q25 = float(s.quantile(0.25))
            q75 = float(s.quantile(0.75))
            iqr = q75 - q25
            lower_bound = q25 - (1.5 * iqr)
            upper_bound = q75 + (1.5 * iqr)
            outlier_mask = (s < lower_bound) | (s > upper_bound)
            outlier_values = s[outlier_mask].tolist()
            threshold_info = {
                "q25": round(q25, 2),
                "q75": round(q75, 2),
                "iqr": round(iqr, 2),
                "lower_bound": round(lower_bound, 2),
                "upper_bound": round(upper_bound, 2)
            }

        outlier_count = len(outlier_values)
        outlier_percentage = round((outlier_count / len(s)) * 100, 2)

        return {
            "column": column,
            "method": method,
            "total_records": len(s),
            "outlier_count": outlier_count,
            "outlier_percentage": outlier_percentage,
            "thresholds": threshold_info,
            "sample_outliers": outlier_values[:20],
            "summary": f"Found {outlier_count} outliers ({outlier_percentage}%) in column '{column}' using {method.upper()} analysis."
        }

    def aggregate_data(
        self,
        dataset_id: str,
        group_by_column: str,
        metric_column: str,
        aggregation_func: str = "mean"
    ) -> Dict[str, Any]:
        """Groups data by a categorical column and applies mathematical aggregation."""
        df, dataset_name = self._load_dataframe(dataset_id)
        self._validate_columns(df, [group_by_column, metric_column])

        clean_df = df[[group_by_column, metric_column]].dropna()
        clean_df[metric_column] = pd.to_numeric(clean_df[metric_column], errors="coerce")
        clean_df = clean_df.dropna()

        if clean_df.empty:
            raise AppException("No valid records available after filtering missing values.")

        allowed_funcs = ["mean", "sum", "count", "min", "max", "median", "std"]
        if aggregation_func.lower() not in allowed_funcs:
            raise AppException(f"Unsupported aggregation function '{aggregation_func}'. Choose from: {', '.join(allowed_funcs)}")

        grouped = clean_df.groupby(group_by_column)[metric_column].agg(aggregation_func.lower()).reset_index()
        grouped = grouped.sort_values(by=metric_column, ascending=False)

        records = grouped.to_dict(orient="records")

        return {
            "group_by_column": group_by_column,
            "metric_column": metric_column,
            "aggregation": aggregation_func,
            "groups_count": len(records),
            "data": records[:50],
            "summary": f"Aggregated {metric_column} by {group_by_column} using {aggregation_func.upper()} across {len(records)} categories."
        }

    def analyze_time_series(
        self,
        dataset_id: str,
        time_column: str,
        metric_column: str,
        interval: str = "M"
    ) -> Dict[str, Any]:
        """Aggregates temporal series data across intervals (Daily, Weekly, Monthly, Yearly)."""
        df, dataset_name = self._load_dataframe(dataset_id)
        self._validate_columns(df, [time_column, metric_column])

        temp_df = df[[time_column, metric_column]].copy()
        temp_df[time_column] = pd.to_datetime(temp_df[time_column], errors="coerce")
        temp_df[metric_column] = pd.to_numeric(temp_df[metric_column], errors="coerce")
        temp_df = temp_df.dropna()

        if len(temp_df) < 2:
            raise AppException("Insufficient valid timestamp & metric pairs for time-series aggregation.")

        # Map common interval aliases to Pandas 2.2+ offset aliases
        interval_map = {
            "d": "D", "daily": "D",
            "w": "W", "weekly": "W",
            "m": "ME", "monthly": "ME", "me": "ME",
            "q": "QE", "quarterly": "QE", "qe": "QE",
            "y": "YE", "yearly": "YE", "annual": "YE", "ye": "YE"
        }
        freq = interval_map.get(interval.lower(), "ME")

        temp_df = temp_df.set_index(time_column).sort_index()
        # Resample by interval and aggregate sum and mean
        resampled = temp_df.resample(freq).agg({metric_column: ["sum", "mean", "count"]})
        resampled.columns = ["total", "average", "count"]
        resampled = resampled.reset_index()

        resampled["date_formatted"] = resampled[time_column].dt.strftime("%Y-%m-%d")
        resampled = resampled.replace({np.nan: None})

        records = resampled.to_dict(orient="records")

        return {
            "time_column": time_column,
            "metric_column": metric_column,
            "interval": interval,
            "points_count": len(records),
            "data": records,
            "summary": f"Aggregated {len(records)} time intervals for metric '{metric_column}' from column '{time_column}'."
        }

    def execute_operation(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Dispatcher that executes the chosen analytical operation."""
        start_time = time.perf_counter()
        op = request.get("operation", "").lower()
        dataset_id = request.get("dataset_id")
        
        if not dataset_id:
            raise AppException("dataset_id is required for Python analytics execution.")

        dataset = dataset_service.get_dataset(dataset_id)

        if op in ["descriptive_statistics", "statistics"]:
            result = self.calculate_statistics(dataset_id, columns=request.get("columns"))
        elif op == "correlation":
            x_col = request.get("x_column")
            y_col = request.get("y_column")
            if not x_col or not y_col:
                raise AppException("Both 'x_column' and 'y_column' are required for correlation analysis.")
            result = self.calculate_correlation(dataset_id, x_column=x_col, y_column=y_col)
        elif op in ["outlier_detection", "outliers"]:
            col = request.get("column") or request.get("x_column")
            if not col:
                raise AppException("'column' is required for outlier detection.")
            result = self.detect_outliers(dataset_id, column=col, method=request.get("method", "iqr"))
        elif op in ["group_aggregation", "aggregation"]:
            grp = request.get("group_by_column")
            metric = request.get("metric_column") or request.get("y_column")
            if not grp or not metric:
                raise AppException("'group_by_column' and 'metric_column' are required for aggregation.")
            result = self.aggregate_data(
                dataset_id, 
                group_by_column=grp, 
                metric_column=metric, 
                aggregation_func=request.get("aggregation_func", "mean")
            )
        elif op in ["time_series", "temporal"]:
            time_col = request.get("time_column") or request.get("x_column")
            metric = request.get("metric_column") or request.get("y_column")
            if not time_col or not metric:
                raise AppException("'time_column' and 'metric_column' are required for time-series analysis.")
            result = self.analyze_time_series(
                dataset_id, 
                time_column=time_col, 
                metric_column=metric, 
                interval=request.get("interval", "M")
            )
        else:
            raise AppException(f"Unsupported analytical operation '{op}'.")

        exec_time_ms = round((time.perf_counter() - start_time) * 1000, 2)

        return {
            "success": True,
            "operation": op,
            "dataset_id": dataset_id,
            "dataset_name": dataset.name,
            "parameters": {k: v for k, v in request.items() if k not in ["dataset_id", "operation"]},
            "results": result,
            "summary": result.get("summary", "Analysis completed successfully."),
            "execution_time_ms": exec_time_ms
        }

python_analytics_engine = PythonAnalyticsEngine()
