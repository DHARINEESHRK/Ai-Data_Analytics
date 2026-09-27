# QUERYLENS REARCHITECTURE AUDIT
**Project Name:** QueryLens  
**Product Vision:** *"Ask your data. Understand your business."*  
**Phase:** Phase 1 — Project Audit & Rearchitecture Blueprint  
**Status:** Audit Completed | Codebase Unmodified  

---

## Executive Summary

This audit assesses the current state of the codebase and evaluates its readiness for **QueryLens**. QueryLens is an AI-powered data analysis assistant for non-technical users—sales executives, business operators, managers, students, and founders—who need instant, trustworthy answers without writing SQL, Python, or understanding database schemas.

The audit examined every backend module, API endpoint, agent state machine, prompt template, tool execution path, frontend route, and visualization component.

---

## The Critical Question

> **Can the current application actually accept an arbitrary dataset and allow the NVIDIA NIM-powered AI to understand an arbitrary natural-language question and perform the required real analysis?**

### **ANSWER: NO (With Critical Structural Bottlenecks)**

While the underlying data infrastructure (FastAPI, DuckDB, Pandas, and dataset profiling) is capable of executing real computations, **the AI reasoning layer currently fails on arbitrary datasets and non-technical business questions**.

### Exact Root Causes:

1. **Rigid Keyword-Based Intent Filter Bypasses the AI Agent**:
   In `backend/app/agents/analyst_agent.py`, user queries are filtered through Python keyword matching:
   ```python
   def _classify_intent(self, q_lower: str, dataset: DatasetResponse) -> str:
       if any(k in q_lower for k in ["correlation", "relationship", "relation", "relate", "correlate", "vs", "versus"]):
           return "correlation_analysis"
       elif any(k in q_lower for k in ["top", "highest", "lowest", "bottom", "rank", "most", "least"]):
           return "top_n_query"
       elif any(k in q_lower for k in ["by", "per", "group by", "break down", "average", "sum", "total", "count"]):
           return "sql_aggregation"
       elif any(k in q_lower for k in ["where", "filter", "find", "show rows", "list"]):
           return "filter_query"
       elif any(k in q_lower for k in ["column", "schema", "field", "structure"]):
           return "schema_inspection"
       return "general_analysis"
   ```
   * **Failure Mode:** If a business user asks common questions such as:
     * *"What were our monthly sales?"* (No explicit `"by"`, `"group by"`, or `"sum"` keywords)
     * *"What values are missing?"* (Neither `"column"` nor `"schema"`)
     * *"Which products are performing poorly?"* (Neither `"lowest"` nor `"bottom"`)
     * *"Compare this year with last year."* (`"compare"` is absent from the keywords list)
     The query defaults to `"general_analysis"`.

2. **The "General Analysis" Silent Failure**:
   When intent evaluates to `"general_analysis"` or `"schema_inspection"`, `analyst_agent.run` **does not invoke SQL, does not invoke Python tools, and generates no charts**. Instead, it jumps directly to canned metadata:
   ```python
   direct_answer = f"Inspected dataset '{dataset.name}' containing {dataset.row_count:,} rows and {dataset.column_count} columns."
   key_insight = "Ready to perform analytical queries, statistical correlations, and interactive chart generation."
   ```
   The user receives a generic schema summary instead of an answer.

3. **Orphaned Visualization Engine in the Agent Loop**:
   `backend/app/tools/visualization_engine.py` provides builders for Bar, Line, Pie, Scatter, Histogram, Area, KPI, and Table. However, `analyst_agent.py` bypasses this engine, relying on an inline helper `_auto_select_chart`:
   ```python
   def _auto_select_chart(self, sql_result: Dict[str, Any]) -> Optional[ChartConfigResponse]:
       # Hardcoded to type="bar" for any numeric 2nd column
       return ChartConfigResponse(type="bar", xAxisKey=x_key, yAxisKey=y_key, ...)
   ```
   * Trend/temporal questions yield bar charts instead of line or area charts.
   * Single-metric queries (`SELECT SUM(revenue) FROM data`) return `None` because `len(columns) < 2`, suppressing KPI cards.

