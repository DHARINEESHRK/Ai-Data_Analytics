import pytest
from app.config.settings import settings
from app.services.nim_service import nim_service

def test_chat_without_dataset(client):
    payload = {
        "question": "What can you do?"
    }
    response = client.post("/api/v1/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "answer" in data
    assert "latency_ms" in data
    assert data["status"] in ["completed", "fallback"]

def test_chat_with_dataset_schema_grounding(client):
    csv_data = "product_id,product_category,revenue,in_stock\nP1,Electronics,1200.0,True\nP2,Apparel,450.0,False"
    files = {"file": ("products_catalog.csv", csv_data.encode("utf-8"), "text/csv")}
    upload_res = client.post("/api/v1/datasets/upload", files=files)
    assert upload_res.status_code == 201
    dataset_id = upload_res.json()["id"]

    chat_payload = {
        "question": "What columns are available?",
        "dataset_id": dataset_id
    }
    response = client.post("/api/v1/chat", json=chat_payload)
    assert response.status_code == 200
    data = response.json()
    assert "answer" in data
    answer_text = data["answer"]

    assert "product_id" in answer_text
    assert "product_category" in answer_text
    assert "revenue" in answer_text
    assert "in_stock" in answer_text
    assert "credit_card" not in answer_text

def test_chat_invalid_payload_validation(client):
    payload = {
        "question": ""
    }
    response = client.post("/api/v1/chat", json=payload)
    assert response.status_code == 422
    data = response.json()
    assert data["success"] is False

def test_system_prompt_builder(client):
    prompt_without_ds = nim_service.build_system_prompt(None)
    assert "No active dataset" in prompt_without_ds

def test_missing_api_key_graceful_handling(client, monkeypatch):
    monkeypatch.setattr(settings, "NVIDIA_NIM_API_KEY", "")
    
    payload = {
        "question": "What is the average revenue?"
    }
    response = client.post("/api/v1/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "answer" in data
