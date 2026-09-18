import time
import uuid
import numpy as np
import pandas as pd
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.engine import URL

from app.config.settings import settings
from app.services.dataset_service import dataset_service
from app.schemas.datasets import DatasetResponse, ColumnMetadata, ColumnStats, CategoryFrequency, DataQualityMetrics
from app.utils.exceptions import AppException
from app.utils.logger import logger

class PostgresConnectorService:
    """Secure PostgreSQL connection, schema discovery, and analytical execution engine."""

    def __init__(self):
        # In-memory session store mapping dataset_id -> SQLAlchemy engine/connection string (never exposed to frontend)
        self._connection_pool: Dict[str, str] = {}

    def _build_url(self, host: str, port: int, database: str, username: str, password: str, ssl_mode: str = "prefer") -> str:
        """Constructs secure SQLAlchemy connection string."""
        url_obj = URL.create(
            drivername="postgresql+psycopg2",
            username=username,
            password=password,
            host=host,
            port=port,
            database=database,
            query={"sslmode": ssl_mode} if ssl_mode else {}
        )
        return url_obj.render_as_string(hide_password=False)

    def test_connection(self, host: str, port: int, database: str, username: str, password: str, ssl_mode: str = "prefer") -> Dict[str, Any]:
        """Tests live database connectivity and lists user tables in public schema."""
        conn_str = self._build_url(host, port, database, username, password, ssl_mode)
        try:
            engine = create_engine(conn_str, connect_args={"connect_timeout": 5})
            with engine.connect() as conn:
                version_res = conn.execute(text("SELECT version();")).scalar()
                
                # Fetch available tables in public schema
                tables_query = text("""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
                    ORDER BY table_name;
                """)
                tables = [row[0] for row in conn.execute(tables_query).fetchall()]

            engine.dispose()
            return {
                "success": True,
                "message": f"Successfully connected to PostgreSQL database '{database}'",
                "server_version": str(version_res).split(",")[0] if version_res else "PostgreSQL",
                "database": database,
                "tables_count": len(tables),
                "tables": tables
            }
        except Exception as e:
            logger.error(f"PostgreSQL connection test failed: {e}")
            raise AppException(f"PostgreSQL Connection Error: {str(e)}")

    def discover_table_schema(self, host: str, port: int, database: str, username: str, password: str, table_name: str) -> Dict[str, Any]:
        """Reads detailed column data types and approximate row counts for a table."""
        conn_str = self._build_url(host, port, database, username, password)
        try:
            engine = create_engine(conn_str, connect_args={"connect_timeout": 5})
            with engine.connect() as conn:
                col_query = text("""
                    SELECT column_name, data_type, is_nullable, column_default
                    FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = :tbl
                    ORDER BY ordinal_position;
                """)
                columns_data = conn.execute(col_query, {"tbl": table_name}).mappings().fetchall()
                
                count_query = text(f"SELECT COUNT(*) FROM \"{table_name}\";")
                total_rows = conn.execute(count_query).scalar() or 0

            engine.dispose()
            return {
                "success": True,
                "database": database,
                "table_name": table_name,
                "row_count_estimate": int(total_rows),
                "columns": [dict(c) for c in columns_data]
            }
        except Exception as e:
            logger.error(f"PostgreSQL schema discovery failed for {table_name}: {e}")
            raise AppException(f"PostgreSQL Schema Discovery Error: {str(e)}")

    def register_postgres_dataset(
        self,
        host: str,
        port: int,
        database: str,
        username: str,
        password: str,
        table_name: str,
        sample_limit: int = 5000
    ) -> DatasetResponse:
        """Connects to table, profiles dataset sample into catalog, and registers connection engine securely."""
        conn_str = self._build_url(host, port, database, username, password)
        try:
            engine = create_engine(conn_str, connect_args={"connect_timeout": 10})
            
            # Read analytical sample from PostgreSQL into DataFrame
            query = f"SELECT * FROM \"{table_name}\" LIMIT {sample_limit};"
            df = pd.read_sql(query, engine)
            
            with engine.connect() as conn:
                full_count = conn.execute(text(f"SELECT COUNT(*) FROM \"{table_name}\";")).scalar() or len(df)

            dataset_id = str(uuid.uuid4())
            dataset_name = f"{database}.{table_name}"
            timestamp_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

            # Store connection string in isolated session pool (NEVER sent to frontend)
            self._connection_pool[dataset_id] = conn_str

            # Also persist local cache file so analytical tools have zero latency
            safe_filename = f"{dataset_id}_{table_name}.csv"
            file_path = settings.UPLOAD_DIR / safe_filename
            df.to_csv(file_path, index=False)

            # Build standard dataset profile using DatasetService classification logic
            columns_meta: List[ColumnMetadata] = []
            for col in df.columns:
                series = df[col]
                dtype_str = str(series.dtype)
                col_type = dataset_service._detect_column_type(series, dtype_str)
                stats = dataset_service._calculate_column_stats(series, col_type)
                null_count = int(series.isnull().sum())
                unique_count = int(series.nunique(dropna=True))
                sample_vals = [str(x) for x in series.dropna().unique()[:5].tolist()]

                columns_meta.append(ColumnMetadata(
                    name=col,
                    dtype=dtype_str,
                    column_type=col_type,
                    null_count=null_count,
                    null_percentage=round((null_count / len(df)) * 100, 2) if len(df) > 0 else 0,
                    unique_count=unique_count,
                    unique_percentage=round((unique_count / len(df)) * 100, 2) if len(df) > 0 else 0,
                    stats=stats,
                    sample_values=sample_vals
                ))

            quality_score = 100.0
            quality = DataQualityMetrics(
                quality_score=quality_score,
                duplicate_rows_count=0,
                duplicate_percentage=0.0,
                total_missing_values=sum(c.null_count for c in columns_meta),
                overall_missing_percentage=0.0,
                issues=[]
            )

            dataset_response = DatasetResponse(
                id=dataset_id,
                name=dataset_name,
                filename=f"postgres://{host}:{port}/{database}/{table_name}",
                format="postgres",
                file_size_bytes=0,
                file_size_formatted="PostgreSQL Live Table",
                row_count=int(full_count),
                column_count=len(columns_meta),
                uploaded_at=timestamp_str,
                quality=quality,
                columns=columns_meta,
                preview_rows=df.head(15).replace({np.nan: None}).to_dict(orient="records")
            )

            # Save in dataset catalog
            dataset_service._catalog[dataset_id] = {
                "metadata": dataset_response.model_dump(),
                "stored_file_path": str(file_path),
                "is_postgres": True,
                "table_name": table_name,
                "database": database
            }
            dataset_service._save_catalog()

            logger.info(f"Registered PostgreSQL table '{table_name}' as dataset {dataset_id}")
            return dataset_response

        except Exception as e:
            logger.error(f"Failed to register PostgreSQL dataset: {e}")
            raise AppException(f"PostgreSQL Registration Failed: {str(e)}")

    def execute_postgres_sql(self, dataset_id: str, sql_query: str, limit: int = 100) -> Dict[str, Any]:
        """Executes read-only SQL on live PostgreSQL database if engine is connected."""
        conn_str = self._connection_pool.get(dataset_id)
        if not conn_str:
            # Fall back to DuckDB virtual execution on synced dataset
            from app.tools.sql_tool import sql_tool
            return sql_tool.execute_query(dataset_id, sql_query, limit)

        from app.tools.sql_tool import SQLValidator
        is_valid, err = SQLValidator.validate(sql_query)
        if not is_valid:
            raise AppException(f"SQL Validation Error: {err}")

        start_time = time.perf_counter()
        try:
            engine = create_engine(conn_str, connect_args={"connect_timeout": 10})
            with engine.connect() as conn:
                res = conn.execute(text(sql_query))
                cols = list(res.keys())
                rows = [dict(zip(cols, row)) for row in res.fetchmany(limit)]
                
            exec_time_ms = round((time.perf_counter() - start_time) * 1000, 2)
            return {
                "success": True,
                "sql": sql_query,
                "columns": cols,
                "rows": rows,
                "execution_time_ms": exec_time_ms,
                "row_count": len(rows),
                "total_rows_matched": len(rows)
            }
        except Exception as e:
            raise AppException(f"PostgreSQL Query Error: {str(e)}")

postgres_service = PostgresConnectorService()
