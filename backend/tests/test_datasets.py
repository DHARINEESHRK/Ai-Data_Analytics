import io
import pandas as pd
import pytest

def test_upload_csv_success(client):
    csv_content = "id,name,monthly_spend,churned\n1,Alice,120.50,False\n2,Bob,49.00,True\n3,Charlie,899.00,False"
    files = {"file": ("test_customers.csv", csv_content.encode("utf-8"), "text/csv")}
    
    response = client.post("/api/v1/datasets/upload", files=files)
    assert response.status_code == 201
    data = response.json()
    
    assert "id" in data
    assert data["filename"] == "test_customers.csv"
    assert data["row_count"] == 3
    assert data["column_count"] == 4
    assert len(data["columns"]) == 4

    # Check column profiling
    spend_col = next(c for c in data["columns"] if c["name"] == "monthly_spend")
    assert spend_col["dtype"] == "float"
    assert spend_col["stats"]["min"] == 49.0
    assert spend_col["stats"]["max"] == 899.0

    dataset_id = data["id"]

    # Verify retrieval
    get_res = client.get(f"/api/v1/datasets/{dataset_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == dataset_id

    # Verify preview
    preview_res = client.get(f"/api/v1/datasets/{dataset_id}/preview?limit=2")
    assert preview_res.status_code == 200
    pdata = preview_res.json()
    assert len(pdata["rows"]) == 2

def test_upload_xlsx_success(client):
    df = pd.DataFrame({
        "order_id": ["ORD-1", "ORD-2"],
        "sales": [250.0, 450.0]
    })
    buffer = io.BytesIO()
    with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
        df.to_excel(writer, index=False)
    buffer.seek(0)

    files = {"file": ("orders.xlsx", buffer.getvalue(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    response = client.post("/api/v1/datasets/upload", files=files)
    assert response.status_code == 201
    data = response.json()
    assert data["filename"] == "orders.xlsx"
    assert data["row_count"] == 2

def test_upload_empty_file_rejected(client):
    files = {"file": ("empty.csv", b"", "text/csv")}
    response = client.post("/api/v1/datasets/upload", files=files)
    assert response.status_code == 400
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "DATASET_VALIDATION_ERROR"

def test_upload_unsupported_format_rejected(client):
    files = {"file": ("report.pdf", b"%PDF-1.4 ...", "application/pdf")}
    response = client.post("/api/v1/datasets/upload", files=files)
    assert response.status_code == 400
    data = response.json()
    assert data["success"] is False
    assert "Unsupported file format" in data["error"]["message"]

def test_upload_malformed_csv_rejected(client):
    # Corrupted content that fails dataframe parsing
    files = {"file": ("broken.csv", b"\x00\x01\x02\x03\x04\xff\xfe", "text/csv")}
    response = client.post("/api/v1/datasets/upload", files=files)
    assert response.status_code == 400
    data = response.json()
    assert data["success"] is False

def test_get_nonexistent_dataset_returns_404(client):
    response = client.get("/api/v1/datasets/non-existent-uuid")
    assert response.status_code == 404
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "DATASET_NOT_FOUND"
