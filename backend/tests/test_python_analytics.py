import pytest
import io
import pandas as pd
from fastapi.testclient import TestClient

from app.main import app
from app.tools.python_analytics import python_analytics_engine
from app.utils.exceptions import AppException

client = TestClient(app)

@pytest.fixture
def analytics_dataset_id():
    """Uploads a test dataset with time, categories, numbers, and outliers."""
    df = pd.DataFrame({
        "date": ["2025-01-01", "2025-01-02", "2025-02-01", "2025-02-15", "2025-03-01", "2025-03-20"],
        "department": ["Sales", "Sales", "Engineering", "Engineering", "Marketing", "Marketing"],
        "marketing_spend": [100.0, 150.0, 200.0, 300.0, 400.0, 500.0],
        "revenue": [1000.0, 1550.0, 2100.0, 3100.0, 4050.0, 5200.0],
        "anomaly_metric": [10.0, 12.0, 11.0, 13.0, 12.0, 950.0]  # Clear outlier at 950.0
    })
    csv_bytes = df.to_csv(index=False).encode("utf-8")
    response = client.post(
        "/api/v1/datasets/upload",
        files={"file": ("python_analytics_test.csv", io.BytesIO(csv_bytes), "text/csv")}
    )
    assert response.status_code == 201
    return response.json()["id"]

def test_descriptive_statistics(analytics_dataset_id):
    result = python_analytics_engine.calculate_statistics(
        dataset_id=analytics_dataset_id,
        columns=["marketing_spend", "revenue"]
    )
    assert "marketing_spend" in result["statistics"]
    assert "revenue" in result["statistics"]
    spend_stats = result["statistics"]["marketing_spend"]
    assert spend_stats["count"] == 6
    assert spend_stats["min"] == 100.0
    assert spend_stats["max"] == 500.0
    assert spend_stats["median"] == 250.0
    assert "mean" in spend_stats
    assert "iqr" in spend_stats

def test_correlation_analysis(analytics_dataset_id):
    result = python_analytics_engine.calculate_correlation(
        dataset_id=analytics_dataset_id,
        x_column="marketing_spend",
        y_column="revenue"
    )
    assert result["x_column"] == "marketing_spend"
    assert result["y_column"] == "revenue"
    assert result["pearson_r"] > 0.99  # Near perfect positive linear relation
    assert result["strength"] == "strong"
    assert result["direction"] == "positive"
    assert result["slope"] > 0

def test_outlier_detection_iqr(analytics_dataset_id):
    result = python_analytics_engine.detect_outliers(
        dataset_id=analytics_dataset_id,
        column="anomaly_metric",
        method="iqr"
    )
    assert result["column"] == "anomaly_metric"
    assert result["outlier_count"] == 1
    assert 950.0 in result["sample_outliers"]

def test_group_aggregation(analytics_dataset_id):
    result = python_analytics_engine.aggregate_data(
        dataset_id=analytics_dataset_id,
        group_by_column="department",
        metric_column="revenue",
        aggregation_func="sum"
    )
    assert result["groups_count"] == 3
    dept_names = [r["department"] for r in result["data"]]
    assert "Marketing" in dept_names
    assert "Sales" in dept_names

def test_time_series_aggregation(analytics_dataset_id):
    result = python_analytics_engine.analyze_time_series(
        dataset_id=analytics_dataset_id,
        time_column="date",
        metric_column="revenue",
        interval="M"
    )
    assert result["points_count"] >= 3
    assert "total" in result["data"][0]

def test_nonexistent_column_validation(analytics_dataset_id):
    with pytest.raises(AppException) as exc_info:
        python_analytics_engine.calculate_correlation(
            dataset_id=analytics_dataset_id,
            x_column="non_existent_col",
            y_column="revenue"
        )
    assert "Requested column(s) do not exist" in str(exc_info.value.message)

def test_analytics_api_endpoint(analytics_dataset_id):
    response = client.post(
        "/api/v1/analytics/execute",
        json={
            "dataset_id": analytics_dataset_id,
            "operation": "correlation",
            "x_column": "marketing_spend",
            "y_column": "revenue"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["operation"] == "correlation"
    assert data["results"]["pearson_r"] > 0.95
    assert data["execution_time_ms"] >= 0
