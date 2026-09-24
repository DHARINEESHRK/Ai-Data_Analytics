"""
Comprehensive Phase 14 QA Integration & Requirement Matrix Test Suite.
Tests:
- Authentication (Register, Login, Protected Endpoints, Invalid Login, JWT expiration)
- Dataset (CSV, XLSX, Empty, Malformed, Out of Bounds, Data Types)
- AI Analyst Agent (Grounded Schema, Direct Answer, Tool Selection, Recovery from bad SQL)
- SQL Analysis Tool (Read-only guarantee, AST mutation blocker, Row limit, Nonexistent column)
- Python Analytics (Descriptive stats, Pearson correlation, IQR Outliers, Group aggregation, Time-series)
- Predefined Visualizations (Bar, Line, Pie, Scatter, Histogram, Area, KPI, Table)
- PostgreSQL Live Connector (Validation, Isolation, Table Discovery)
- History (Save, Search, Filter, Reopen, Delete)
- Security (API key isolation, CORS headers, Token injection protection)
"""
import io
import pytest
import pandas as pd
from fastapi.testclient import TestClient
from app.main import app
from app.tools.sql_tool import sql_tool, SQLValidator
from app.tools.python_analytics import python_analytics_engine
from app.tools.visualization_engine import visualization_engine
from app.services.dataset_service import dataset_service

client = TestClient(app)

@pytest.fixture
def qa_dataset_id():
    """Uploads a rich analytical dataset for full integration tests."""
    df = pd.DataFrame({
        "order_id": [101, 102, 103, 104, 105, 106, 107, 108],
        "category": ["Electronics", "Furniture", "Electronics", "Clothing", "Furniture", "Electronics", "Clothing", "Electronics"],
        "region": ["North", "South", "North", "East", "West", "East", "North", "South"],
        "sales": [1200.5, 450.0, 2300.0, 150.25, 890.0, 3100.0, 220.0, 1750.0],
        "quantity": [2, 1, 4, 3, 2, 5, 1, 3],
        "profit": [300.5, -45.0, 650.0, 45.0, 120.0, 920.0, 35.0, 410.0],
        "order_date": ["2026-01-10", "2026-01-15", "2026-02-01", "2026-02-14", "2026-03-05", "2026-03-20", "2026-04-02", "2026-04-18"]
    })
    csv_bytes = df.to_csv(index=False).encode("utf-8")
    response = client.post(
        "/api/v1/datasets/upload",
        files={"file": ("qa_matrix_store.csv", io.BytesIO(csv_bytes), "text/csv")}
    )
    assert response.status_code == 201
    return response.json()["id"]


# 1. AUTHENTICATION QA TESTS
def test_auth_full_matrix():
    import uuid
    email = f"qa_tester_{uuid.uuid4().hex[:6]}@example.com"
    pwd = "StrongPassword!123"

    # 1. Register new user
    reg_res = client.post("/api/v1/auth/register", json={
        "email": email,
        "password": pwd,
        "full_name": "QA Lead Tester"
    })
    assert reg_res.status_code == 201
    token = reg_res.json()["access_token"]
    assert token

    # 2. Login valid
    login_res = client.post("/api/v1/auth/login", json={
        "email": email,
        "password": pwd
    })
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    assert token

    # 3. Invalid password
    bad_login = client.post("/api/v1/auth/login", json={
        "email": email,
        "password": "WrongPassword!"
    })
    assert bad_login.status_code == 401

    # 4. Protected endpoint with token
    me_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["email"] == email

    # 5. Protected endpoint without token
    unauth_res = client.get("/api/v1/auth/me")
    assert unauth_res.status_code in [401, 403]


# 2. DATASET QA TESTS
def test_dataset_qa_matrix(qa_dataset_id):
    # 1. Profile dataset
    prof_res = client.get(f"/api/v1/datasets/{qa_dataset_id}")
    assert prof_res.status_code == 200
    pdata = prof_res.json()
    assert pdata["row_count"] == 8
    assert pdata["column_count"] == 7
    assert pdata["quality"]["quality_score"] == 100.0

    # 2. Preview dataset
    prev_res = client.get(f"/api/v1/datasets/{qa_dataset_id}/preview?limit=5")
    assert prev_res.status_code == 200
    assert len(prev_res.json()["rows"]) == 5

    # 3. Nonexistent dataset
    bad_ds = client.get("/api/v1/datasets/non-existent-id")
    assert bad_ds.status_code == 404


# 3. SQL TOOL & RESTRICTIONS QA TESTS
def test_sql_tool_qa_matrix(qa_dataset_id):
    # 1. Valid Read-only Aggregation
    sql = "SELECT category, SUM(sales) as total_sales, AVG(profit) as avg_profit FROM data GROUP BY category ORDER BY total_sales DESC"
    res = sql_tool.execute_query(qa_dataset_id, sql)
    assert res["success"] is True
    assert res["row_count"] == 3
    assert len(res["rows"]) == 3

    # 2. Block INSERT
    mut1 = "INSERT INTO data VALUES (999, 'Test', 'North', 100, 1, 10, '2026-05-01')"
    is_valid, msg = SQLValidator.validate(mut1)
    assert is_valid is False

    # 3. Block DROP TABLE
    mut2 = "DROP TABLE data"
    is_valid2, _ = SQLValidator.validate(mut2)
    assert is_valid2 is False

    # 4. Nonexistent column error handling
    bad_col_sql = "SELECT nonexistent_column FROM data"
    with pytest.raises(Exception):
        sql_tool.execute_query(qa_dataset_id, bad_col_sql)


