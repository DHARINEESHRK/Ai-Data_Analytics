# QUERYLENS PHASE 2 REPORT: AI PLANNER REBUILD
**Project:** QueryLens  
**Product Vision:** *"Ask your data. Understand your business."*  
**Phase:** Phase 2 — QueryLens AI Planner Rebuild  
**Status:** Successfully Implemented & Verified | 52/52 Tests Passing (100%)  

---

## 1. Executive Summary

In Phase 2, the core reasoning layer of the platform was re-architected. The legacy keyword-based intent classification (`_classify_intent()`) and hardcoded bar-chart heuristic (`_auto_select_chart()`) were completely eradicated. They have been replaced with an **NVIDIA NIM-powered semantic planning layer** (`QueryLensPlanner`), a Pydantic-validated plan schema (`AnalysisPlan`), and an automated schema validation engine (`QueryLensValidator`).

The application now dynamically translates plain-English business inquiries over **arbitrary, non-sales datasets** into structured, verifiable analytical plans without guessing column names, fabricating choices, or using hardcoded positional defaults (`num_cols[0]`).

---

## 2. Files Changed and Created

| File | Action | Purpose |
| :--- | :--- | :--- |
| `backend/app/schemas/planner.py` | **Created** | Defines Pydantic models: `AnalysisPlan`, `PlanFilter`, and `PlanValidationResult`. |
| `backend/app/agents/planner.py` | **Created** | Implements `QueryLensPlanner` (grounded NVIDIA NIM semantic planning) and `QueryLensValidator` (schema & safety rules). |
| `backend/app/agents/analyst_agent.py` | **Modified** | Removed `_classify_intent()` and `_auto_select_chart()`. Integrated `querylens_planner.create_plan()`, added real data quality and schema inspection paths, and connected plan visualization intent. |
| `backend/tests/test_planner.py` | **Created** | 6 end-to-end tests validating diverse schemas, semantic mapping, ambiguity handling, missing capability detection, real data quality, and non-sales domains. |
| `backend/tests/test_agent.py` | **Modified** | Updated orchestration tests to use the new planner architecture. |
| `QUERYLENS_PHASE2_REPORT.md` | **Created** | Phase 2 delivery documentation and technical audit report. |

---

## 3. Old Intent Architecture Removed

### What Was Removed:
1. **Keyword-Based String Heuristics**:
   - `_classify_intent()` in `analyst_agent.py`, which used substring checks (`"by"`, `"top"`, `"group by"`).
   - Removed the `"general_analysis"` fallback that previously bypassed analysis and output canned dataset metadata.
2. **Positional Column Assumptions**:
   - Removed defaults that assumed `num_cols[0]` and `cat_cols[0]` represented the user's intent.
3. **Rigid Chart Forcing**:
   - Removed `_auto_select_chart()`, which forced `type="bar"` on all numeric queries and suppressed single-metric KPI outputs.
4. **Canned Segment Summaries**:
   - Removed text fallbacks that assumed categorical segments and sales rankings on non-sales data.

---

## 4. New AI Planner Architecture

```
                       USER QUESTION (Plain English)
                                    │
                                    ▼
                     GROUNDED REAL DATASET CONTEXT
         (Column names, native dtypes, nulls, uniques, sample values)
                                    │
                                    ▼
                          NVIDIA NIM LLM
                    (meta/llama-3.1-70b-instruct)
                                    │
                                    ▼
                         PYDANTIC ANALYSIS PLAN
       (Intent, Metric Cols, Dimension Cols, Time Col, Agg, Chart)
                                    │
                                    ▼
                          QUERYLENS VALIDATOR
         (Verifies referenced columns, aggregations, safety limits)
                                    │
               ┌────────────────────┴────────────────────┐
               ▼                                         ▼
      AMBIGUITY DETECTED?                       EXECUTION DISPATCH
      (Returns Clarification)                  ┌─────────┴─────────┐
                                               ▼                   ▼
                                          DuckDB SQL         Python Engine
                                        (Aggregation)       (Stats & Anomaly)
                                               └─────────┬─────────┘
                                                         │
                                                         ▼
                                                RESULT VALIDATION
                                                         │
                                                         ▼
                                                DETERMINISTIC CHART
                                              (Line, Bar, Pie, KPI)
                                                         │
                                                         ▼
                                                BUSINESS EXPLANATION
```

---

## 5. Pydantic Analysis Plan Schema

Defined in `backend/app/schemas/planner.py`:

