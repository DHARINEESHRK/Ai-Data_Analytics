import json
import uuid
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime, timezone
from typing import List, Dict, Any

from app.config.settings import settings
from app.schemas.datasets import (
    DatasetResponse,
    ColumnMetadata,
    ColumnStats,
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
        """Profiles dataframe metadata and saves file + catalog entry."""
        dataset_id = str(uuid.uuid4())
        timestamp_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        file_size = len(content)

        # Sanitize filename & save raw file
        safe_stored_filename = f"{dataset_id}_{filename}"
        file_path = settings.UPLOAD_DIR / safe_stored_filename
        with open(file_path, 'wb') as f:
            f.write(content)

        # Profile columns
        columns_meta: List[ColumnMetadata] = []
        for col_name in df.columns:
            series = df[col_name]
            null_count = int(series.isnull().sum())
            unique_count = int(series.nunique())

            # Infer clean dtype category
            dtype_str = self._map_dtype(series.dtype)

            # Sample values
            clean_samples = series.dropna().head(3).tolist()
            clean_samples = [self._sanitize_val(v) for v in clean_samples]

            stats = None
            if pd.api.types.is_numeric_dtype(series) and not series.dropna().empty:
                stats = ColumnStats(
                    min=self._sanitize_val(series.min()),
                    max=self._sanitize_val(series.max()),
                    mean=round(float(series.mean()), 2) if not np.isnan(series.mean()) else None,
                    median=round(float(series.median()), 2) if not np.isnan(series.median()) else None,
                    std=round(float(series.std()), 2) if not np.isnan(series.std()) else None
                )

            columns_meta.append(
                ColumnMetadata(
                    name=str(col_name),
                    dtype=dtype_str,
                    null_count=null_count,
                    unique_count=unique_count,
                    sample_values=clean_samples,
                    stats=stats
                )
            )

        # Format readable file size
        file_size_formatted = self._format_file_size(file_size)

        response_data = DatasetResponse(
            id=dataset_id,
            name=Path(filename).stem.replace('_', ' ').replace('-', ' ').title(),
            filename=filename,
            format=ext.lstrip('.').lower(),
            file_size_bytes=file_size,
            file_size_formatted=file_size_formatted,
            row_count=len(df),
            column_count=len(df.columns),
            uploaded_at=timestamp_str,
            columns=columns_meta
        )

        # Record in catalog
        self._catalog[dataset_id] = {
            **response_data.model_dump(),
            "stored_file_path": str(file_path)
        }
        self._save_catalog()

        logger.info(f"Dataset '{filename}' successfully ingested & profiled (ID: {dataset_id}, Rows: {len(df)})")
        return response_data

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
                uploaded_at=ds["uploaded_at"]
            )
            for ds in self._catalog.values()
        ]
        return DatasetListResponse(datasets=summaries, total=len(summaries))

    def get_dataset(self, dataset_id: str) -> DatasetResponse:
        """Retrieves full metadata for a specific dataset ID."""
        if dataset_id not in self._catalog:
            raise DatasetNotFoundError(dataset_id)
        data = self._catalog[dataset_id]
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

    def _map_dtype(self, dtype: Any) -> str:
        if pd.api.types.is_integer_dtype(dtype):
            return "integer"
        if pd.api.types.is_float_dtype(dtype):
            return "float"
        if pd.api.types.is_datetime64_any_dtype(dtype):
            return "datetime"
        if pd.api.types.is_bool_dtype(dtype):
            return "boolean"
        return "string"

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
