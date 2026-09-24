import json
import uuid
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime, timezone
from typing import List, Dict, Any, Tuple, Optional

from app.config.settings import settings
from app.schemas.datasets import (
    DatasetResponse,
    ColumnMetadata,
    ColumnStats,
    CategoryFrequency,
    DataQualityMetrics,
    DatasetSummaryResponse,
    DatasetListResponse,
    DatasetPreviewResponse
)
from app.utils.exceptions import DatasetNotFoundError
from app.utils.logger import logger

class DatasetService:
    def __init__(self):
        self._catalog: Dict[str, Dict[str, Any]] = {}
        self._load_catalog()

    def _load_catalog(self) -> None:
        """Loads cached dataset catalog from JSON if exists."""
        if settings.CATALOG_FILE.exists():
            try:
                with open(settings.CATALOG_FILE, 'r', encoding='utf-8') as f:
                    self._catalog = json.load(f)
            except Exception as e:
                logger.error(f"Failed to load datasets catalog: {e}")
                self._catalog = {}

    def _save_catalog(self) -> None:
        """Persists dataset catalog to JSON."""
        try:
            with open(settings.CATALOG_FILE, 'w', encoding='utf-8') as f:
                json.dump(self._catalog, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save datasets catalog: {e}")

    def profile_and_save(self, filename: str, content: bytes, df: pd.DataFrame, ext: str) -> DatasetResponse:
        """Profiles dataset deeply and saves file + catalog entry."""
        dataset_id = str(uuid.uuid4())
        timestamp_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        file_size = len(content)
        total_rows = len(df)
        total_cols = len(df.columns)

        # Sanitize filename & save raw file
        safe_stored_filename = f"{dataset_id}_{filename}"
        file_path = settings.UPLOAD_DIR / safe_stored_filename
        with open(file_path, 'wb') as f:
            f.write(content)

        # Duplicate row detection
        duplicate_rows_count = int(df.duplicated().sum()) if total_rows > 0 else 0
        duplicate_pct = round((duplicate_rows_count / total_rows) * 100.0, 2) if total_rows > 0 else 0.0

        # Total missing cells
        total_cells = total_rows * total_cols
        missing_cells = int(df.isnull().sum().sum())
        missing_pct = round((missing_cells / total_cells) * 100.0, 2) if total_cells > 0 else 0.0

        # Data Quality Composite Score (0 - 100%)
        completeness_score = max(0.0, 100.0 - missing_pct)
        uniqueness_score = max(0.0, 100.0 - duplicate_pct)
        quality_score = round((completeness_score * 0.7) + (uniqueness_score * 0.3), 1)

        type_counts = {"numerical": 0, "categorical": 0, "datetime": 0, "boolean": 0, "text": 0}
        columns_meta: List[ColumnMetadata] = []

        for col_name in df.columns:
            series = df[col_name]
            null_count = int(series.isnull().sum())
            null_percentage = round((null_count / total_rows) * 100.0, 2) if total_rows > 0 else 0.0
            unique_count = int(series.nunique())

            col_type, dtype_str, stats = self._profile_column(series, total_rows)
            type_counts[col_type] = type_counts.get(col_type, 0) + 1

            # Sample values
            clean_samples = series.dropna().head(4).tolist()
            clean_samples = [self._sanitize_val(v) for v in clean_samples]

            columns_meta.append(
                ColumnMetadata(
                    name=str(col_name),
                    dtype=dtype_str,
                    column_type=col_type,
                    null_count=null_count,
                    null_percentage=null_percentage,
                    unique_count=unique_count,
                    sample_values=clean_samples,
                    stats=stats
                )
            )

        quality_metrics = DataQualityMetrics(
            quality_score=quality_score,
            total_cells=total_cells,
            missing_cells=missing_cells,
            missing_percentage=missing_pct,
            duplicate_rows=duplicate_rows_count,
            duplicate_percentage=duplicate_pct,
            column_type_breakdown=type_counts
        )

        file_size_formatted = self._format_file_size(file_size)

        response_data = DatasetResponse(
            id=dataset_id,
            name=Path(filename).stem.replace('_', ' ').replace('-', ' ').title(),
            filename=filename,
            format=ext.lstrip('.').lower(),
            file_size_bytes=file_size,
            file_size_formatted=file_size_formatted,
            row_count=total_rows,
            column_count=total_cols,
            uploaded_at=timestamp_str,
            quality=quality_metrics,
            columns=columns_meta
        )

        # Record in catalog
        self._catalog[dataset_id] = {
            **response_data.model_dump(),
            "stored_file_path": str(file_path)
        }
        self._save_catalog()

        logger.info(f"Dataset '{filename}' profiled with quality score {quality_score}% (ID: {dataset_id})")
        return response_data

    def _profile_column(self, series: pd.Series, total_rows: int) -> Tuple[str, str, Optional[ColumnStats]]:
        """Deep profiling of individual column."""
        non_null_series = series.dropna()

        # 1. Check Boolean
        if pd.api.types.is_bool_dtype(series) or (non_null_series.isin([True, False, 0, 1, 'true', 'false', 'True', 'False']).all() and series.nunique() <= 2):
            val_counts = series.value_counts(dropna=True).head(2)
            most_freq = [
                CategoryFrequency(
                    value=str(val),
                    count=int(cnt),
                    percentage=round((cnt / total_rows) * 100.0, 1) if total_rows > 0 else 0.0
                )
                for val, cnt in val_counts.items()
            ]
            return "boolean", "boolean", ColumnStats(most_frequent=most_freq)

        # 2. Check Datetime
        if pd.api.types.is_datetime64_any_dtype(series):
            return "datetime", "datetime", ColumnStats(
                min_date=str(non_null_series.min()) if not non_null_series.empty else None,
                max_date=str(non_null_series.max()) if not non_null_series.empty else None
            )

        # Try parsing strings as datetime if feasible
        if pd.api.types.is_string_dtype(series) or pd.api.types.is_object_dtype(series):
            if not non_null_series.empty and len(str(non_null_series.iloc[0])) in [10, 19, 23, 24]:
                try:
                    parsed_dt = pd.to_datetime(non_null_series.head(20), errors='coerce')
                    if parsed_dt.notnull().all():
                        full_dt = pd.to_datetime(non_null_series, errors='coerce')
                        return "datetime", "datetime", ColumnStats(
                            min_date=str(full_dt.min().strftime("%Y-%m-%d %H:%M:%S")),
                            max_date=str(full_dt.max().strftime("%Y-%m-%d %H:%M:%S"))
                        )
                except Exception:
                    pass

        # 3. Check Numerical
        if pd.api.types.is_numeric_dtype(series):
            dtype_label = "integer" if pd.api.types.is_integer_dtype(series) else "float"
            stats = None
            if not non_null_series.empty:
                stats = ColumnStats(
                    min=self._sanitize_val(non_null_series.min()),
                    max=self._sanitize_val(non_null_series.max()),
                    mean=round(float(non_null_series.mean()), 2) if not np.isnan(non_null_series.mean()) else None,
                    median=round(float(non_null_series.median()), 2) if not np.isnan(non_null_series.median()) else None,
                    std=round(float(non_null_series.std()), 2) if not np.isnan(non_null_series.std()) else None
                )
            return "numerical", dtype_label, stats

        # 4. Categorical vs Free Text
        unique_cnt = series.nunique()
        val_counts = series.value_counts(dropna=True).head(5)
        most_freq = [
            CategoryFrequency(
                value=str(val),
                count=int(cnt),
                percentage=round((cnt / total_rows) * 100.0, 1) if total_rows > 0 else 0.0
            )
            for val, cnt in val_counts.items()
        ]

        if unique_cnt <= 50 or (total_rows > 0 and (unique_cnt / total_rows) < 0.2):
            return "categorical", "string", ColumnStats(most_frequent=most_freq)
        else:
            return "text", "string", ColumnStats(most_frequent=most_freq)

    def list_datasets(self) -> DatasetListResponse:
        """Returns summary list of all registered datasets."""
        summaries = [
            DatasetSummaryResponse(
                id=ds["id"],
                name=ds["name"],
                filename=ds["filename"],
                format=ds["format"],
                file_size_formatted=ds["file_size_formatted"],
                row_count=ds["row_count"],
                column_count=ds["column_count"],
                quality_score=ds.get("quality", {}).get("quality_score", 100.0),
                uploaded_at=ds["uploaded_at"]
            )
            for ds in self._catalog.values()
        ]
        return DatasetListResponse(datasets=summaries, total=len(summaries))

    def get_dataset(self, dataset_id: str) -> DatasetResponse:
        """Retrieves full metadata for a specific dataset ID with schema migration."""
        if dataset_id not in self._catalog:
            raise DatasetNotFoundError(dataset_id)
        data = dict(self._catalog[dataset_id])

        # Backward compatibility for early phase records missing new schema fields
        if "quality" not in data or not data["quality"]:
            data["quality"] = {
                "quality_score": 100.0,
                "total_cells": data.get("row_count", 0) * data.get("column_count", 0),
                "missing_cells": 0,
                "missing_percentage": 0.0,
                "duplicate_rows": 0,
                "duplicate_percentage": 0.0,
                "column_type_breakdown": {"numerical": 0, "categorical": 0, "datetime": 0, "boolean": 0, "text": 0}
            }

        if "columns" in data and isinstance(data["columns"], list):
            migrated_cols = []
            for col in data["columns"]:
                c = dict(col)
                if "column_type" not in c:
                    dtype = str(c.get("dtype", "string")).lower()
                    if "int" in dtype or "float" in dtype:
                        c["column_type"] = "numerical"
                    elif "bool" in dtype:
                        c["column_type"] = "boolean"
                    elif "date" in dtype or "time" in dtype:
                        c["column_type"] = "datetime"
                    else:
                        c["column_type"] = "categorical"
                if "null_percentage" not in c:
                    total_r = data.get("row_count", 1) or 1
                    c["null_percentage"] = round((c.get("null_count", 0) / total_r) * 100.0, 2)
                migrated_cols.append(c)
            data["columns"] = migrated_cols

        return DatasetResponse(**data)

    def get_preview(self, dataset_id: str, limit: int = 50) -> DatasetPreviewResponse:
        """Loads dataset and returns top N preview rows."""
        if dataset_id not in self._catalog:
            raise DatasetNotFoundError(dataset_id)

        meta = self._catalog[dataset_id]
        file_path = Path(meta["stored_file_path"])
        if not file_path.exists():
            raise DatasetNotFoundError(dataset_id)

        # Read top N rows
        if meta["format"] == "csv":
            df = pd.read_csv(file_path, nrows=limit)
        else:
            df = pd.read_excel(file_path, nrows=limit)

        # Sanitize rows for JSON serialization
        df = df.replace({np.nan: None})
        rows = df.to_dict(orient="records")

        return DatasetPreviewResponse(
            dataset_id=dataset_id,
            total_rows=meta["row_count"],
            preview_limit=limit,
            columns=list(df.columns),
            rows=rows
        )

    def _sanitize_val(self, val: Any) -> Any:
        if pd.isna(val) or val is None:
            return None
        if isinstance(val, (np.integer, int)):
            return int(val)
        if isinstance(val, (np.floating, float)):
            return float(val)
        return str(val)

    def _format_file_size(self, size_bytes: int) -> str:
        if size_bytes < 1024:
            return f"{size_bytes} B"
        elif size_bytes < 1024 * 1024:
            return f"{size_bytes / 1024:.1f} KB"
        else:
            return f"{size_bytes / (1024 * 1024):.1f} MB"

dataset_service = DatasetService()