4. **Hardcoded Fallbacks Assume Categorical Ranking**:
   If an LLM response fails or times out, the text generation assumes a ranked categorical query:
   ```python
   direct_answer = f"Top result is {top_record.get(first_col)} with {top_record.get(val_col)}..."
   key_insight = f"The leading segment accounts for a substantial share of the aggregated metric in {dataset.name}."
   ```
   For datasets representing sensor data, survey responses, logs, or single KPIs, this produces incorrect insights.

---

## 1. Existing System Architecture

```
┌────────────────────────────────────────────────────────┐
│                      Frontend UI                       │
│  React 19 + TypeScript + Vite + TailwindCSS + Recharts │
│  Views: Landing, Dashboard, Workspace, Explorer,       │
│         Analytics, Datasets, History, Settings         │
└───────────────────────────┬────────────────────────────┘
                            │ REST / HTTP (JSON)
┌───────────────────────────▼────────────────────────────┐
│                    FastAPI Backend                     │
│  app/main.py, app/api/v1/endpoints/*.py               │
└──────┬────────────────────┬────────────────────┬───────┘
       │                    │                    │
┌──────▼───────┐     ┌──────▼───────┐     ┌──────▼───────┐
│   Ingestion  │     │ DuckDB SQL   │     │  AI Agent    │
│  CSV, Excel  │     │ Pandas/SciPy │     │  NVIDIA NIM  │
│  Validation  │     │ Storage/View │     │  Llama-70B   │
└──────────────┘     └──────────────┘     └──────────────┘
```

---

## 2. Existing User Flow

```
1. User lands on LandingPage ("Get Started" / "Open Workspace").
2. Navigates to DatasetsView: Uploads CSV / XLSX file.
3. System validates file size (<50MB) and parses DataFrame.
4. DatasetService profiles data (types, nulls, unique values, quality score).
5. User navigates to WorkspaceView:
   - Left sidebar lists active datasets.
   - User types natural language question.
   - System displays intermediate thinking step.
   - Assistant displays direct answer, key insight, chart, and expandable SQL.
6. User can navigate to DataExplorerView (preview table & schema).
7. User can navigate to AnalyticsView (run correlation or outlier calculations).
8. User can view past queries in HistoryView.
```

---

## 3. Existing AI Flow & Limitations

```
User Query
   │
   ▼
analyst_agent.run()
   │
   ├──> Regex/Substring Intent Check (_classify_intent)
   │       │
   │       ├──> "correlation_analysis" ──> Python correlation ──> Line Chart (Preview rows)
   │       │
   │       ├──> "sql_aggregation" / "top_n_query" / "filter_query"
   │       │       │
   │       │       ├──> NIM _generate_sql() (Up to 3 retries)
   │       │       ├──> DuckDB execute_sql()
   │       │       ├──> _auto_select_chart() (Strictly 'bar' chart)
   │       │       └──> NIM _generate_final_insight()
   │       │
   │       └──> "general_analysis" / "schema_inspection"
   │               └──> Returns static schema description (NO analysis performed)
```

---

## 4. Existing Data Flow

1. **Storage**: Ingested files stored in `backend/storage/uploads/` with UUID-prefixed filenames.
2. **Catalog**: Metadata serialized to `backend/storage/datasets_catalog.json`.
3. **Execution Sandbox**:
   - CSV: DuckDB registers an ephemeral in-memory view `CREATE VIEW data AS SELECT * FROM read_csv_auto(...)`.
   - XLSX: Pandas reads the file into memory and registers the DataFrame into DuckDB.
4. **Output Pipeline**: Query results sanitized (replacing `NaN`/`inf` with `None`) and returned as JSON records.

---

## 5. Audit Across 25 Specific Vectors

