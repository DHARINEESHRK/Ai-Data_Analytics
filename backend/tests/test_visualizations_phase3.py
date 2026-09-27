import pytest
from app.agents.analyst_agent import analyst_agent
from app.agents.planner import querylens_planner
from app.schemas.planner import AnalysisPlan
from app.tools.query_tools import query_tools

@pytest.fixture
def sales_dataset(client):
    csv_data = (
        "order_date,region,sales,quantity\n"
        "2023-01-15,North,12000,10\n"
        "2023-02-14,South,8500,5\n"
        "2023-03-20,North,15400,12\n"
        "2024-01-18,North,14200,11\n"
        "2024-02-22,South,9800,6\n"
        "2024-03-10,East,21000,15\n"
    )
    files = {"file": ("sales_records.csv", csv_data.encode("utf-8"), "text/csv")}
    upload_res = client.post("/api/v1/datasets/upload", files=files)
    assert upload_res.status_code == 201
    return upload_res.json()["id"]

@pytest.fixture
def demographic_dataset(client):
    csv_data = (
        "customer_id,age,income\n"
        "C001,25,45000\n"
        "C002,32,62000\n"
        "C003,45,85000\n"
        "C004,28,51000\n"
        "C005,52,110000\n"
        "C006,38,72000\n"
        "C007,41,78000\n"
        "C008,29,49000\n"
    )
    files = {"file": ("demographics.csv", csv_data.encode("utf-8"), "text/csv")}
    upload_res = client.post("/api/v1/datasets/upload", files=files)
    assert upload_res.status_code == 201
    return upload_res.json()["id"]

@pytest.fixture
def messy_dataset(client):
    csv_data = (
        "item_id,category,price\n"
        "I1,Books,19.99\n"
        "I2,,25.00\n"
        "I3,Electronics,\n"
        "I4,Books,15.50\n"
    )
    files = {"file": ("messy_data.csv", csv_data.encode("utf-8"), "text/csv")}
    upload_res = client.post("/api/v1/datasets/upload", files=files)
    assert upload_res.status_code == 201
    return upload_res.json()["id"]

@pytest.fixture
def student_dataset(client):
    csv_data = (
        "student_id,subject,score,hours_studied\n"
        "S101,Physics,88,14\n"
        "S102,Mathematics,94,18\n"
        "S103,Chemistry,76,10\n"
        "S104,Physics,82,12\n"
        "S105,Mathematics,91,16\n"
    )
    files = {"file": ("students.csv", csv_data.encode("utf-8"), "text/csv")}
    upload_res = client.post("/api/v1/datasets/upload", files=files)
    assert upload_res.status_code == 201
    return upload_res.json()["id"]

@pytest.fixture
def nodate_dataset(client):
    csv_data = (
        "store_id,location,sales\n"
        "ST1,Downtown,50000\n"
        "ST2,Uptown,75000\n"
        "ST3,Suburbs,32000\n"
    )
    files = {"file": ("nodate_stores.csv", csv_data.encode("utf-8"), "text/csv")}
    upload_res = client.post("/api/v1/datasets/upload", files=files)
    assert upload_res.status_code == 201
    return upload_res.json()["id"]

# ==============================================================================
# TEST 1: Single KPI - "What is total revenue?" -> Expected: real KPI
# ==============================================================================
def test_1_single_kpi(client, sales_dataset, monkeypatch):
    async def mock_plan(*args, **kwargs):
        return AnalysisPlan(
            intent="aggregation",
            metric_columns=["sales"],
            aggregation="sum",
            visualization="kpi",
            explanation_of_plan="Calculate total sales KPI across all records."
        )

    async def mock_sql(*args, **kwargs):
        return "SELECT SUM(sales) AS total_sales FROM data"

    monkeypatch.setattr(querylens_planner, "create_plan", mock_plan)
    monkeypatch.setattr(analyst_agent, "_generate_sql", mock_sql)

    res = client.post("/api/v1/chat", json={"question": "What is total revenue?", "dataset_id": sales_dataset})
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "completed"
    assert data["chart"] is not None
    assert data["chart"]["type"] == "kpi"
    assert data["chart"]["kpiValue"] == 80900
    assert data["data_used"]["aggregation"] == "SUM"
    assert "sales" in data["data_used"]["columns"]

