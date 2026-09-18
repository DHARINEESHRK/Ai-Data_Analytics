import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

from app.main import app
from app.services.postgres_service import postgres_service

client = TestClient(app)

def test_postgres_test_connection_endpoint():
    # Mocking the engine and connection for environments without a running local PostgreSQL instance
    with patch("app.services.postgres_service.create_engine") as mock_create_engine:
        mock_engine = MagicMock()
        mock_conn = MagicMock()
        mock_create_engine.return_value = mock_engine
        mock_engine.connect.return_value.__enter__.return_value = mock_conn

        # Mock SELECT version()
        mock_conn.execute.return_value.scalar.return_value = "PostgreSQL 16.1 on x86_64"
        # Mock information_schema table list
        mock_conn.execute.return_value.fetchall.return_value = [("customers",), ("orders",), ("products",)]

        response = client.post(
            "/api/v1/postgres/test",
            json={
                "host": "localhost",
                "port": 5432,
                "database": "analytics_test",
                "username": "postgres",
                "password": "secret_password",
                "ssl_mode": "prefer"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["database"] == "analytics_test"
        assert "customers" in data["tables"]
        assert data["tables_count"] == 3

def test_postgres_discover_table_schema():
    with patch("app.services.postgres_service.create_engine") as mock_create_engine:
        mock_engine = MagicMock()
        mock_conn = MagicMock()
        mock_create_engine.return_value = mock_engine
        mock_engine.connect.return_value.__enter__.return_value = mock_conn

        # Mock table column schema
        mock_conn.execute.return_value.mappings.return_value.fetchall.return_value = [
            {"column_name": "id", "data_type": "integer", "is_nullable": "NO", "column_default": None},
            {"column_name": "name", "data_type": "character varying", "is_nullable": "YES", "column_default": None},
            {"column_name": "revenue", "data_type": "numeric", "is_nullable": "YES", "column_default": None}
        ]
        # Mock total row count
        mock_conn.execute.return_value.scalar.return_value = 15420

        response = client.post(
            "/api/v1/postgres/schema",
            json={
                "host": "localhost",
                "port": 5432,
                "database": "analytics_test",
                "username": "postgres",
                "password": "secret_password",
                "table_name": "orders"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["table_name"] == "orders"
        assert data["row_count_estimate"] == 15420
        assert len(data["columns"]) == 3
