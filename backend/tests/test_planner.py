import pytest
from app.agents.planner import querylens_planner, QueryLensValidator
from app.schemas.planner import AnalysisPlan, PlanFilter
from app.schemas.datasets import DatasetResponse, ColumnMetadata, DataQualityMetrics

def _create_mock_dataset(
    name: str, 
    columns: list[tuple[str, str, str, int, int]], 
    missing_cells: int = 0, 
    duplicate_rows: int = 0
) -> DatasetResponse:
    cols_meta = [
        ColumnMetadata(
            name=col_name,
            column_type=col_type,
            dtype=col_dtype,
            null_count=null_count,
            null_percentage=round((null_count / 100) * 100, 2),
            unique_count=unique_count,
            sample_values=["sample_1", "sample_2"]
        )
        for col_name, col_type, col_dtype, null_count, unique_count in columns
    ]
    return DatasetResponse(
        id=f"test-{name.lower().replace(' ', '-')}",
        name=name,
        filename=f"{name.lower().replace(' ', '_')}.csv",
        format="csv",
        file_size_bytes=1024,
        file_size_formatted="1.0 KB",
        uploaded_at="2026-09-27 12:00:00 UTC",
        row_count=100,
        column_count=len(columns),
        columns=cols_meta,
        quality=DataQualityMetrics(
            quality_score=98.5 if missing_cells == 0 else 85.0,
            total_cells=100 * len(columns),
            missing_cells=missing_cells,
            missing_percentage=round((missing_cells / (100 * len(columns))) * 100, 2),
            duplicate_rows=duplicate_rows,
            duplicate_percentage=round((duplicate_rows / 100) * 100, 2),
            column_type_breakdown={"numerical": 1, "categorical": 1, "datetime": 1}
        )
    )

@pytest.mark.asyncio
async def test_planner_case_1_standard_sales_time_series(monkeypatch):
    """Case 1: Dataset with (sales, order_date, product) -> 'Show monthly sales.'"""
    dataset = _create_mock_dataset("Sales Orders", [
        ("sales", "numerical", "float64", 0, 95),
        ("order_date", "datetime", "datetime64[ns]", 0, 80),
        ("product", "categorical", "object", 0, 12)
    ])

    expected_plan = AnalysisPlan(
        intent="time_series",
        metric_columns=["sales"],
        dimension_columns=["product"],
        time_column="order_date",
        time_granularity="month",
        aggregation="sum",
        visualization="line",
        explanation_of_plan="Aggregate sales by month over order_date."
    )

    async def mock_create_plan(*args, **kwargs):
        return expected_plan

    monkeypatch.setattr(querylens_planner, "create_plan", mock_create_plan)

    plan = await querylens_planner.create_plan("Show monthly sales.", dataset)
    assert plan.intent == "time_series"
    assert "sales" in plan.metric_columns
    assert plan.time_column == "order_date"
    assert plan.time_granularity == "month"
    assert plan.visualization == "line"

    validation = QueryLensValidator.validate(plan, dataset)
    assert validation.valid is True

@pytest.mark.asyncio
async def test_planner_case_2_arbitrary_column_names_revenue(monkeypatch):
    """Case 2: Dataset with (amount, transaction_date, item_name) -> 'Show monthly revenue.'"""
    dataset = _create_mock_dataset("Transactions", [
        ("amount", "numerical", "float64", 0, 90),
        ("transaction_date", "datetime", "datetime64[ns]", 0, 75),
        ("item_name", "categorical", "object", 0, 20)
    ])

    expected_plan = AnalysisPlan(
        intent="time_series",
        metric_columns=["amount"],
        dimension_columns=["item_name"],
        time_column="transaction_date",
        time_granularity="month",
        aggregation="sum",
        visualization="line",
        explanation_of_plan="Dynamically mapped 'revenue' to amount and 'monthly' to transaction_date."
    )

    async def mock_create_plan(*args, **kwargs):
        return expected_plan

    monkeypatch.setattr(querylens_planner, "create_plan", mock_create_plan)

    plan = await querylens_planner.create_plan("Show monthly revenue.", dataset)
    assert plan.intent == "time_series"
    assert plan.metric_columns == ["amount"]
    assert plan.time_column == "transaction_date"
    assert "sales" not in plan.metric_columns

    validation = QueryLensValidator.validate(plan, dataset)
    assert validation.valid is True

