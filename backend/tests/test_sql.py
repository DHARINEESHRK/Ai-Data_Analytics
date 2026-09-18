import pytest
import io
import pandas as pd
from fastapi.testclient import TestClient

from app.main import app
from app.tools.sql_tool import SQLValidator, SQLTool, sql_tool
from app.utils.exceptions import AppException

client = TestClient(app)

@pytest.fixture
def sample_dataset_id():
    """Uploads a temporary CSV dataset for SQL testing."""
    df = pd.DataFrame({
        "product": ["Laptop", "Keyboard", "Monitor", "Mouse", "Headphones", "Desk"],
        "category": ["Electronics", "Electronics", "Electronics", "Accessories", "Audio", "Furniture"],
        "price": [1200.0, 75.0, 300.0, 25.0, 150.0, 450.0],
        "quantity": [10, 50, 20, 100, 30, 15]
    })
    csv_bytes = df.to_csv(index=False).encode("utf-8")
    response = client.post(
        "/api/v1/datasets/upload",
        files={"file": ("sql_test_products.csv", io.BytesIO(csv_bytes), "text/csv")}
    )
    assert response.status_code == 201
    return response.json()["id"]

def test_sql_validator_blocks_mutation_keywords():
    disallowed_queries = [
        "INSERT INTO data VALUES ('Phone', 'Electronics', 800, 5)",
        "UPDATE data SET price = 1000 WHERE product = 'Laptop'",
        "DELETE FROM data WHERE price < 50",
        "DROP TABLE data",
        "ALTER TABLE data ADD COLUMN tax DOUBLE",
        "TRUNCATE TABLE data",
        "CREATE TABLE test (id INT)",
        "SELECT * FROM data; DROP TABLE data;"
    ]
    for q in disallowed_queries:
        is_valid, msg = SQLValidator.validate(q)
        assert is_valid is False
        assert msg is not None

def test_sql_validator_permits_read_only_queries():
    valid_queries = [
        "SELECT product, price FROM data WHERE price > 100 ORDER BY price DESC",
        "SELECT category, COUNT(*) AS count, AVG(price) AS avg_price FROM data GROUP BY category",
        "WITH ranked AS (SELECT product, price, RANK() OVER (ORDER BY price DESC) as rnk FROM data) SELECT * FROM ranked WHERE rnk <= 3",
        "SELECT * FROM data LIMIT 10"
    ]
    for q in valid_queries:
        is_valid, msg = SQLValidator.validate(q)
        assert is_valid is True
        assert msg is None

def test_sql_tool_successful_execution(sample_dataset_id):
    query = "SELECT category, SUM(price * quantity) AS total_revenue FROM data GROUP BY category ORDER BY total_revenue DESC"
    result = sql_tool.execute_query(sample_dataset_id, query)

    assert result["success"] is True
    assert "total_revenue" in result["columns"]
    assert "category" in result["columns"]
    assert len(result["rows"]) > 0
    assert result["execution_time_ms"] >= 0
    assert result["row_count"] == len(result["rows"])
    assert result["total_rows_matched"] > 0

def test_sql_tool_row_limit(sample_dataset_id):
    query = "SELECT * FROM data"
    result = sql_tool.execute_query(sample_dataset_id, query, row_limit=2)

    assert result["success"] is True
    assert len(result["rows"]) == 2
    assert result["row_count"] == 2
    assert result["total_rows_matched"] == 6

def test_sql_endpoint_api(sample_dataset_id):
    response = client.post(
        "/api/v1/sql/execute",
        json={
            "dataset_id": sample_dataset_id,
            "sql_query": "SELECT product, price FROM data WHERE price > 200 ORDER BY price DESC",
            "row_limit": 5
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["columns"] == ["product", "price"]
    assert len(data["rows"]) == 3
    assert data["rows"][0]["product"] == "Laptop"

def test_sql_endpoint_mutation_rejection(sample_dataset_id):
    response = client.post(
        "/api/v1/sql/execute",
        json={
            "dataset_id": sample_dataset_id,
            "sql_query": "DELETE FROM data WHERE price < 100",
            "row_limit": 5
        }
    )
    assert response.status_code == 400
    res_data = response.json()
    assert res_data["success"] is False
    assert "Disallowed SQL keyword" in res_data["error"]["message"]

