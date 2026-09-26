import React from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  LineChart, 
  Shield, 
  Cpu, 
  Play, 
  Zap, 
  Bot, 
  Layers,
  FileSpreadsheet,
  Database
} from 'lucide-react';

interface LandingPageProps {
  onStartAnalyzing: () => void;
  onExploreDemo: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onStartAnalyzing,
  onExploreDemo,
}) => {
  return (
    <div className="min-h-screen bg-white dark:bg-[#070b13] text-slate-900 dark:text-slate-100 selection:bg-indigo-500 selection:text-white transition-colors">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 dark:bg-[#070b13]/80 border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-500/20">
              <Bot size={20} />
            </div>
            <div className="flex flex-col">
              <span className="font-bold tracking-tight text-base text-slate-900 dark:text-white leading-none">
                Nova Analytics
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono mt-0.5">
                AI Data Analyst Agent
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8 text-xs font-medium text-slate-600 dark:text-slate-400">
            <a href="#features" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">How It Works</a>
            <a href="#data-sources" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Integrations</a>
            <a href="#technology" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Stack</a>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onExploreDemo}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            >
              <Play size={13} className="text-indigo-500 fill-indigo-500" />
              Live Demo
            </button>
            <button
              onClick={onStartAnalyzing}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Start Analyzing
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-28 overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-indigo-500/10 dark:bg-indigo-600/15 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60 shadow-sm animate-fadeIn">
            <Sparkles size={13} className="text-indigo-500 animate-pulse" />
            <span>Next-Gen Autonomous Analytics with NVIDIA NIM</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white max-w-4xl mx-auto leading-[1.12]">
            Turn Your Data <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-500 dark:from-indigo-400 dark:via-blue-300 dark:to-cyan-400">
              Into Answers.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Ask questions in plain English. Analyze data, discover insights, and create visualizations with AI.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
            <button
              onClick={onStartAnalyzing}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm shadow-md shadow-indigo-600/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Start Analyzing
              <ArrowRight size={16} />
            </button>
            <button
              onClick={onExploreDemo}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 font-medium text-sm shadow-sm transition-all"
            >
              <Play size={14} className="text-indigo-500 fill-indigo-500" />
              Explore Demo
            </button>
          </div>

          {/* Interactive UI Mockup Preview */}
          <div className="pt-10 max-w-5xl mx-auto">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-slate-900/90 shadow-2xl overflow-hidden text-left p-1">
              <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-rose-500/80" />
                  <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                  <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                  <span className="text-xs font-mono text-slate-500 ml-2">nova-analyst-session-v1</span>
                </div>
                <div className="text-[11px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  DuckDB Engine Active
                </div>
              </div>

              <div className="p-6 bg-[#0b0f19] space-y-5">
                {/* Simulated User Question */}
                <div className="flex items-start gap-3">
                  <div className="h-7 w-7 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 text-xs font-semibold shrink-0">
                    U
                  </div>
                  <div className="bg-slate-800/80 rounded-2xl rounded-tl-none px-4 py-2.5 text-xs text-slate-200 max-w-xl border border-slate-700/50">
                    Which subscription plan tier has the highest average monthly spend and lowest churn rate?
                  </div>
                </div>

                {/* Simulated AI Agent Analysis Output */}
                <div className="flex items-start gap-3">
                  <div className="h-7 w-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-sm shadow-indigo-500/30">
                    <Bot size={15} />
                  </div>
                  <div className="space-y-3.5 flex-1">
                    <div className="bg-[#111726] rounded-2xl rounded-tl-none p-4 text-xs text-slate-300 border border-slate-800/80 space-y-3">
                      <p className="text-slate-200">
                        Autonomous pipeline: Grounded in your schema, the AI dynamically creates an execution plan, validates read-only DuckDB SQL, computes deterministic statistics, and renders interactive Plotly visualizations.
                      </p>

                      {/* Real Agent Plan & Query Flow */}
                      <div className="rounded-lg bg-slate-950 p-3.5 font-mono text-[11px] text-indigo-300 border border-slate-800/80 space-y-1.5 overflow-x-auto">
                        <div className="text-slate-500">// Step 1: NVIDIA NIM Schema Inspection & Query Planning</div>
                        <div className="text-emerald-400">PLAN: Group by category &bull; Aggregation: SUM(revenue) &bull; Order: DESC &bull; Limit: 5</div>
                        <div className="pt-1 text-slate-500">// Step 2: Vectorized Read-Only DuckDB Execution</div>
                        <div>
                          <span className="text-pink-400">SELECT</span> category, <span className="text-pink-400">SUM</span>(revenue) <span className="text-pink-400">AS</span> total_revenue <br />
                          <span className="text-pink-400">FROM</span> data <span className="text-pink-400">GROUP BY</span> category <span className="text-pink-400">ORDER BY</span> total_revenue <span className="text-pink-400">DESC LIMIT</span> 5;
                        </div>
                      </div>

                      {/* Tool & Engine Pipeline Verification */}
                      <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-[10px]">
                        <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-center text-slate-300">
                          <span className="text-slate-500 block uppercase">Engine</span>
                          <span className="font-bold text-white">DuckDB SQL</span>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-center text-slate-300">
                          <span className="text-slate-500 block uppercase">Validator</span>
                          <span className="font-bold text-emerald-400">AST Read-Only</span>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-center text-slate-300">
                          <span className="text-slate-500 block uppercase">Visualization</span>
                          <span className="font-bold text-indigo-400">Plotly Native</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Section */}
      <section id="features" className="py-16 md:py-24 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#0a0e18]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 font-mono">
              Core Capabilities
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Engineered for Precision Analytics
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Transform complex datasets into actionable intelligence with zero SQL steep learning curves.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-white dark:bg-[#0f1422] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Bot size={20} />
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Natural Language to SQL
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Query multi-million row tables in conversational English. The NVIDIA NIM orchestrator parses intent, writes optimized SQL, and summarizes findings.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-[#0f1422] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
              <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <LineChart size={20} />
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Automated Visualizations
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Receive interactive charts (bar, line, area, distribution) dynamically configured based on your query results with zero manual chart tweaking.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-[#0f1422] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Zap size={20} />
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Instant In-Memory DuckDB
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Vectorized columnar execution ensures complex joins, aggregations, and subqueries run in milliseconds without requiring heavy warehouse infrastructure.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-16 md:py-24 border-t border-slate-200 dark:border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 font-mono">
              Simple Workflow
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              How Nova Analytics Works
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Three streamlined steps from raw files to executive decision-ready insights.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="relative p-6 rounded-2xl bg-slate-50 dark:bg-[#0f1422] border border-slate-200/80 dark:border-slate-800 space-y-3">
              <div className="text-3xl font-extrabold text-indigo-600/30 dark:text-indigo-500/20 font-mono">
                01
              </div>
              <h4 className="text-base font-semibold text-slate-900 dark:text-white">
                Connect or Upload Data
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Drag-and-drop CSV, Excel spreadsheets, Parquet files, or connect directly to your PostgreSQL database.
              </p>
            </div>

            <div className="relative p-6 rounded-2xl bg-slate-50 dark:bg-[#0f1422] border border-slate-200/80 dark:border-slate-800 space-y-3">
              <div className="text-3xl font-extrabold text-indigo-600/30 dark:text-indigo-500/20 font-mono">
                02
              </div>
              <h4 className="text-base font-semibold text-slate-900 dark:text-white">
                Ask Questions in Plain English
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Inquire about trends, anomalies, KPIs, churn rates, or correlations without writing custom code.
              </p>
            </div>

            <div className="relative p-6 rounded-2xl bg-slate-50 dark:bg-[#0f1422] border border-slate-200/80 dark:border-slate-800 space-y-3">
              <div className="text-3xl font-extrabold text-indigo-600/30 dark:text-indigo-500/20 font-mono">
                03
              </div>
              <h4 className="text-base font-semibold text-slate-900 dark:text-white">
                Get Answers & Visualizations
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Receive instant verified answers, generated SQL queries, data tables, and interactive charts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Supported Data Sources Section */}
      <section id="data-sources" className="py-16 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#0a0e18]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-2">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              Supported Data Sources & Connectors
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Universal compatibility with modern data storage formats and relational databases.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="p-4 rounded-xl bg-white dark:bg-[#0f1422] border border-slate-200 dark:border-slate-800 text-center space-y-1.5 shadow-sm">
              <FileSpreadsheet className="mx-auto text-emerald-500" size={24} />
              <div className="text-xs font-semibold text-slate-900 dark:text-white">CSV & Excel</div>
              <div className="text-[10px] text-slate-400">Instant schema parsing</div>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-[#0f1422] border border-slate-200 dark:border-slate-800 text-center space-y-1.5 shadow-sm">
              <Database className="mx-auto text-blue-500" size={24} />
              <div className="text-xs font-semibold text-slate-900 dark:text-white">PostgreSQL</div>
              <div className="text-[10px] text-slate-400">Live connection pool</div>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-[#0f1422] border border-slate-200 dark:border-slate-800 text-center space-y-1.5 shadow-sm">
              <Zap className="mx-auto text-amber-500" size={24} />
              <div className="text-xs font-semibold text-slate-900 dark:text-white">Apache Parquet</div>
              <div className="text-[10px] text-slate-400">High performance column</div>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-[#0f1422] border border-slate-200 dark:border-slate-800 text-center space-y-1.5 shadow-sm">
              <Layers className="mx-auto text-purple-500" size={24} />
              <div className="text-xs font-semibold text-slate-900 dark:text-white">DuckDB</div>
              <div className="text-[10px] text-slate-400">In-memory engine</div>
            </div>
          </div>
        </div>
      </section>

      {/* Technology Stack Section */}
      <section id="technology" className="py-16 border-t border-slate-200 dark:border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-2">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              Enterprise Grade Technology Stack
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Built on production-hardened AI inference and analytical frameworks.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 max-w-3xl mx-auto text-xs font-medium text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
              <Cpu size={14} className="text-indigo-500" />
              NVIDIA NIM API
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
              <Zap size={14} className="text-amber-500" />
              FastAPI & Python
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
              <Database size={14} className="text-blue-500" />
              DuckDB & SQLAlchemy
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
              <Shield size={14} className="text-emerald-500" />
              TypeScript & React
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800/80 py-10 bg-slate-50 dark:bg-[#070b13]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2 font-medium">
            <Bot size={16} className="text-indigo-600 dark:text-indigo-400" />
            <span>Nova Analytics © 2026. Production AI Data Analyst Platform.</span>
          </div>
          <div className="flex items-center gap-6">
            <button onClick={onStartAnalyzing} className="hover:text-indigo-600 dark:hover:text-indigo-400">
              Launch Workspace
            </button>
            <a href="#features" className="hover:text-indigo-600 dark:hover:text-indigo-400">
              Documentation
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