```python
class AnalysisPlan(BaseModel):
    intent: str  # 'time_series' | 'ranking' | 'aggregation' | 'data_quality' | 'schema_inspection' | etc.
    metric_columns: List[str] = Field(default_factory=list)
    dimension_columns: List[str] = Field(default_factory=list)
    time_column: Optional[str] = None
    filters: List[PlanFilter] = Field(default_factory=list)
    aggregation: Optional[str] = None  # 'sum' | 'avg' | 'count' | 'min' | 'max' | 'median'
    time_granularity: Optional[str] = None  # 'day' | 'week' | 'month' | 'quarter' | 'year'
    comparison: Optional[str] = None
    sort: Optional[str] = None  # 'asc' | 'desc'
    limit: Optional[int] = None  # 1 to 1000
    visualization: Optional[str] = None  # 'bar' | 'line' | 'pie' | 'scatter' | 'histogram' | 'area' | 'kpi' | 'table'
    ambiguity_detected: bool = False
    ambiguous_columns: List[str] = Field(default_factory=list)
    clarification_question: Optional[str] = None
    missing_required_capability: Optional[str] = None
    explanation_of_plan: str = ""
    steps: List[str] = Field(default_factory=list)
```

---

## 6. Semantic Column Mapping & Edge Cases

1. **Arbitrary Column Names**:
   - If the user asks *"Show monthly revenue"* on a dataset with columns `[amount, transaction_date, item_name]`, the planner dynamically maps:
     - `metric_columns`: `["amount"]`
     - `time_column`: `"transaction_date"`
     - `time_granularity`: `"month"`
     - `visualization`: `"line"`
2. **Ambiguity Handling**:
   - If the user asks *"What were our sales?"* and the dataset contains `[gross_sales, net_sales, revenue]`, the planner sets:
     - `ambiguity_detected`: `True`
     - `ambiguous_columns`: `["gross_sales", "net_sales", "revenue"]`
     - `clarification_question`: *"I found multiple possible sales metrics: gross_sales, net_sales, and revenue. Which one would you like me to use?"*
   - No silent guessing occurs.
3. **Missing Capability Detection**:
   - If the user asks *"Show monthly sales"* on a dataset with no date/timestamp column, the planner flags:
     - `missing_required_capability`: *"This dataset does not have a date or time column to calculate monthly sales trends."*
   - Explains the limitation gracefully without generating broken SQL.
4. **Data Quality Questions**:
   - *"What values are missing?"* triggers real inspection of `dataset.quality` and column null counts. Returns exact missing counts per column (with bar chart and table) or confirms 100% completeness.
5. **Schema Inspection Questions**:
   - *"What columns are in this dataset?"* returns a real schema table with data types, null counts, and unique value counts.
6. **Non-Sales Domain Support**:
   - Tested on academic marks (`student_id`, `math_score`, `physics_score`) and sensor data:
     - *"Which variable has the highest average?"* dynamically targets the actual numerical subjects without looking for "sales" or "revenue".

---

## 7. Security and Validation Approach

1. **`QueryLensValidator`**:
   - Verifies that all columns in `metric_columns`, `dimension_columns`, `time_column`, and `filters` exist in the real dataset schema.
   - Rejects unapproved aggregations.
   - Enforces limit bounds ($1 \le \text{limit} \le 1000$).
2. **Read-Only DuckDB Execution**:
   - All SQL generation is constrained to `SELECT` and `WITH` statements.
   - Mutation keywords (`DROP`, `DELETE`, `UPDATE`, `ALTER`, `TRUNCATE`, `INSERT`) are blocked by `SQLValidator`.
3. **Graceful Fallbacks Without Fake Data**:
   - If NVIDIA NIM is unreachable, the system raises:
     *"AI analysis is currently unavailable. Please check the NVIDIA NIM connection."*
   - Never fabricates analytical answers or numbers.

---

## 8. Test Results

### 1. Pytest Suite (`backend/tests/`):
* **52 / 52 tests PASSED (100% pass rate in 4.82s)**
  - `test_planner_case_1_standard_sales_time_series` : **PASSED**
  - `test_planner_case_2_arbitrary_column_names_revenue` : **PASSED**
  - `test_planner_case_3_ambiguity_clarification` : **PASSED**
  - `test_planner_case_4_missing_date_capability` : **PASSED**
  - `test_planner_case_5_real_data_quality_missing_values` : **PASSED**
  - `test_planner_case_6_non_sales_domain_sensor_student` : **PASSED**
  - Existing 46 unit & integration tests : **ALL PASSED**

### 2. Frontend Build (`tsc -b && vite build`):
* **PASSED (0 TypeScript errors, 0 compilation warnings)**

---

## 9. Remaining Work for Phase 3

While Phase 2 establishes the AI planning and semantic mapping layer, the following items are prepared for **Phase 3**:
1. **Full Visualization Engine Integration**:
   - Wire backend `visualization_engine.py` directly into the agent visualization dispatcher for dynamic KPI cards, pie/donut charts, and multi-line time series.
2. **Business User Persona & UI Polish**:
   - Refactor `WorkspaceView.tsx` to lead with large KPI cards and plain-English summaries, moving raw SQL and technical execution metrics into collapsible transparency drawers.
3. **QueryLens Branding & UX Consistency**:
   - Update frontend headers and landing page hero to reflect QueryLens (*"Ask your data. Understand your business."*).
