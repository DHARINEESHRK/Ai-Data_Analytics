import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_history_crud_lifecycle():
    # 1. Create a history entry
    create_payload = {
        "question": "What are the top 5 products by revenue?",
        "dataset_id": "test-dataset-123",
        "dataset_name": "ecommerce_sales.csv",
        "answer": "Electronics generated the highest revenue ($124,500).",
        "direct_answer": "Electronics was top with $124,500.",
        "key_insight": "Top 2 categories represent 68% of total revenue.",
        "analysis_type": "SQL Aggregation",
        "sql": "SELECT category, SUM(revenue) FROM data GROUP BY category LIMIT 5;",
        "duration_ms": 145
    }
    create_res = client.post("/api/v1/history", json=create_payload)
    assert create_res.status_code == 201
    created = create_res.json()
    assert created["question"] == create_payload["question"]
    item_id = created["id"]

    # 2. List history
    list_res = client.get("/api/v1/history?q=products")
    assert list_res.status_code == 200
    list_data = list_res.json()
    assert list_data["total"] >= 1
    assert any(item["id"] == item_id for item in list_data["items"])

    # 3. Get single entry
    get_res = client.get(f"/api/v1/history/{item_id}")
    assert get_res.status_code == 200
    assert get_res.json()["dataset_name"] == "ecommerce_sales.csv"

    # 4. Delete entry
    del_res = client.delete(f"/api/v1/history/{item_id}")
    assert del_res.status_code == 200

    # 5. Verify deleted
    get_del = client.get(f"/api/v1/history/{item_id}")
    assert get_del.status_code == 404
