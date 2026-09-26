import React, { useState } from 'react';
import { 
  Activity, 
  AlertTriangle, 
  ArrowRight, 
  RefreshCw,
  Database,
  CheckCircle2
} from 'lucide-react';
import type { Dataset } from '../../types/models';
import { pythonAnalyticsApi, type PythonAnalyticsResponse } from '../../services/api';

interface AnalyticsViewProps {
  datasets: Dataset[];
  selectedDataset: Dataset | null;
  onSelectDataset: (dataset: Dataset) => void;
  onNavigateToWorkspace: () => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  datasets,
  selectedDataset,
  onSelectDataset,
  onNavigateToWorkspace,
}) => {
  const [activeTab, setActiveTab] = useState<'stats' | 'correlation' | 'outliers' | 'aggregation'>('stats');

  // Operation parameters
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [targetColumn, setTargetColumn] = useState<string>('');
  const [groupByColumn, setGroupByColumn] = useState<string>('');
  const [aggFunc, setAggFunc] = useState<'sum' | 'mean' | 'count' | 'min' | 'max'>('mean');

  // Execution state
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PythonAnalyticsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const numCols = selectedDataset?.columns.filter(c => c.column_type === 'numerical').map(c => c.name) || [];
  const catCols = selectedDataset?.columns.filter(c => c.column_type === 'categorical').map(c => c.name) || [];

  // Default selection when dataset changes
  React.useEffect(() => {
    if (numCols.length > 0) {
      setSelectedColumn(numCols[0]);
      if (numCols.length > 1) {
        setTargetColumn(numCols[1]);
      }
    }
    if (catCols.length > 0) {
      setGroupByColumn(catCols[0]);
    }
    setResult(null);
    setError(null);
  }, [selectedDataset?.id]);

  const runAnalysis = async () => {
    if (!selectedDataset) return;
    setLoading(true);
    setError(null);

    try {
      let res: PythonAnalyticsResponse;

      if (activeTab === 'stats') {
        res = await pythonAnalyticsApi.execute({
          dataset_id: selectedDataset.id,
          operation: 'descriptive_statistics',
          columns: selectedColumn ? [selectedColumn] : numCols
        });
      } else if (activeTab === 'correlation') {
        if (!selectedColumn || !targetColumn) {
          throw new Error('Please select two numerical columns to compute Pearson correlation.');
        }
        res = await pythonAnalyticsApi.execute({
          dataset_id: selectedDataset.id,
          operation: 'correlation',
          x_column: selectedColumn,
          y_column: targetColumn
        });
      } else if (activeTab === 'outliers') {
        if (!selectedColumn) throw new Error('Please select a numerical column to detect outliers.');
        res = await pythonAnalyticsApi.execute({
          dataset_id: selectedDataset.id,
          operation: 'outlier_detection',
          column: selectedColumn,
          method: 'iqr'
        } as any);
      } else {
        if (!groupByColumn || !selectedColumn) {
          throw new Error('Please choose a categorical group column and a numerical metric column.');
        }
        res = await pythonAnalyticsApi.execute({
          dataset_id: selectedDataset.id,
          operation: 'group_aggregation',
          group_by_column: groupByColumn,
          metric_column: selectedColumn,
          aggregation_func: aggFunc
        });
      }

      setResult(res);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err.message || 'Execution error');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  if (!selectedDataset) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center rounded-2xl bg-white dark:bg-[#0f1422] border border-slate-200 dark:border-slate-800 space-y-3">
        <Database size={28} className="mx-auto text-slate-400" />
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">No Dataset Connected</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Please upload a dataset or select an active source to execute Python statistical routines.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fadeIn pb-12">
      {/* Header & Dataset Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-[#0f1422] border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Activity size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Controlled Python Analytics Engine
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Execute Pandas, NumPy, and SciPy statistical algorithms on verified dataset records.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedDataset.id}
            onChange={(e) => {
              const ds = datasets.find(d => d.id === e.target.value);
              if (ds) onSelectDataset(ds);
            }}
            className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200"
          >
            {datasets.map(d => (
              <option key={d.id} value={d.id}>{d.name} ({d.row_count.toLocaleString()} rows)</option>
            ))}
          </select>

          <button
            onClick={onNavigateToWorkspace}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
          >
            Ask AI Analyst
            <ArrowRight size={13} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => { setActiveTab('stats'); setResult(null); }}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'stats'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Descriptive Statistics
        </button>
        <button
          onClick={() => { setActiveTab('correlation'); setResult(null); }}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'correlation'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Pearson Correlation
        </button>
        <button
          onClick={() => { setActiveTab('outliers'); setResult(null); }}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'outliers'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          IQR Outlier Detection
        </button>
        <button
          onClick={() => { setActiveTab('aggregation'); setResult(null); }}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'aggregation'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Group Aggregation
        </button>
      </div>

      {/* Parameters Panel */}
      <div className="p-5 rounded-2xl bg-white dark:bg-[#0f1422] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono block">
          Configured Parameters
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {activeTab === 'stats' && (
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Target Numeric Column</label>
              <select
                value={selectedColumn}
                onChange={(e) => setSelectedColumn(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-800 dark:text-slate-200"
              >
                {numCols.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}

          {activeTab === 'correlation' && (
            <>
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">X Variable (Numeric)</label>
                <select
                  value={selectedColumn}
                  onChange={(e) => setSelectedColumn(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-800 dark:text-slate-200"
                >
                  {numCols.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Y Variable (Numeric)</label>
                <select
                  value={targetColumn}
                  onChange={(e) => setTargetColumn(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-800 dark:text-slate-200"
                >
                  {numCols.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </>
          )}

          {activeTab === 'outliers' && (
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Numeric Column</label>
              <select
                value={selectedColumn}
                onChange={(e) => setSelectedColumn(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-800 dark:text-slate-200"
              >
                {numCols.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}

          {activeTab === 'aggregation' && (
            <>
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Group By (Categorical)</label>
                <select
                  value={groupByColumn}
                  onChange={(e) => setGroupByColumn(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-800 dark:text-slate-200"
                >
                  {catCols.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Aggregate Metric</label>
                <select
                  value={selectedColumn}
                  onChange={(e) => setSelectedColumn(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-800 dark:text-slate-200"
                >
                  {numCols.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Function</label>
                <select
                  value={aggFunc}
                  onChange={(e: any) => setAggFunc(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-800 dark:text-slate-200"
                >
                  <option value="mean">Mean (Average)</option>
                  <option value="sum">Sum</option>
                  <option value="count">Count</option>
                  <option value="min">Min</option>
                  <option value="max">Max</option>
                </select>
              </div>
            </>
          )}
        </div>

        <div className="pt-2">
          <button
            onClick={runAnalysis}
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm transition-all disabled:opacity-50"
          >
            {loading ? <RefreshCw size={14} className="animate-spin" /> : <Activity size={14} />}
            {loading ? 'Computing Python Statistics...' : 'Execute Analysis'}
          </button>
        </div>
      </div>

      {/* Execution Results */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center gap-3 text-xs text-rose-700 dark:text-rose-300">
          <AlertTriangle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {result && result.success && (
        <div className="p-6 rounded-2xl bg-white dark:bg-[#0f1422] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Execution Result ({result.execution_time_ms} ms)
              </h3>
            </div>
            <span className="text-xs font-mono text-indigo-500 dark:text-indigo-400">
              {result.operation}
            </span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
            {result.summary}
          </p>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800 overflow-x-auto">
            <pre className="text-xs font-mono text-slate-800 dark:text-slate-200">
              {JSON.stringify(result.results, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
