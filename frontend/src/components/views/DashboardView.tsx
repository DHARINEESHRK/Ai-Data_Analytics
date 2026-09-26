import React, { useState, useEffect } from 'react';
import { 
  Database, 
  BarChart3, 
  Table as TableIcon, 
  Sparkles, 
  UploadCloud, 
  ArrowRight, 
  Clock, 
  CheckCircle2, 
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import type { Dataset, AnalysisHistoryItem } from '../../types/models';
import type { HealthStatus } from '../../types';
import { historyApi } from '../../services/api';

interface DashboardViewProps {
  datasets: Dataset[];
  selectedDataset: Dataset | null;
  onSelectDataset: (dataset: Dataset) => void;
  onNavigate: (tabId: string) => void;
  health: HealthStatus | null;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  datasets,
  selectedDataset,
  onSelectDataset,
  onNavigate,
  health: _health,
}) => {
  const [recentHistory, setRecentHistory] = useState<AnalysisHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    const fetchRecent = async () => {
      try {
        setHistoryLoading(true);
        const res = await historyApi.listHistory({ limit: 5 });
        if (res && res.items) {
          const mapped: AnalysisHistoryItem[] = res.items.map(item => ({
            id: item.id,
            question: item.question,
            datasetId: item.dataset_id,
            datasetName: item.dataset_name,
            timestamp: item.timestamp,
            analysisType: (item.analysis_type as any) || 'Aggregation',
            durationMs: item.duration_ms || 120,
            status: 'completed',
            previewResult: item.direct_answer || item.answer.slice(0, 140)
          }));
          setRecentHistory(mapped);
        }
      } catch {
        setRecentHistory([]);
      } finally {
        setHistoryLoading(false);
      }
    };
    fetchRecent();
  }, []);

  const hasDatasets = datasets.length > 0;
  const activeDs = selectedDataset || (hasDatasets ? datasets[0] : null);

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fadeIn pb-12">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white to-slate-50 dark:from-[#0f1422] dark:to-[#090d16] p-6 md:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/40">
            <Sparkles size={14} />
            Enterprise Analytics Dashboard
          </div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Welcome to AI Data Analyst
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {hasDatasets 
              ? `Your analytical environment is active with ${datasets.length} connected ${datasets.length === 1 ? 'dataset' : 'datasets'}. Ask questions, run deep Python statistical models, or inspect raw schema profiles.`
              : 'No dataset connected yet. Upload a CSV/Excel file or connect PostgreSQL to begin your analysis. Every metric, chart, and insight is strictly computed from your real data.'}
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <button 
              onClick={() => onNavigate('workspace')}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all"
            >
              <Sparkles size={14} />
              Open AI Analyst Workspace
            </button>
            <button 
              onClick={() => onNavigate('datasets')}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-sm transition-all"
            >
              <Database size={14} />
              {hasDatasets ? 'Manage Datasets' : 'Upload Dataset / Connect DB'}
            </button>
          </div>
        </div>
      </div>

      {/* Real Active Dataset Metrics or Clean Empty State */}
      {activeDs ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Active Dataset Overview</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50">
                {activeDs.name}
              </span>
            </div>
            {datasets.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Switch:</span>
                <select
                  value={activeDs.id}
                  onChange={(e) => {
                    const found = datasets.find(d => d.id === e.target.value);
                    if (found) onSelectDataset(found);
                  }}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs rounded-lg px-2.5 py-1 text-slate-700 dark:text-slate-200"
                >
                  {datasets.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.format.toUpperCase()})</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-xl bg-white dark:bg-[#0f1422] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block font-mono">
                Verified Records
              </span>
              <span className="text-2xl font-bold text-slate-900 dark:text-white">
                {activeDs.row_count.toLocaleString()}
              </span>
              <span className="text-[11px] text-slate-500 block">
                Calculated from {activeDs.filename}
              </span>
            </div>

            <div className="p-5 rounded-xl bg-white dark:bg-[#0f1422] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block font-mono">
                Profiled Attributes
              </span>
              <span className="text-2xl font-bold text-slate-900 dark:text-white">
                {activeDs.column_count}
              </span>
              <span className="text-[11px] text-slate-500 block">
                Detected columns
              </span>
            </div>

            <div className="p-5 rounded-xl bg-white dark:bg-[#0f1422] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block font-mono">
                Data Quality Score
              </span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {activeDs.quality?.quality_score ?? 100}%
                </span>
                <ShieldCheck size={20} className="text-indigo-500" />
              </div>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 block font-medium">
                {activeDs.quality?.missing_percentage ?? 0}% missing cells
              </span>
            </div>

            <div className="p-5 rounded-xl bg-white dark:bg-[#0f1422] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block font-mono">
                Storage & Ingestion
              </span>
              <span className="text-2xl font-bold text-slate-900 dark:text-white">
                {activeDs.file_size_formatted || activeDs.file_size || 'In Memory'}
              </span>
              <span className="text-[11px] text-slate-500 block">
                Format: {activeDs.format.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 rounded-2xl bg-white dark:bg-[#0f1422] border border-dashed border-slate-300 dark:border-slate-800 text-center space-y-4">
          <div className="h-16 w-16 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <UploadCloud size={32} />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              No Dataset Connected
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Upload a CSV/Excel dataset or connect a PostgreSQL database. All KPIs and analyses will be computed directly from your uploaded data.
            </p>
          </div>
          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={() => onNavigate('datasets')}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
            >
              <UploadCloud size={14} />
              Upload Dataset
            </button>
            <button
              onClick={() => onNavigate('settings')}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
            >
              <Database size={14} />
              Connect PostgreSQL
            </button>
          </div>
        </div>
      )}

      {/* Grid: Quick Actions & Recent Real Analysis History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Launch Cards */}
        <div className="lg:col-span-1 space-y-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono block">Platform Modules</span>
          
          <button
            onClick={() => onNavigate('workspace')}
            className="w-full text-left p-4 rounded-xl bg-white dark:bg-[#0f1422] hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 shadow-sm transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <Sparkles size={18} />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  AI Analyst Workspace
                </span>
                <span className="text-[11px] text-slate-500">
                  Ask natural language questions & get Plotly charts
                </span>
              </div>
            </div>
            <ArrowRight size={14} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
          </button>

          <button
            onClick={() => onNavigate('explorer')}
            className="w-full text-left p-4 rounded-xl bg-white dark:bg-[#0f1422] hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 shadow-sm transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                <TableIcon size={18} />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  Data Explorer & Profiling
                </span>
                <span className="text-[11px] text-slate-500">
                  Inspect columns, null rates, and preview real rows
                </span>
              </div>
            </div>
            <ArrowRight size={14} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
          </button>

          <button
            onClick={() => onNavigate('analytics')}
            className="w-full text-left p-4 rounded-xl bg-white dark:bg-[#0f1422] hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 shadow-sm transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                <BarChart3 size={18} />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  Python Analytics Engine
                </span>
                <span className="text-[11px] text-slate-500">
                  Descriptive statistics, outliers, & Pearson correlation
                </span>
              </div>
            </div>
            <ArrowRight size={14} className="text-slate-400 group-hover:text-emerald-600 transition-colors" />
          </button>
        </div>

        {/* Real Analysis History */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Recent Real Analyses</span>
            <button
              onClick={() => onNavigate('history')}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
            >
              View Full Audit Log
            </button>
          </div>

          <div className="rounded-xl bg-white dark:bg-[#0f1422] border border-slate-200/80 dark:border-slate-800 shadow-sm divide-y divide-slate-100 dark:divide-slate-800/80 overflow-hidden">
            {historyLoading ? (
              <div className="p-8 text-center space-y-2">
                <RefreshCw size={20} className="mx-auto text-indigo-500 animate-spin" />
                <p className="text-xs text-slate-500">Loading analysis history...</p>
              </div>
            ) : recentHistory.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <Clock size={20} className="mx-auto text-slate-400" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  No analysis history yet
                </p>
                <p className="text-[11px] text-slate-500">
                  Ask a question in the Workspace to run an automated DuckDB/Python analysis and record it here.
                </p>
              </div>
            ) : (
              recentHistory.map((item) => (
                <div key={item.id} className="p-4 hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors flex items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                      "{item.question}"
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                      {item.previewResult}
                    </p>
                    <div className="flex items-center gap-2 pt-1 text-[10px] text-slate-400 font-mono">
                      <span>{item.datasetName}</span>
                      <span>•</span>
                      <span>{item.analysisType}</span>
                      <span>•</span>
                      <span>{item.timestamp}</span>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40 shrink-0">
                    <CheckCircle2 size={11} /> Completed
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
