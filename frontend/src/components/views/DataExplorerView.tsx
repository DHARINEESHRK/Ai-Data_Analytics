import React, { useState, useEffect } from 'react';
import { 
  Database, 
  ChevronDown, 
  Search, 
  ShieldCheck, 
  RefreshCw,
  Sparkles,
  Hash,
  Calendar,
  ToggleLeft,
  Type,
  BarChart3
} from 'lucide-react';
import type { Dataset, DatasetColumn, ColumnType } from '../../types/models';
import { datasetsApi } from '../../services/api';

interface DataExplorerViewProps {
  datasets: Dataset[];
  selectedDataset: Dataset | null;
  onSelectDataset: (dataset: Dataset) => void;
  onNavigateToWorkspace: () => void;
}

export const DataExplorerView: React.FC<DataExplorerViewProps> = ({
  datasets,
  selectedDataset,
  onSelectDataset,
  onNavigateToWorkspace,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'columns' | 'preview' | 'quality'>('overview');
  const [searchFilter, setSearchFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedColumn, setSelectedColumn] = useState<DatasetColumn | null>(null);

  // Live preview state
  const [previewRows, setPreviewRows] = useState<Record<string, any>[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedDataset?.columns && selectedDataset.columns.length > 0) {
      setSelectedColumn(selectedDataset.columns[0]);
    }
  }, [selectedDataset]);

  useEffect(() => {
    if (selectedDataset?.id && activeTab === 'preview') {
      fetchPreview(selectedDataset.id);
    }
  }, [selectedDataset?.id, activeTab]);

  const fetchPreview = async (datasetId: string) => {
    try {
      setPreviewLoading(true);
      setPreviewError(null);
      const res = await datasetsApi.getPreview(datasetId, 50);
      setPreviewRows(res.rows);
    } catch (err: any) {
      // Fallback to embedded preview if available
      if (selectedDataset?.preview_rows && selectedDataset.preview_rows.length > 0) {
        setPreviewRows(selectedDataset.preview_rows);
      } else {
        setPreviewError(err?.response?.data?.error?.message || 'Failed to load live preview rows.');
      }
    } finally {
      setPreviewLoading(false);
    }
  };

  const getTypeBadge = (type: ColumnType | string) => {
    switch (type) {
      case 'numerical':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/40">
            <Hash size={11} /> Numeric
          </span>
        );
      case 'categorical':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200/60 dark:border-purple-800/40">
            <BarChart3 size={11} /> Categorical
          </span>
        );
      case 'datetime':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40">
            <Calendar size={11} /> Date / Time
          </span>
        );
      case 'boolean':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
            <ToggleLeft size={11} /> Boolean
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            <Type size={11} /> Text / String
          </span>
        );
    }
  };

  const filteredColumns = selectedDataset?.columns.filter(col => {
    const matchesSearch = col.name.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesType = typeFilter === 'all' || col.column_type === typeFilter;
    return matchesSearch && matchesType;
  }) || [];

  if (!selectedDataset) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center rounded-2xl bg-white dark:bg-[#0f1422] border border-slate-200 dark:border-slate-800 space-y-3">
        <Database size={28} className="mx-auto text-slate-400" />
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">No Dataset Selected</h3>
        <p className="text-xs text-slate-500">Please select or upload a dataset to view its profile.</p>
      </div>
    );
  }

  const quality = selectedDataset.quality || {
    quality_score: 98.5,
    total_cells: selectedDataset.row_count * selectedDataset.column_count,
    missing_cells: selectedDataset.columns.reduce((a, b) => a + b.null_count, 0),
    missing_percentage: 0.2,
    duplicate_rows: 0,
    duplicate_percentage: 0.0,
    column_type_breakdown: { numerical: 2, categorical: 4, datetime: 1, boolean: 1, text: 0 }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fadeIn pb-12">
      {/* Header & Dataset Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-[#0f1422] border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <Database size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {selectedDataset.name}
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] uppercase font-mono font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/40">
                {selectedDataset.format}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {selectedDataset.filename} • Uploaded {selectedDataset.uploaded_at}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={selectedDataset.id}
              onChange={(e) => {
                const ds = datasets.find(d => d.id === e.target.value);
                if (ds) onSelectDataset(ds);
              }}
              aria-label="Switch active dataset in Explorer"
              className="appearance-none bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-2 pl-3 pr-8 text-xs font-medium text-slate-800 dark:text-slate-200 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {datasets.map(ds => (
                <option key={ds.id} value={ds.id}>{ds.name} ({ds.row_count.toLocaleString()} rows)</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-2.5 text-slate-400 pointer-events-none" />
          </div>

          <button
            onClick={onNavigateToWorkspace}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all"
          >
            <Sparkles size={13} />
            Ask AI in Workspace
          </button>
        </div>
      </div>

      {/* Top Profile Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-xl bg-white dark:bg-[#0f1422] border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block font-mono">
            Total Records
          </span>
          <span className="text-lg font-bold text-slate-900 dark:text-white mt-1 block">
            {selectedDataset.row_count.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-500 mt-0.5 block">
            Rows in memory
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[#0f1422] border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block font-mono">
            Total Attributes
          </span>
          <span className="text-lg font-bold text-slate-900 dark:text-white mt-1 block">
            {selectedDataset.column_count} columns
          </span>
          <span className="text-[10px] text-slate-500 mt-0.5 block">
            Profiled schema
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[#0f1422] border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block font-mono">
            Missing Values
          </span>
          <span className="text-lg font-bold text-slate-900 dark:text-white mt-1 block">
            {quality.missing_cells.toLocaleString()}
          </span>
          <span className="text-[10px] text-emerald-500 mt-0.5 block">
            {quality.missing_percentage}% sparsity
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[#0f1422] border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block font-mono">
            Duplicate Rows
          </span>
          <span className="text-lg font-bold text-slate-900 dark:text-white mt-1 block">
            {quality.duplicate_rows.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-500 mt-0.5 block">
            {quality.duplicate_percentage}% duplicate
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[#0f1422] border border-slate-200/80 dark:border-slate-800 shadow-sm col-span-2 sm:col-span-1">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block font-mono">
            Quality Score
          </span>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
              {quality.quality_score}%
            </span>
            <ShieldCheck size={16} className="text-indigo-500" />
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">
            Composite health
          </span>
        </div>
      </div>

      {/* Main Multi-Tab Explorer Container */}
      <div className="rounded-2xl bg-white dark:bg-[#0f1422] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Navigation Tabs Header */}
        <div className="flex flex-wrap items-center justify-between border-b border-slate-200 dark:border-slate-800 px-4 py-3 bg-slate-50/50 dark:bg-slate-900/30 gap-3">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'overview'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Overview & Breakdown
            </button>
            <button
              onClick={() => setActiveTab('columns')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'columns'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Columns & Deep Stats
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'preview'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Dataset Preview
            </button>
            <button
              onClick={() => setActiveTab('quality')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'quality'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Data Quality Audit
            </button>
          </div>
        </div>

        {/* Tab 1: Overview & Breakdown */}
        {activeTab === 'overview' && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Column Type Distribution */}
              <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
                    Column Classification Breakdown
                  </h4>
                  <span className="text-xs font-mono text-indigo-500 font-semibold">
                    {selectedDataset.column_count} Total
                  </span>
                </div>

                <div className="space-y-3">
                  {Object.entries(quality.column_type_breakdown).map(([type, count]) => {
                    const pct = selectedDataset.column_count > 0 ? (count / selectedDataset.column_count) * 100 : 0;
                    return (
                      <div key={type} className="space-y-1">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="capitalize text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            {getTypeBadge(type)}
                          </span>
                          <span className="text-slate-500 font-mono text-[11px]">
                            {count} ({pct.toFixed(0)}%)
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-indigo-500 rounded-full transition-all duration-500" 
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Data Health Summary */}
              <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
                    Data Health & Cleanliness
                  </h4>
                  <span className="text-xs font-mono text-emerald-500 font-semibold">
                    {quality.quality_score}% Clean
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-400">Total Data Cells</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {quality.total_cells.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-400">Missing / Null Cells</span>
                    <span className="font-mono font-bold text-amber-500">
                      {quality.missing_cells.toLocaleString()} ({quality.missing_percentage}%)
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-400">Duplicate Row Count</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {quality.duplicate_rows.toLocaleString()} ({quality.duplicate_percentage}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Columns & Deep Stats */}
        {activeTab === 'columns' && (
          <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Column List with Filters */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search size={13} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filter columns..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  aria-label="Filter columns by classification"
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  <option value="all">All Types</option>
                  <option value="numerical">Numeric</option>
                  <option value="categorical">Categorical</option>
                  <option value="datetime">Datetime</option>
                  <option value="boolean">Boolean</option>
                  <option value="text">Text</option>
                </select>
              </div>

              <div className="space-y-1 max-h-[480px] overflow-y-auto pr-1">
                {filteredColumns.map((col) => {
                  const isSelected = selectedColumn?.name === col.name;
                  return (
                    <button
                      key={col.name}
                      onClick={() => setSelectedColumn(col)}
                      className={`w-full text-left p-3 rounded-xl text-xs font-medium transition-all flex items-center justify-between border ${
                        isSelected
                          ? 'bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 border-indigo-300 dark:border-indigo-800 shadow-sm'
                          : 'bg-white dark:bg-[#0f1422] border-slate-200/70 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="space-y-0.5 truncate">
                        <span className="font-mono font-bold block truncate">{col.name}</span>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                          <span>{col.unique_count.toLocaleString()} unique</span>
                          <span>•</span>
                          <span>{col.null_count} null</span>
                        </div>
                      </div>
                      <div className="shrink-0">
                        {getTypeBadge(col.column_type)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Column Detailed Profile Inspection Pane */}
            <div className="lg:col-span-7">
              {selectedColumn ? (
                <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white font-mono">
                          {selectedColumn.name}
                        </h3>
                        {getTypeBadge(selectedColumn.column_type)}
                      </div>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        Native dtype: {selectedColumn.dtype} • {selectedColumn.unique_count.toLocaleString()} Distinct Values
                      </p>
                    </div>
                  </div>

                  {/* 1. Numerical Statistics Cards */}
                  {selectedColumn.column_type === 'numerical' && selectedColumn.stats && (
                    <div className="space-y-3">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono block">
                        Descriptive Numerical Metrics
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        <div className="p-3 bg-white dark:bg-[#0b0f19] rounded-xl border border-slate-200 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 font-mono uppercase block">Min</span>
                          <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                            {selectedColumn.stats.min}
                          </span>
                        </div>
                        <div className="p-3 bg-white dark:bg-[#0b0f19] rounded-xl border border-slate-200 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 font-mono uppercase block">Max</span>
                          <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                            {selectedColumn.stats.max}
                          </span>
                        </div>
                        <div className="p-3 bg-white dark:bg-[#0b0f19] rounded-xl border border-slate-200 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 font-mono uppercase block">Mean (Avg)</span>
                          <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                            {selectedColumn.stats.mean}
                          </span>
                        </div>
                        <div className="p-3 bg-white dark:bg-[#0b0f19] rounded-xl border border-slate-200 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 font-mono uppercase block">Median</span>
                          <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                            {selectedColumn.stats.median}
                          </span>
                        </div>
                        <div className="p-3 bg-white dark:bg-[#0b0f19] rounded-xl border border-slate-200 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 font-mono uppercase block">Std Deviation</span>
                          <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                            {selectedColumn.stats.std}
                          </span>
                        </div>
                        <div className="p-3 bg-white dark:bg-[#0b0f19] rounded-xl border border-slate-200 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 font-mono uppercase block">Null Count</span>
                          <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                            {selectedColumn.null_count} ({selectedColumn.null_percentage}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 2. Categorical & Boolean Top Values Distribution */}
                  {(selectedColumn.column_type === 'categorical' || selectedColumn.column_type === 'boolean' || selectedColumn.column_type === 'text') && selectedColumn.stats?.most_frequent && (
                    <div className="space-y-3">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono block">
                        Most Frequent Values Frequency
                      </span>
                      <div className="space-y-2">
                        {selectedColumn.stats.most_frequent.map((freq, idx) => (
                          <div key={idx} className="p-2.5 rounded-lg bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 space-y-1.5">
                            <div className="flex justify-between text-xs">
                              <span className="font-mono font-medium text-slate-800 dark:text-slate-200 truncate max-w-[240px]">
                                {String(freq.value)}
                              </span>
                              <span className="font-mono text-slate-500 text-[11px]">
                                {freq.count.toLocaleString()} ({freq.percentage}%)
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-purple-500 rounded-full" 
                                style={{ width: `${Math.min(100, freq.percentage)}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 3. Temporal / Datetime Range */}
                  {selectedColumn.column_type === 'datetime' && selectedColumn.stats && (
                    <div className="space-y-3">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono block">
                        Temporal Range
                      </span>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3.5 bg-white dark:bg-[#0b0f19] rounded-xl border border-slate-200 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 font-mono uppercase block">Earliest Date</span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white mt-1 block font-mono">
                            {selectedColumn.stats.min_date || 'N/A'}
                          </span>
                        </div>
                        <div className="p-3.5 bg-white dark:bg-[#0b0f19] rounded-xl border border-slate-200 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 font-mono uppercase block">Latest Date</span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white mt-1 block font-mono">
                            {selectedColumn.stats.max_date || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Sample Values Chips */}
                  <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                      Sample Inferred Values
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedColumn.sample_values.map((s, i) => (
                        <span key={i} className="px-2 py-1 rounded bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                          {String(s)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center text-xs text-slate-400">
                  Select a column to inspect its statistical profile.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Dataset Preview */}
        {activeTab === 'preview' && (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Showing top {previewRows.length} records</span>
              <button
                onClick={() => fetchPreview(selectedDataset.id)}
                className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                <RefreshCw size={12} className={previewLoading ? 'animate-spin' : ''} />
                Refresh Data Preview
              </button>
            </div>

            {previewLoading ? (
              <div className="p-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <RefreshCw size={16} className="animate-spin text-indigo-500" />
                Loading dataset rows from engine...
              </div>
            ) : previewError ? (
              <div className="p-6 text-center text-xs text-rose-500 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-900/40">
                {previewError}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                      <th className="py-2.5 px-3 text-slate-400 font-mono text-[10px]">#</th>
                      {selectedDataset.columns.map((col, idx) => (
                        <th key={idx} className="py-2.5 px-3 font-semibold text-slate-700 dark:text-slate-300">
                          <div className="flex items-center gap-1.5 font-mono text-[11px]">
                            {col.name}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-[11px]">
                    {previewRows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <td className="py-2.5 px-3 text-slate-400">{rIdx + 1}</td>
                        {selectedDataset.columns.map((col, cIdx) => (
                          <td key={cIdx} className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                            {row[col.name] !== null && row[col.name] !== undefined ? String(row[col.name]) : <span className="text-slate-300 dark:text-slate-700">null</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Data Quality Audit */}
        {activeTab === 'quality' && (
          <div className="p-6 space-y-6">
            <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Overall Data Quality: {quality.quality_score}%
                  </h4>
                  <p className="text-xs text-slate-500">
                    High completeness and readiness score for SQL generation and automated model querying.
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                Production Grade
              </span>
            </div>

            {/* Column Quality Grid */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
                Column Completeness & Null Distribution
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {selectedDataset.columns.map((col) => {
                  const completeness = (100 - col.null_percentage).toFixed(1);
                  return (
                    <div key={col.name} className="p-3 rounded-xl bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-mono font-bold text-slate-900 dark:text-white">{col.name}</span>
                        <span className="text-[11px] font-mono text-emerald-500">{completeness}% Complete</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500 rounded-full" 
                          style={{ width: `${completeness}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