| # | Inspection Vector | Current Implementation Status & Findings |
|---|---|---|
| **1** | **Frontend Pages** | 8 distinct views: `LandingPage`, `DashboardView`, `WorkspaceView`, `DataExplorerView`, `AnalyticsView`, `DatasetsView`, `HistoryView`, `SettingsView`. |
| **2** | **Frontend Routing** | State-driven tab routing managed in `App.tsx` (`activeTab`). Smooth transitions, zero page reloads. |
| **3** | **Backend APIs** | 9 endpoint modules under `backend/app/api/v1/endpoints/`: `/auth`, `/datasets`, `/chat`, `/sql`, `/analytics`, `/visualizations`, `/postgres`, `/history`, `/health`. |
| **4** | **Dataset Ingestion** | Robust file handling in `dataset_service.py` for `.csv` and `.xlsx`. Enforces 50MB file size ceiling. |
| **5** | **Dataset Profiling** | `profile_and_save()` calculates nulls, duplicates, quality score (0–100%), and column statistics (min, max, mean, top categories). |
| **6** | **Schema Detection** | High accuracy type classification: `numerical`, `categorical`, `datetime`, `boolean`, `text`. |
| **7** | **NVIDIA NIM Integration** | Fully integrated with `meta/llama-3.1-70b-instruct` via OpenAI-compatible endpoint. Includes schema grounding in prompt. |
| **8** | **Agent Planner** | Handled inside `analyst_agent.py`. Bottlenecked by keyword-based intent detection rather than an LLM planner. |
| **9** | **Agent Orchestrator** | Coordinates SQL generation, execution, validation, and insight generation. Contains up to 3 self-healing retry cycles. |
| **10** | **SQL Execution** | Safe in-memory DuckDB execution. `SQLValidator` rejects mutating keywords (`DROP`, `DELETE`, `UPDATE`, `ALTER`, etc.). |
| **11** | **Python Analytics** | `python_analytics.py` provides descriptive stats, Pearson/Spearman correlation, IQR outlier detection, and grouping. |
| **12** | **Visualization System** | `visualization_engine.py` supports 8 chart types, but `analyst_agent.py` bypasses it and hardcodes a bar chart. |
| **13** | **PostgreSQL Integration** | Live connection testing (`/postgres/test`), schema discovery, and query execution without client credential leaks. |
| **14** | **Analysis History** | File-backed JSON history log (`/history`) supporting query storage, search, re-run, and deletion. |
| **15** | **Authentication** | JWT Bearer token authentication with PBKDF2 password hashing in `auth_service.py`. |
| **16** | **Hardcoded Analytical Logic** | `_pick_correlation_columns` picks `num_cols[0]` and `num_cols[1]` when specific columns aren't extracted by keyword matching. |
| **17** | **Hardcoded Chart Logic** | `_auto_select_chart` exclusively generates `'bar'` charts for query results, ignoring line, pie, and KPI configurations. |
| **18** | **Predefined Q&A Mappings** | Found in fallback generation in `analyst_agent.py` and `nim_service.py` when an API key is missing. |
| **19** | **Mock / Demo Data** | **ZERO mock data remains.** All mock datasets and placeholder KPIs were completely removed in prior phases. |
| **20** | **Fake Fallback Values** | When SQL fails, the fallback insight uses hardcoded segment phrasing regardless of data type. |
| **21** | **Places Where AI is Bypassed**| Intent classification (`_classify_intent`), chart selection (`_auto_select_chart`), and schema questions bypass the LLM. |
| **22** | **Chart Value Substitution** | In correlation analysis, the chart data is extracted from the raw first 25 preview rows rather than true regression pairs. |
| **23** | **Assumed Column Names** | Offline SQL generation defaults to `cat_cols[0]` and `num_cols[0]` without checking semantic fit. |
| **24** | **Sales Bias in Language** | Prompt templates frequently reference "sales", "revenue", and "categories", skewing reasoning on non-sales datasets. |
| **25** | **Arbitrary Dataset Reasoning** | The LLM does not dynamically map natural language concepts to arbitrary column names before planning execution. |

---

## 6. Proposed QueryLens Architecture

To serve business and non-technical users, QueryLens will operate through an **Autonomous Two-Stage Agent Loop**:

