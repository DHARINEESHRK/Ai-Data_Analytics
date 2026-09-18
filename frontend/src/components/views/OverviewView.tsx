import { 
  Database, 
  Cpu, 
  Layers, 
  Activity, 
  Server, 
  CheckCircle2, 
  Clock, 
  ArrowUpRight,
  AlertCircle
} from 'lucide-react';
import type { HealthStatus } from '../../types';

interface OverviewViewProps {
  health: HealthStatus | null;
  healthLoading: boolean;
  healthError: string | null;
  onNavigate: (tabId: string) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  health,
  healthLoading,
  healthError,
  onNavigate,
}) => {
  const stats = [
    {
      title: 'Backend Status',
      value: healthLoading ? 'Checking...' : health?.status === 'healthy' ? 'Operational' : 'Unreachable',
      status: health?.status === 'healthy' ? 'good' : 'bad',
      icon: Server,
      desc: health?.app_name || 'FastAPI Analytics Engine',
    },
    {
      title: 'AI Engine (NVIDIA NIM)',
      value: health?.environment.nim_configured ? 'Ready' : 'API Key Pending',
      status: health?.environment.nim_configured ? 'good' : 'warning',
      icon: Cpu,
      desc: health?.environment.nim_model || 'meta/llama-3.1-70b-instruct',
    },
    {
      title: 'Query Engine',
      value: 'DuckDB + Pandas',
      status: 'good',
      icon: Activity,
      desc: 'In-memory Vectorized Execution',
    },
    {
      title: 'Storage Pipeline',
      value: health?.environment.storage_ready ? 'Initialized' : 'Creating...',
      status: 'good',
      icon: Database,
      desc: 'Local & Parquet File Storage',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn">
      {/* Welcome Hero Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white to-slate-50 dark:from-[#111726] dark:to-[#0c101c] p-6 md:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/40">
            <Layers size={14} />
            Phase 1 Foundation Live
          </div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            AI Data Analyst Platform
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Enterprise analytics workspace powered by NVIDIA NIM, DuckDB, and interactive visualization pipelines. Connect datasets, explore schemas, and perform automated conversational analysis.
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <button 
              onClick={() => onNavigate('datasets')}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all"
            >
              <Database size={14} />
              Connect Data Sources
            </button>
            <button 
              onClick={() => onNavigate('analyst')}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-sm transition-all"
            >
              Open AI Analyst Workspace
              <ArrowUpRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {healthError && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 flex items-center gap-3 text-xs text-rose-700 dark:text-rose-300">
          <AlertCircle size={16} className="shrink-0" />
          <span>Backend connection warning: {healthError}. Please start the FastAPI backend on port 8000.</span>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div 
              key={i}
              className="p-5 rounded-xl bg-white dark:bg-[#0f1422] border border-slate-200/70 dark:border-slate-800/80 shadow-sm flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{stat.title}</span>
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300">
                  <Icon size={16} />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${
                    stat.status === 'good' ? 'bg-emerald-500' : stat.status === 'warning' ? 'bg-amber-400' : 'bg-rose-500'
                  }`} />
                  <span className="text-lg font-semibold text-slate-900 dark:text-white">
                    {stat.value}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{stat.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Architecture & Capabilities Roadmap Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-xl bg-white dark:bg-[#0f1422] border border-slate-200/70 dark:border-slate-800/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 size={16} className="text-indigo-600 dark:text-indigo-400" />
              Engine Architecture & Capabilities
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">FastAPI + TS</span>
          </div>

          <ul className="space-y-3 text-xs text-slate-600 dark:text-slate-400">
            <li className="flex items-start gap-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
              <div>
                <strong className="text-slate-800 dark:text-slate-200">Dual Query Engine:</strong> DuckDB vectorized SQL execution for files (CSV/Excel/Parquet) & PostgreSQL connection pooling.
              </div>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
              <div>
                <strong className="text-slate-800 dark:text-slate-200">NVIDIA NIM Agent:</strong> Structured tool calling with schema inspection, query generation, self-correction, and insight summarization.
              </div>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
              <div>
                <strong className="text-slate-800 dark:text-slate-200">Interactive Visualizations:</strong> Dynamically generated Plotly charts with configurable aggregations and theme synchronization.
              </div>
            </li>
          </ul>
        </div>

        <div className="p-6 rounded-xl bg-white dark:bg-[#0f1422] border border-slate-200/70 dark:border-slate-800/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock size={16} className="text-indigo-600 dark:text-indigo-400" />
              Roadmap Progress
            </h3>
            <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">Phase 1 Complete</span>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-slate-700 dark:text-slate-300">Phase 1: Architecture & Foundation</span>
                <span className="text-emerald-600 dark:text-emerald-400">100%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full w-full" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-slate-700 dark:text-slate-300">Phase 2: Ingestion & Schema Profiling</span>
                <span className="text-slate-400">Next Up</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full w-0" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-slate-700 dark:text-slate-300">Phase 3: SQL & Python Sandbox</span>
                <span className="text-slate-400">Upcoming</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full w-0" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