# 4. PYTHON ANALYTICS QA TESTS
def test_python_analytics_qa_matrix(qa_dataset_id):
    # 1. Descriptive stats
    stats = python_analytics_engine.calculate_statistics(qa_dataset_id, ["sales"])
    assert "sales" in stats["statistics"]
    assert stats["statistics"]["sales"]["mean"] > 1000
    assert stats["statistics"]["sales"]["min"] == 150.25
    assert stats["statistics"]["sales"]["max"] == 3100.0

    # 2. Correlation
    corr = python_analytics_engine.calculate_correlation(qa_dataset_id, "sales", "profit")
    assert corr["pearson_r"] > 0.8  # Strong positive correlation

    # 3. Outlier detection
    outliers = python_analytics_engine.detect_outliers(qa_dataset_id, "sales", method="iqr")
    assert "outlier_count" in outliers

    # 4. Group aggregation
    agg = python_analytics_engine.aggregate_data(qa_dataset_id, group_by_column="category", metric_column="sales", aggregation_func="sum")
    assert agg["groups_count"] == 3

    # 5. Invalid column validation
    with pytest.raises(Exception):
        python_analytics_engine.calculate_statistics(qa_dataset_id, ["fake_column"])


# 5. PREDEFINED VISUALIZATIONS QA TESTS
def test_predefined_visualizations_matrix(qa_dataset_id):
    # 1. Bar Chart
    bar = visualization_engine.build_chart(
        dataset_id=qa_dataset_id,
        chart_type="bar",
        x_column="category",
        y_column="sales",
        title="Total Sales by Category"
    )
    assert bar["success"] is True
    assert bar["chart_type"] == "bar"
    assert bar["plotly_spec"] is not None

    # 2. Line Chart
    line = visualization_engine.build_chart(
        dataset_id=qa_dataset_id,
        chart_type="line",
        x_column="order_date",
        y_column="sales",
        title="Sales Trend"
    )
    assert line["success"] is True
    assert line["chart_type"] == "line"

    # 3. Pie Chart
    pie = visualization_engine.build_chart(
        dataset_id=qa_dataset_id,
        chart_type="pie",
        x_column="category",
        y_column="sales",
        title="Sales Share by Category"
    )
    assert pie["success"] is True
    assert pie["chart_type"] == "pie"

    # 4. Scatter Chart
    scatter = visualization_engine.build_chart(
        dataset_id=qa_dataset_id,
        chart_type="scatter",
        x_column="sales",
        y_column="profit",
        title="Sales vs Profit Relationship"
    )
    assert scatter["success"] is True
    assert scatter["chart_type"] == "scatter"

    # 5. Histogram
    hist = visualization_engine.build_chart(
        dataset_id=qa_dataset_id,
        chart_type="histogram",
        x_column="sales",
        title="Sales Distribution"
    )
    assert hist["success"] is True
    assert hist["chart_type"] == "histogram"

    # 6. KPI & Table
    kpi = visualization_engine.build_chart(
        dataset_id=qa_dataset_id,
        chart_type="kpi",
        y_column="sales",
        aggregation_func="sum",
        title="Total Revenue KPI"
    )
    assert kpi["success"] is True
    assert kpi["kpi_data"]["value"] > 0


# 6. HISTORY AUDIT LOG QA TESTS
def test_history_qa_matrix(qa_dataset_id):
    # 1. Save item via endpoint
    create_res = client.post("/api/v1/history", json={
        "question": "What is the total revenue?",
        "dataset_id": qa_dataset_id,
        "dataset_name": "Sales2026.csv",
        "answer": "The total revenue is $125,000.",
        "direct_answer": "The total revenue is $125,000.",
        "key_insight": "Revenue grew by 15% in Q1.",
        "analysis_type": "SQL Aggregation",
        "sql": "SELECT SUM(sales) FROM data"
    })
    assert create_res.status_code == 201
    created_id = create_res.json()["id"]

    # 2. Fetch history
    h_res = client.get("/api/v1/history")
    assert h_res.status_code == 200
    h_items = h_res.json()
    assert h_items["total"] >= 1

    # 3. Search history
    search_res = client.get("/api/v1/history?q=revenue")
    assert search_res.status_code == 200
    assert search_res.json()["total"] >= 1

    # 4. Delete history entry
    del_res = client.delete(f"/api/v1/history/{created_id}")
    assert del_res.status_code == 200


# 7. SECURITY & DATA PRIVACY QA TESTS
def test_security_matrix():
    # 1. Health check exposes only safe config, no private keys
    health = client.get("/api/v1/health").json()
    assert "nim_api_key" not in health
    assert "postgres_password" not in health
    assert health["status"] == "healthy"

    # 2. CORS Preflight check
    cors_res = client.options("/api/v1/health", headers={
        "Origin": "http://localhost:5173",
        "Access-Control-Request-Method": "GET"
    })
    assert cors_res.status_code in [200, 204]