# ==============================================================================
# TEST 2: Category Ranking - "Which region has the highest sales?" -> Expected: real bar chart
# ==============================================================================
def test_2_category_ranking(client, sales_dataset, monkeypatch):
    async def mock_plan(*args, **kwargs):
        return AnalysisPlan(
            intent="ranking",
            metric_columns=["sales"],
            dimension_columns=["region"],
            aggregation="sum",
            sort="desc",
            visualization="bar",
            explanation_of_plan="Rank regions by total sales."
        )

    async def mock_sql(*args, **kwargs):
        return "SELECT region, SUM(sales) AS total_sales FROM data GROUP BY region ORDER BY total_sales DESC"

    monkeypatch.setattr(querylens_planner, "create_plan", mock_plan)
    monkeypatch.setattr(analyst_agent, "_generate_sql", mock_sql)

    res = client.post("/api/v1/chat", json={"question": "Which region has the highest sales?", "dataset_id": sales_dataset})
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "completed"
    assert data["chart"] is not None
    assert data["chart"]["type"] == "bar"
    assert data["chart"]["xAxisKey"] == "region"
    assert data["chart"]["yAxisKey"] == "total_sales"
    assert len(data["chart"]["data"]) == 3
    assert data["chart"]["data"][0]["region"] == "North"
    assert data["chart"]["data"][0]["total_sales"] == 41600

# ==============================================================================
# TEST 3: Monthly Trend - "Show monthly sales." -> Expected: real line/area chart
# ==============================================================================
def test_3_monthly_trend(client, sales_dataset, monkeypatch):
    async def mock_plan(*args, **kwargs):
        return AnalysisPlan(
            intent="time_series",
            metric_columns=["sales"],
            time_column="order_date",
            time_granularity="month",
            aggregation="sum",
            visualization="line",
            explanation_of_plan="Aggregate sales monthly over order_date."
        )

    async def mock_sql(*args, **kwargs):
        return "SELECT strftime(order_date, '%Y-%m') AS month, SUM(sales) AS total_sales FROM data GROUP BY month ORDER BY month"

    monkeypatch.setattr(querylens_planner, "create_plan", mock_plan)
    monkeypatch.setattr(analyst_agent, "_generate_sql", mock_sql)

    res = client.post("/api/v1/chat", json={"question": "Show monthly sales.", "dataset_id": sales_dataset})
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "completed"
    assert data["chart"] is not None
    assert data["chart"]["type"] == "line"
    assert data["chart"]["xAxisKey"] == "month"
    assert len(data["chart"]["data"]) > 0

# ==============================================================================
# TEST 4: Yearly Sales by Month - "Show yearly sales by month." -> Expected: real multi-series time chart
# ==============================================================================
def test_4_yearly_sales_by_month(client, sales_dataset, monkeypatch):
    async def mock_plan(*args, **kwargs):
        return AnalysisPlan(
            intent="time_series",
            metric_columns=["sales"],
            time_column="order_date",
            time_granularity="month",
            comparison="year",
            aggregation="sum",
            visualization="line",
            explanation_of_plan="Compare monthly sales trends across years."
        )

    async def mock_sql(*args, **kwargs):
        return (
            "SELECT EXTRACT(year FROM order_date) AS year, "
            "strftime(order_date, '%B') AS month, "
            "SUM(sales) AS total_sales "
            "FROM data GROUP BY year, month ORDER BY year, min(order_date)"
        )

    monkeypatch.setattr(querylens_planner, "create_plan", mock_plan)
    monkeypatch.setattr(analyst_agent, "_generate_sql", mock_sql)

    res = client.post("/api/v1/chat", json={"question": "Show yearly sales by month.", "dataset_id": sales_dataset})
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "completed"
    assert data["chart"] is not None
    assert data["chart"]["type"] == "line"
    assert data["chart"]["xAxisKey"] == "month"
    # Verify multi-series: distinct series keys for years
    assert "2023" in data["chart"]["seriesKeys"]
    assert "2024" in data["chart"]["seriesKeys"]
    # Verify chronological month ordering (Jan comes before Feb, Feb before Mar)
    months_in_result = [row["month"] for row in data["chart"]["data"]]
    assert months_in_result == ["Jan", "Feb", "Mar"]
    # Check empirical data
    jan_row = data["chart"]["data"][0]
    assert jan_row["2023"] == 12000
    assert jan_row["2024"] == 14200

# ==============================================================================
# TEST 5: Distribution - "Show the distribution of age." -> Expected: real histogram
# ==============================================================================
def test_5_distribution_histogram(client, demographic_dataset, monkeypatch):
    async def mock_plan(*args, **kwargs):
        return AnalysisPlan(
            intent="outlier_detection",
            metric_columns=["age"],
            visualization="histogram",
            explanation_of_plan="Analyze distribution of age."
        )

    async def mock_sql(*args, **kwargs):
        return "SELECT age FROM data WHERE age IS NOT NULL"

    monkeypatch.setattr(querylens_planner, "create_plan", mock_plan)
    monkeypatch.setattr(analyst_agent, "_generate_sql", mock_sql)

    res = client.post("/api/v1/chat", json={"question": "Show the distribution of age.", "dataset_id": demographic_dataset})
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "completed"
    assert data["chart"] is not None
    assert data["chart"]["type"] == "histogram"
    assert data["chart"]["xAxisKey"] == "range"
    assert data["chart"]["yAxisKey"] == "frequency"
    assert len(data["chart"]["data"]) >= 2
    # Verify total frequencies sum to 8 observations
    total_freq = sum(b["frequency"] for b in data["chart"]["data"])
    assert total_freq == 8

