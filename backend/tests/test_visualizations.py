import pytest
import io
import pandas as pd
from fastapi.testclient import TestClient

from app.main import app
from app.tools.visualization_engine import visualization_engine

client = TestClient(app)

@pytest.fixture
def viz_dataset_id():
    """Uploads a test dataset with categories, dates, numbers, and high cardinality."""
    df = pd.DataFrame({
        "date": ["2025-01-01", "2025-01-02", "2025-01-03", "2025-01-04", "2025-01-05", "2025-01-06"],
        "region": ["North", "South", "East", "West", "Central", "North"],
        "revenue": [5000.0, 3200.0, 7100.0, 4300.0, 2100.0, 6400.0],
        "units_sold": [50, 32, 70, 45, 20, 60]
    })
    csv_bytes = df.to_csv(index=False).encode("utf-8")
    response = client.post(
        "/api/v1/datasets/upload",
        files={"file": ("viz_test_sales.csv", io.BytesIO(csv_bytes), "text/csv")}
    )
    assert response.status_code == 201
    return response.json()["id"]

def test_build_bar_chart(viz_dataset_id):
    res = visualization_engine.build_chart(
        dataset_id=viz_dataset_id,
        chart_type="bar",
        x_column="region",
        y_column="revenue",
        title="Revenue by Region"
    )
    assert res["success"] is True
    assert res["chart_type"] == "bar"
    assert res["title"] == "Revenue by Region"
    assert res["plotly_spec"] is not None
    assert len(res["recharts_data"]) > 0

def test_build_line_chart(viz_dataset_id):
    res = visualization_engine.build_chart(
        dataset_id=viz_dataset_id,
        chart_type="line",
        x_column="date",
        y_column="revenue"
    )
    assert res["success"] is True
    assert res["chart_type"] == "line"
    assert res["plotly_spec"] is not None

def test_build_pie_chart(viz_dataset_id):
    res = visualization_engine.build_chart(
        dataset_id=viz_dataset_id,
        chart_type="pie",
        x_column="region",
        y_column="revenue"
    )
    assert res["success"] is True
    assert res["chart_type"] == "pie"
    assert res["plotly_spec"]["data"][0]["type"] == "pie"

def test_build_scatter_chart(viz_dataset_id):
    res = visualization_engine.build_chart(
        dataset_id=viz_dataset_id,
        chart_type="scatter",
        x_column="units_sold",
        y_column="revenue"
    )
    assert res["success"] is True
    assert res["chart_type"] == "scatter"
    assert res["plotly_spec"]["data"][0]["mode"] == "markers"

def test_build_histogram(viz_dataset_id):
    res = visualization_engine.build_chart(
        dataset_id=viz_dataset_id,
        chart_type="histogram",
        x_column="revenue"
    )
    assert res["success"] is True
    assert res["chart_type"] == "histogram"
    assert len(res["recharts_data"]) > 0

def test_build_kpi_and_table(viz_dataset_id):
    kpi_res = visualization_engine.build_chart(
        dataset_id=viz_dataset_id,
        chart_type="kpi",
        y_column="revenue",
        aggregation_func="sum"
    )
    assert kpi_res["success"] is True
    assert kpi_res["kpi_data"]["value"] > 0

    table_res = visualization_engine.build_chart(
        dataset_id=viz_dataset_id,
        chart_type="table"
    )
    assert table_res["success"] is True
    assert len(table_res["table_data"]["rows"]) > 0

def test_visualization_api_endpoint(viz_dataset_id):
    response = client.post(
        "/api/v1/visualizations/build",
        json={
            "dataset_id": viz_dataset_id,
            "chart_type": "bar",
            "x_column": "region",
            "y_column": "revenue",
            "title": "API Test Chart"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["title"] == "API Test Chart"
    assert data["plotly_spec"] is not None
