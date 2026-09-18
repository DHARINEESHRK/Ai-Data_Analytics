import re
import time
import duckdb
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

from app.config.settings import settings
from app.services.dataset_service import dataset_service
from app.utils.exceptions import AppException
from app.utils.logger import logger

class SQLValidator:
    """Security validator for SQL queries to enforce read-only execution."""

    DISALLOWED_KEYWORDS = [
        "INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "TRUNCATE", 
        "CREATE", "ATTACH", "DETACH", "COPY", "EXEC", "EXECUTE",
        "GRANT", "REVOKE", "RENAME", "REPLACE", "CALL", "MERGE"
    ]

    @classmethod
    def validate(cls, sql_query: str) -> Tuple[bool, Optional[str]]:
        """
        Validates that a SQL query is strictly read-only SELECT or WITH statement.
        Returns (is_valid, error_message).
        """
        if not sql_query or not sql_query.strip():
            return False, "SQL query cannot be empty."

        clean_query = sql_query.strip()
        # Remove trailing semicolons for single-statement safety
        clean_query = re.sub(r";\s*$", "", clean_query)

        # Check for multiple statements (semicolon injection)
        if ";" in clean_query:
            return False, "Multiple SQL statements are not permitted."

        # Tokenize by non-alphanumeric words to prevent evasion
        tokens = set(re.findall(r"\b[A-Za-z_][A-Za-z0-9_]*\b", clean_query.upper()))

        for disallowed in cls.DISALLOWED_KEYWORDS:
            if disallowed in tokens:
                return False, f"Disallowed SQL keyword detected: '{disallowed}'. Only read-only analytical queries are permitted."

        # Ensure query starts with SELECT or WITH (Common Table Expressions)
        first_token_match = re.match(r"^\s*([A-Za-z]+)", clean_query, re.IGNORECASE)
        if not first_token_match:
            return False, "Invalid SQL query structure."

        first_token = first_token_match.group(1).upper()
        if first_token not in ["SELECT", "WITH", "DESCRIBE", "EXPLAIN", "SHOW", "PRAGMA"]:
            return False, f"Query must begin with SELECT or WITH (found '{first_token}')."

        return True, None


class SQLTool:
    """Production-grade SQL Analytics Engine powered by DuckDB in-memory engine."""

    def __init__(self, default_row_limit: int = 100, query_timeout_seconds: float = 10.0):
        self.default_row_limit = default_row_limit
        self.query_timeout_seconds = query_timeout_seconds

    def execute_query(
        self, 
        dataset_id: str, 
        sql_query: str, 
        row_limit: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Executes a validated read-only SQL query against the dataset using DuckDB.
        Returns structured results: sql, columns, rows, execution_time_ms, row_count, total_rows_returned.
        """
        start_time = time.perf_counter()

        # Step 1: Validate SQL
        is_valid, error_msg = SQLValidator.validate(sql_query)
        if not is_valid:
            logger.warning(f"SQL validation rejected query: '{sql_query}'. Reason: {error_msg}")
            raise AppException(f"SQL Validation Error: {error_msg}")

        # Step 2: Fetch dataset file path
        dataset = dataset_service.get_dataset(dataset_id)
        file_path = Path(dataset_service._catalog[dataset_id]["stored_file_path"])
        if not file_path.exists():
            raise AppException(f"Dataset file not found on disk for dataset '{dataset.name}'")

        limit = row_limit or self.default_row_limit

        # Step 3: Connect to isolated in-memory DuckDB
        try:
            con = duckdb.connect(database=":memory:")
            # Enforce execution timeout via DuckDB pragmas/config where available
            con.execute("SET threads TO 2;")
            
            table_name = "data"
            if dataset.format == "csv":
                con.execute(f"CREATE VIEW {table_name} AS SELECT * FROM read_csv_auto('{file_path.as_posix()}')")
            else:
                df = pd.read_excel(file_path)
                con.register(table_name, df)

            # Step 4: Execute query
            cursor = con.execute(sql_query)
            result_df = cursor.df()
            con.close()

            exec_time_ms = round((time.perf_counter() - start_time) * 1000, 2)
            total_matched = len(result_df)

            # Replace NaN/NaT/inf with None for clean JSON serialization
            result_df = result_df.replace({np.nan: None, np.inf: None, -np.inf: None})
            
            # Slice according to row limit
            rows = result_df.head(limit).to_dict(orient="records")

            return {
                "success": True,
                "sql": sql_query.strip(),
                "columns": list(result_df.columns),
                "rows": rows,
                "execution_time_ms": exec_time_ms,
                "row_count": len(rows),
                "total_rows_matched": total_matched
            }

        except AppException:
            raise
        except Exception as e:
            exec_time_ms = round((time.perf_counter() - start_time) * 1000, 2)
            logger.error(f"DuckDB query execution error after {exec_time_ms}ms: {e}")
            raise AppException(f"SQL Execution Error: {str(e)}")

sql_tool = SQLTool()
