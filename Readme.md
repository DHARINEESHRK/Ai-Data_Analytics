# Product Specification --- AI Data Analyst Agent

## 1. Product Overview

**Product Name:** AI Data Analyst Agent

**Product Type:** AI-powered data analytics web application.

**Goal:** Build a local-first AI data analysis platform where users can
upload CSV/XLSX datasets or connect PostgreSQL, ask questions in natural
language, and receive validated analysis, SQL/Python analysis, insights,
and interactive visualizations.

The product should feel like a polished modern SaaS analytics product
rather than a simple chatbot or college project.

------------------------------------------------------------------------

## 2. Core User Problem

Users often need to understand datasets but may not know SQL, Python, or
visualization libraries well enough to perform every analysis manually.

Example questions:

-   What are the top 10 products by revenue?
-   Show monthly revenue.
-   Which category performs best?
-   Find unusual values in the sales column.
-   Is there a relationship between price and sales?
-   Compare sales across regions.

The system converts the natural-language request into an appropriate
analytical workflow and returns the result in an understandable format.

------------------------------------------------------------------------

## 3. Product Objectives

1.  Upload CSV/XLSX datasets.
2.  Connect to PostgreSQL.
3.  Automatically profile datasets.
4.  Support natural-language analytical questions.
5.  Use NVIDIA NIM as the primary LLM provider.
6.  Implement an AI agent/orchestrator.
7.  Provide controlled SQL analysis.
8.  Provide controlled Python/statistical analysis.
9.  Generate predefined visualizations.
10. Validate analytical results before presenting them.
11. Explain results using natural language.
12. Store analysis history.
13. Provide a premium responsive UI.
14. Keep the application runnable locally.
15. Minimize unnecessary LLM/API calls.

------------------------------------------------------------------------

## 4. Main User Flow

``` text
User
  ↓
Open Application
  ↓
Upload CSV/XLSX OR Connect PostgreSQL
  ↓
Dataset Profiling
  ↓
Dataset Explorer
  ↓
Ask Natural-Language Question
  ↓
AI Agent
  ↓
Understand Intent
  ↓
Inspect Schema / Metadata
  ↓
Select Tool
  ├── SQL Tool
  ├── Python Analytics Tool
  └── Visualization Tool
  ↓
Execute Analysis
  ↓
Validate Result
  ↓
Generate Insight
  ↓
Answer + Visualization + Supporting Data + SQL when applicable
  ↓
Save Analysis History
```

------------------------------------------------------------------------

## 5. Application Pages

### 5.1 Landing Page

Purpose: introduce the product and let the user begin analysis.

Include:

-   Product name
-   Hero section
-   Primary CTA: **Start Analyzing**
-   Secondary CTA: **Explore Demo**
-   Product preview
-   Feature section
-   How it works
-   Supported data sources
-   Technology section
-   Footer

Suggested hero:

**Turn Your Data Into Answers.**

Ask questions in plain English. Analyze data, discover insights, and
create visualizations with AI.

### 5.2 Data Workspace

The primary application screen.

Sidebar:

-   New Analysis
-   Datasets
-   Workspace
-   History
-   Settings

Main area:

-   Dataset selector
-   Dataset summary
-   AI chat
-   Suggested questions
-   Analysis progress
-   Answer
-   Visualization
-   Data table
-   SQL details
-   Analysis details

### 5.3 Data Explorer

Display:

-   Dataset name
-   Row count
-   Column count
-   Missing values
-   Duplicate rows
-   Data quality
-   Column information
-   Dataset preview

### 5.4 Analysis History

Each record contains:

-   Question
-   Dataset
-   Timestamp
-   Answer
-   Analysis type
-   Chart configuration
-   SQL when applicable

Actions:

-   Open
-   Search
-   Delete

### 5.5 Settings

Include:

-   Theme
-   API configuration status
-   Database connection settings
-   Application preferences
-   User account settings

Never expose API secrets to the frontend.

------------------------------------------------------------------------

## 6. Data Sources

### CSV

Required initial support.

Validate:

-   File type
-   Encoding
-   Empty files
-   File size
-   Parsing errors

### XLSX

Support spreadsheet uploads where implemented.

### PostgreSQL

Optional database source.

Support:

-   Connection testing
-   Schema discovery
-   Table discovery
-   Column discovery
-   Read-only analytical queries

Database credentials remain backend-side.

------------------------------------------------------------------------

## 7. Data Profiling Engine

Automatically detect:

-   Rows
-   Columns
-   Column names
-   Data types
-   Missing values
-   Duplicate rows
-   Unique values
-   Numerical columns
-   Categorical columns
-   Date/time columns
-   Boolean columns
-   Text columns

Numerical statistics:

-   Minimum
-   Maximum
-   Mean
-   Median
-   Standard deviation

Categorical statistics:

-   Unique count
-   Most frequent values

Date statistics:

-   Minimum date
-   Maximum date

Reuse metadata instead of repeatedly sending the complete dataset to the
LLM.

------------------------------------------------------------------------

## 8. AI Architecture

### Primary AI Provider

**NVIDIA NIM API**

The NVIDIA API key must:

-   Exist only on the backend
-   Be stored in environment variables
-   Never be exposed to React/frontend
-   Never be committed to Git

### Agent Flow

``` text
User Question
      ↓
Understand Intent
      ↓
Inspect Dataset
      ↓
Create Analysis Plan
      ↓
Select Tool
      ↓
Execute Tool
      ↓
Validate Result
      ↓
Generate Insight
      ↓
Final Response
```

Do not expose internal chain-of-thought.

The UI may show safe progress messages:

-   Understanding your question...
-   Inspecting dataset...
-   Running analysis...
-   Validating results...
-   Creating visualization...

------------------------------------------------------------------------

## 9. Agent Tools

### Dataset Profile

``` text
get_dataset_profile()
```

Returns dataset metadata and statistics.

### Schema

``` text
get_schema()
```

Returns tables, columns, data types, and relationships where available.

### SQL

``` text
execute_sql(query)
```

Must be read-only.

Block:

-   INSERT
-   UPDATE
-   DELETE
-   DROP
-   ALTER
-   TRUNCATE
-   CREATE
-   GRANT
-   REVOKE

Add query timeout, result limits, validation, and error handling.

### Python Analytics

Use controlled operations:

``` text
calculate_statistics()
calculate_correlation()
detect_outliers()
aggregate_data()
analyze_time_series()
```

Use Pandas, NumPy, and SciPy where necessary.

Do not initially allow unrestricted AI-generated Python execution.

------------------------------------------------------------------------

## 10. Visualization Engine

The LLM must **not generate visualization code**.

The model should return visualization parameters, for example:

``` json
{
  "chart_type": "bar",
  "x_column": "category",
  "y_column": "revenue",
  "title": "Revenue by Category"
}
```

The application renders the actual visualization.

Supported:

-   Bar
-   Line
-   Pie
-   Scatter
-   Histogram
-   Area
-   KPI
-   Table

Prefer **Plotly** for interactive web visualizations.

Matplotlib may be used for static image generation where appropriate.

Requirements:

-   Validate columns
-   Validate data types
-   Handle empty results
-   Format large numbers
-   Handle dates correctly
-   Produce readable titles
-   Never use fabricated values

------------------------------------------------------------------------

## 11. Result Validation

``` text
Tool Result
    ↓
Validation
    ↓
Valid?
 ┌──┴──┐
Yes    No
 ↓      ↓
Insight  Retry / Correct
```

Validate:

-   Data exists
-   Columns exist
-   Result structure
-   Numerical values
-   Visualization parameters
-   SQL execution

Allow limited retry/correction when SQL fails.

------------------------------------------------------------------------

## 12. AI Response Format

A successful analysis can contain:

### Direct Answer

Concise natural-language answer.

### Key Insight

Important pattern or finding.

### Visualization

Relevant chart.

### Supporting Data

Table or summarized data.

### SQL

Expandable SQL when applicable.

### Analysis Details

Expandable analytical method.

All numerical claims must come from actual tool results.

------------------------------------------------------------------------

## 13. Performance Requirements

Minimize unnecessary AI calls.

-   Reuse dataset metadata.
-   Do not send full datasets to the LLM unnecessarily.
-   Use predefined visualization functions.
-   Reuse analysis results.
-   Limit expensive operations.
-   Do not generate chart code through the LLM.
-   Limit large query results.

------------------------------------------------------------------------

## 14. Security Requirements

### API

-   Backend-only API keys
-   Environment variables
-   Secure CORS
-   Input validation
-   Rate limiting where appropriate

### SQL

-   Read-only access
-   Query validation
-   Timeout
-   Result limits

### Files

-   File type validation
-   File size limits
-   Safe parsing
-   Error handling

### Authentication

If enabled:

-   Secure login
-   Protected routes
-   User-specific datasets
-   User-specific analysis history

------------------------------------------------------------------------

## 15. Technology Stack

### Frontend

-   React
-   TypeScript
-   Vite
-   Tailwind CSS
-   Lucide React
-   Plotly.js