# ==============================================================================
# TEST 6: Relationship - "Is quantity related to sales?" -> Expected: real scatter plot
# ==============================================================================
def test_6_relationship_scatter(client, sales_dataset, monkeypatch):
    async def mock_plan(*args, **kwargs):
        return AnalysisPlan(
            intent="correlation",
            metric_columns=["quantity", "sales"],
            visualization="scatter",
            explanation_of_plan="Evaluate Pearson correlation between quantity and sales."
        )

    monkeypatch.setattr(querylens_planner, "create_plan", mock_plan)

    res = client.post("/api/v1/chat", json={"question": "Is quantity related to sales?", "dataset_id": sales_dataset})
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "completed"
    assert data["chart"] is not None
    assert data["chart"]["type"] == "scatter"
    assert data["chart"]["xAxisKey"] == "quantity"
    assert data["chart"]["yAxisKey"] == "sales"
    assert data["stats"] is not None
    assert data["stats"]["observations_count"] == 6

# ==============================================================================
# TEST 7: Missing Values - "What values are missing?" -> Expected: real data quality analysis
# ==============================================================================
def test_7_missing_values_quality(client, messy_dataset):
    res = client.post("/api/v1/chat", json={"question": "What values are missing?", "dataset_id": messy_dataset})
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "completed"
    assert data["analysis_method"] == "Dataset Quality Profiling"
    assert "missing values" in data["direct_answer"].lower()
    assert data["chart"] is not None
    assert data["chart"]["type"] == "bar"
    assert data["table_data"] is not None
    assert len(data["table_data"]["rows"]) > 0

# ==============================================================================
# TEST 8: Schema - "What columns are in this dataset?" -> Expected: real schema information
# ==============================================================================
def test_8_schema_inspection(client, sales_dataset):
    res = client.post("/api/v1/chat", json={"question": "What columns are in this dataset?", "dataset_id": sales_dataset})
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "completed"
    assert data["analysis_method"] == "Schema Inspection"
    assert "columns" in data["direct_answer"].lower()
    assert data["table_data"] is not None
    cols_in_table = [r["Column Name"] for r in data["table_data"]["rows"]]
    assert "order_date" in cols_in_table
    assert "sales" in cols_in_table

# ==============================================================================
# TEST 9: Non-sales Dataset - Student data -> Verify no sales-specific assumptions
# ==============================================================================
def test_9_non_sales_dataset(client, student_dataset, monkeypatch):
    async def mock_plan(*args, **kwargs):
        return AnalysisPlan(
            intent="ranking",
            metric_columns=["score"],
            dimension_columns=["subject"],
            aggregation="avg",
            sort="desc",
            visualization="bar",
            explanation_of_plan="Rank subjects by average score."
        )

    async def mock_sql(*args, **kwargs):
        return "SELECT subject, AVG(score) AS avg_score FROM data GROUP BY subject ORDER BY avg_score DESC"

    monkeypatch.setattr(querylens_planner, "create_plan", mock_plan)
    monkeypatch.setattr(analyst_agent, "_generate_sql", mock_sql)

    res = client.post("/api/v1/chat", json={"question": "Which subject has the highest average score?", "dataset_id": student_dataset})
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "completed"
    assert data["chart"]["type"] == "bar"
    assert data["chart"]["xAxisKey"] == "subject"
    assert data["chart"]["yAxisKey"] == "avg_score"
    assert data["chart"]["data"][0]["subject"] == "Mathematics"

# ==============================================================================
# TEST 10: No Date Column -> Clear capability error
# ==============================================================================
def test_10_missing_date_capability_error(client, nodate_dataset, monkeypatch):
    async def mock_plan(*args, **kwargs):
        return AnalysisPlan(
            intent="general_question",
            metric_columns=["sales"],
            missing_required_capability="I can't create a monthly trend because this dataset doesn't contain a date or time column.",
            explanation_of_plan="Missing datetime field for monthly time-series analysis."
        )

    monkeypatch.setattr(querylens_planner, "create_plan", mock_plan)

    res = client.post("/api/v1/chat", json={"question": "Show monthly sales.", "dataset_id": nodate_dataset})
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "completed"
    assert "date or time column" in data["direct_answer"].lower()
    assert data["chart"] is None
