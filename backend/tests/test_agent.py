import pytest
from app.tools.query_tools import query_tools

def test_agent_end_to_end_sql_and_tools(client):
    # 1. Upload test dataset
    csv_data = (
        "product,revenue,marketing_spend\n"
        "Widget A,15000,3000\n"
        "Widget B,8500,1200\n"
        "Widget C,22000,5000\n"
        "Widget D,4500,800\n"
        "Widget E,31000,7200\n"
    )
    files = {"file": ("products_sales.csv", csv_data.encode("utf-8"), "text/csv")}
    upload_res = client.post("/api/v1/datasets/upload", files=files)
    assert upload_res.status_code == 201
    dataset_id = upload_res.json()["id"]

    # 2. Test Tool 2: get_schema
    schema = query_tools.get_schema(dataset_id)
    assert len(schema["columns"]) == 3

    # 3. Test Tool 3: execute_sql on DuckDB
    sql_res = query_tools.execute_sql(dataset_id, "SELECT product, revenue FROM data ORDER BY revenue DESC LIMIT 3")
    assert sql_res["success"] is True
    assert len(sql_res["rows"]) == 3
    assert sql_res["rows"][0]["product"] == "Widget E"

    # 4. Test Tool 4: run_statistical_analysis
    stats_res = query_tools.run_statistical_analysis(dataset_id, "marketing_spend", "revenue")
    assert stats_res["pearson_correlation"] > 0.8
    assert stats_res["direction"] == "positive"

    # 5. Test Agent Execution: "What are the top products by revenue?"
    agent_req = {
        "question": "What are the top products by revenue?",
        "dataset_id": dataset_id
    }
    agent_res = client.post("/api/v1/chat", json=agent_req)
    assert agent_res.status_code == 200
    agent_data = agent_res.json()

    assert len(agent_data["steps"]) > 0
    assert "Understanding" in agent_data["steps"][0]
    assert agent_data["status"] == "completed"

    # 6. Test Agent Execution: "Is there a relationship between marketing spend and revenue?"
    corr_req = {
        "question": "Is there a relationship between marketing spend and revenue?",
        "dataset_id": dataset_id
    }
    corr_res = client.post("/api/v1/chat", json=corr_req)
    assert corr_res.status_code == 200
    corr_data = corr_res.json()
    assert corr_data["stats"] is not None
    assert "correlation" in corr_data["answer"].lower()