### Backend

-   Python
-   FastAPI
-   Pydantic
-   Pandas
-   NumPy
-   SQLAlchemy

### AI

-   NVIDIA NIM API
-   Tool/function calling
-   Agent orchestration

### Data

-   CSV
-   XLSX
-   PostgreSQL
-   Parquet where useful

### Development

-   Git
-   GitHub
-   Localhost

------------------------------------------------------------------------

## 16. Local Development

The product is intentionally local-first.

Do not require:

-   Docker
-   Render
-   AWS
-   Azure
-   GCP
-   Cloud deployment

Architecture:

``` text
React Frontend
      ↓
FastAPI Backend
      ↓
NVIDIA NIM API
      ↓
Agent + Tools
      ↓
CSV / PostgreSQL
```

------------------------------------------------------------------------

## 17. UI/UX Requirements

The interface must feel like a professional AI SaaS application.

Characteristics:

-   Clean
-   Minimal
-   Modern
-   Data-focused
-   Strong typography
-   Consistent spacing
-   Subtle animations
-   Responsive
-   Accessible
-   Dark/light mode

Avoid:

-   Excessive gradients
-   Excessive glassmorphism
-   Huge rounded cards
-   Unnecessary animations
-   Visual clutter

Every asynchronous operation should have:

-   Loading state
-   Empty state
-   Error state
-   Success state
-   Retry action where appropriate

------------------------------------------------------------------------

## 18. Example End-to-End Scenario

User:

``` text
Show me the top 10 product categories by revenue.
```

Agent:

``` text
1. Inspect dataset schema
2. Identify category column
3. Identify revenue column
4. Generate SQL
5. Execute SQL
6. Validate result
7. Select bar chart
8. Render chart
9. Generate insight
10. Return response
```

Result:

``` text
Answer
↓
Key Insight
↓
Bar Chart
↓
Supporting Table
↓
SQL
↓
Analysis Details
```

------------------------------------------------------------------------

## 19. Testing Strategy

Use both automated and manual testing.

### TestSprite

Use TestSprite where available for:

-   Authentication
-   Dataset upload
-   Dataset profiling
-   AI questions
-   SQL tool
-   Python analytics
-   Visualization
-   PostgreSQL
-   History
-   Navigation
-   Error handling
-   Responsive UI

### Manual End-to-End Test

``` text
Login
↓
Upload dataset
↓
Profile dataset
↓
Ask question
↓
Agent selects tool
↓
Run analysis
↓
Validate result
↓
Create visualization
↓
Generate insight
↓
Save history
↓
Reopen analysis
↓
Switch dataset
↓
Ask another question
```

------------------------------------------------------------------------

## 20. Non-Goals

The initial version does not require:

-   Cloud deployment
-   Docker deployment
-   Distributed processing
-   Kafka
-   Airflow
-   Snowflake
-   PySpark
-   Multi-cloud architecture
-   Arbitrary AI-generated Python execution

These can be future extensions.

------------------------------------------------------------------------

## 21. Future Extensions

Possible future architecture:

``` text
Kaggle / APIs / Files
      ↓
ETL
      ↓
Airflow
      ↓
Data Warehouse
      ↓
Snowflake
      ↓
PySpark
      ↓
AI Analyst Agent
      ↓
Power BI / Interactive UI
```

------------------------------------------------------------------------

## 22. Success Criteria

The product is successful when a user can:

1.  Open the local application.
2.  Upload a real dataset.
3.  Automatically see its profile.
4.  Ask a natural-language analytical question.
5.  Have the AI determine the appropriate tool.
6.  Execute safe SQL or controlled Python analysis.
7.  Validate the result.
8.  Automatically render a relevant visualization.
9.  Receive an accurate natural-language explanation.
10. Inspect supporting SQL/data.
11. Save the analysis to history.
12. Reopen previous analyses.
13. Connect PostgreSQL when configured.
14. Use the application without exposing API keys.
15. Complete the core workflow without manual coding.

------------------------------------------------------------------------

## 23. Core Product Principle

> **The AI decides what analysis should happen; deterministic
> application code performs the analysis and visualization.**

This keeps the system more reliable, secure, predictable, testable,
maintainable, and efficient with LLM API usage.

------------------------------------------------------------------------

## 24. Final Product Vision

**AI Data Analyst Agent = "ChatGPT for your data, but with real
analytical execution."**

Users should not need to know SQL or Python to ask questions, while
technical users should still be able to inspect the SQL, data, and
analytical method behind each answer.