```
                       ┌────────────────────────┐
                       │  User Question (NLP)   │
                       └───────────┬────────────┘
                                   │
                                   ▼
                       ┌────────────────────────┐
                       │  Stage 1: Intent &     │
                       │  Semantic Column Map   │
                       │  (NVIDIA NIM LLM)      │
                       └───────────┬────────────┘
                                   │ Returns JSON Plan:
                                   │ - Target metrics & dimensions
                                   │ - Operation (aggregate, trend, filter, quality)
                                   │ - Best chart (line, bar, kpi, pie)
                                   ▼
                       ┌────────────────────────┐
                       │  Stage 2: Execution    │
                       │  & Validation Engine   │
                       └─────┬────────────┬─────┘
                             │            │
             ┌───────────────▼┐          ┌▼───────────────┐
             │  DuckDB SQL    │          │  Pandas Engine │
             │  (Aggregation) │          │  (Stats & IQR) │
             └───────────────┬┘          └┬───────────────┘
                             │            │
                             └─────┬──────┘
                                   │
                                   ▼
                       ┌────────────────────────┐
                       │ Stage 3: Chart & Story │
                       │ - Business Insights    │
                       │ - Plain-English Summary│
                       │ - Deterministic Chart  │
                       └────────────────────────┘
```

### Key Rearchitecture Pillars:
1. **Dynamic Semantic Grounding**:
   Replace keyword matching with an LLM-powered Planning Step that maps business terminology (e.g. *"how much did we make"*, *"best performing item"*, *"drop-off"*) to the real columns of any arbitrary dataset.
2. **Full Visualization Engine Integration**:
   Connect `VisualizationEngine` to the agent output. If a question involves time, render **Line/Area**; if a single number, render a **KPI Card**; if category breakdown, render **Bar/Pie**.
3. **Business User Persona**:
   Remove technical noise (such as raw DuckDB syntax, p-values, and SQL errors) from the default view. Provide plain-English business summaries while keeping technical details collapsible for transparency.

---

## 7. File Action Matrix

### Files That Need Modification
* `backend/app/agents/analyst_agent.py` — Replace regex intent matching with an LLM Planner; wire in `visualization_engine.py`; remove sales-specific bias.
* `backend/app/agent/` / `prompts.py` — Update system prompts to reason over arbitrary datasets and output structured business explanations.
* `frontend/src/components/views/WorkspaceView.tsx` — Streamline response cards for business users (Big KPI cards, plain summaries, collapsible SQL).
* `frontend/src/components/views/LandingPage.tsx` — Rebrand hero and feature text to QueryLens (*"Ask your data. Understand your business."*).
* `frontend/src/components/layout/Shell.tsx` — Update platform branding, title, and logo to QueryLens.

### Files That Can Remain Unchanged
* `backend/app/tools/sql_tool.py` — Secure read-only DuckDB SQL engine is complete and robust.
* `backend/app/tools/python_analytics.py` — Comprehensive Pandas/NumPy statistical operations are fully functional.
* `backend/app/tools/visualization_engine.py` — Chart building functions for 8 chart types are complete.
* `backend/app/services/dataset_service.py` — Profiling, type inference, and validation are production-ready.
* `backend/app/services/auth_service.py` & `postgres_service.py` — Secure auth and DB connections work as expected.
* `backend/app/api/v1/endpoints/` (except minor schema adjustments if needed).

### Files That Should Eventually Be Removed
* Redundant or deprecated prototype scripts in `backend/app/` once the single agent pipeline is unified.

---

## 8. Verification: Application Start Status

The existing application was tested following this audit:
* **Backend Import & Dependencies**: Verified via `python -c "from app.main import app"`: **SUCCESS (Code 0)**.
* **Frontend Compilation & Build**: Verified via `tsc -b && vite build`: **SUCCESS (Code 0, 0 errors)**.
* **Backend Pytest Suite**: 46/46 unit tests passing.
* **Local Server Execution**: Verified via `npm run dev` root command.

*No code modifications were introduced during Phase 1.*
