import io
import pandas as pd
import pytest

def test_deep_profiling_types_and_stats(client):
    csv_data = (
        "user_id,age,income,category,signup_date,is_active\n"
        "U-1,25,50000.0,Retail,2023-01-10,true\n"
        "U-2,30,75000.0,Tech,2023-03-15,true\n"
        "U-3,45,120000.0,Retail,2023-06-20,false\n"
        "U-4,25,50000.0,Finance,2023-08-01,true\n"
        "U-4,25,50000.0,Finance,2023-08-01,true\n"  # duplicate row
    )
    files = {"file": ("deep_profile.csv", csv_data.encode("utf-8"), "text/csv")}
    response = client.post("/api/v1/datasets/upload", files=files)
    assert response.status_code == 201
    data = response.json()

    # 1. Verify Quality & Duplicate Detection
    assert data["row_count"] == 5
    assert data["column_count"] == 6
    quality = data["quality"]
    assert quality["duplicate_rows"] == 1
    assert quality["duplicate_percentage"] == 20.0
    assert quality["quality_score"] > 0
    assert quality["column_type_breakdown"]["numerical"] >= 2
    assert quality["column_type_breakdown"]["categorical"] >= 1

    # 2. Verify Numerical Stats (Income)
    income_col = next(c for c in data["columns"] if c["name"] == "income")
    assert income_col["column_type"] == "numerical"
    assert income_col["stats"]["min"] == 50000.0
    assert income_col["stats"]["max"] == 120000.0
    assert income_col["stats"]["mean"] == 69000.0
    assert income_col["stats"]["median"] == 50000.0

    # 3. Verify Categorical Most Frequent (Category)
    cat_col = next(c for c in data["columns"] if c["name"] == "category")
    assert cat_col["column_type"] == "categorical"
    assert cat_col["unique_count"] == 3
    most_freq_vals = [f["value"] for f in cat_col["stats"]["most_frequent"]]
    assert "Retail" in most_freq_vals
    assert "Finance" in most_freq_vals

    # 4. Verify Datetime Range (signup_date)
    date_col = next(c for c in data["columns"] if c["name"] == "signup_date")
    assert date_col["column_type"] == "datetime"
    assert "2023-01-10" in date_col["stats"]["min_date"]
    assert "2023-08-01" in date_col["stats"]["max_date"]

    # 5. Verify Boolean (is_active)
    bool_col = next(c for c in data["columns"] if c["name"] == "is_active")
    assert bool_col["column_type"] == "boolean"