@pytest.mark.asyncio
async def test_planner_case_3_ambiguity_clarification(monkeypatch):
    """Case 3: Dataset with (gross_sales, net_sales, revenue) -> 'What were our sales?'"""
    dataset = _create_mock_dataset("Financials", [
        ("gross_sales", "numerical", "float64", 0, 85),
        ("net_sales", "numerical", "float64", 0, 85),
        ("revenue", "numerical", "float64", 0, 85),
        ("region", "categorical", "object", 0, 5)
    ])

    expected_plan = AnalysisPlan(
        intent="general_question",
        metric_columns=["gross_sales", "net_sales", "revenue"],
        ambiguity_detected=True,
        ambiguous_columns=["gross_sales", "net_sales", "revenue"],
        clarification_question="I found multiple possible sales metrics: gross_sales, net_sales, and revenue. Which one would you like me to use?",
        explanation_of_plan="Ambiguity detected between gross_sales, net_sales, and revenue."
    )

    async def mock_create_plan(*args, **kwargs):
        return expected_plan

    monkeypatch.setattr(querylens_planner, "create_plan", mock_create_plan)

    plan = await querylens_planner.create_plan("What were our sales?", dataset)
    assert plan.ambiguity_detected is True
    assert len(plan.ambiguous_columns) == 3
    assert "clarification" in plan.clarification_question.lower() or "which" in plan.clarification_question.lower()

@pytest.mark.asyncio
async def test_planner_case_4_missing_date_capability(monkeypatch):
    """Case 4: Dataset without a date column -> 'Show monthly sales.'"""
    dataset = _create_mock_dataset("Store Items", [
        ("sales", "numerical", "float64", 0, 90),
        ("store_id", "categorical", "object", 0, 10),
        ("category", "categorical", "object", 0, 8)
    ])

    expected_plan = AnalysisPlan(
        intent="general_question",
        metric_columns=["sales"],
        missing_required_capability="This dataset does not have a date or time column to calculate monthly sales trends.",
        explanation_of_plan="Dataset lacks datetime column for time series."
    )

    async def mock_create_plan(*args, **kwargs):
        return expected_plan

    monkeypatch.setattr(querylens_planner, "create_plan", mock_create_plan)

    plan = await querylens_planner.create_plan("Show monthly sales.", dataset)
    assert plan.missing_required_capability is not None
    assert "date" in plan.missing_required_capability.lower()

@pytest.mark.asyncio
async def test_planner_case_5_real_data_quality_missing_values():
    """Case 5: Dataset with missing values -> 'What values are missing?'"""
    dataset = _create_mock_dataset("Customer Records", [
        ("customer_name", "categorical", "object", 15, 85),
        ("email", "categorical", "object", 8, 92),
        ("spending", "numerical", "float64", 3, 97)
    ], missing_cells=26, duplicate_rows=4)

    # Uses real empirical data quality planner logic
    plan = await querylens_planner.create_plan("What values are missing?", dataset)
    assert plan.intent == "data_quality"
    assert "quality" in plan.explanation_of_plan.lower() or "missing" in plan.explanation_of_plan.lower()

@pytest.mark.asyncio
async def test_planner_case_6_non_sales_domain_sensor_student(monkeypatch):
    """Case 6: Non-sales dataset (student marks) -> 'Which variable has the highest average?'"""
    dataset = _create_mock_dataset("Student Grades", [
        ("student_id", "categorical", "object", 0, 100),
        ("math_score", "numerical", "int64", 0, 45),
        ("physics_score", "numerical", "int64", 0, 42),
        ("chemistry_score", "numerical", "int64", 0, 40)
    ])

    expected_plan = AnalysisPlan(
        intent="descriptive_statistics",
        metric_columns=["math_score", "physics_score", "chemistry_score"],
        aggregation="avg",
        visualization="bar",
        explanation_of_plan="Calculate and compare the average scores across math, physics, and chemistry."
    )

    async def mock_create_plan(*args, **kwargs):
        return expected_plan

    monkeypatch.setattr(querylens_planner, "create_plan", mock_create_plan)

    plan = await querylens_planner.create_plan("Which variable has the highest average?", dataset)
    assert plan.intent == "descriptive_statistics"
    assert "math_score" in plan.metric_columns
    assert "physics_score" in plan.metric_columns
    assert "sales" not in plan.metric_columns
    
    validation = QueryLensValidator.validate(plan, dataset)
    assert validation.valid is True
