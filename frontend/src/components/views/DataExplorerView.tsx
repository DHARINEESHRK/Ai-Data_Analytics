import React, { useState } from 'react';
import { 
  Database, 
  Hash, 
  Calendar, 
  ToggleLeft, 
  Type, 
  ChevronDown, 
  Search, 
  CheckCircle2
} from 'lucide-react';
import type { Dataset, DatasetColumn } from '../../types/models';

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
  const [activeTab, setActiveTab] = useState<'preview' | 'schema' | 'stats'>('preview');
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedColumnForStats, setSelectedColumnForStats] = useState<DatasetColumn | null>(
    selectedDataset?.columns[2] || null
  );

  const getDtypeIcon = (dtype: string) => {
    switch (dtype) {
      case 'integer':
      case 'float':
        return <Hash size={13} className="text-blue-500" />;
      case 'datetime':
        return <Calendar size={13} className="text-amber-500" />;
      case 'boolean':
        return <ToggleLeft size={13} className="text-purple-500" />;
      default:
        return <Type size={13} className="text-slate-400" />;
    }
  };

  const filteredPreviewRows = selectedDataset?.preview_rows.filter(row => {
    if (!searchFilter) return true;
    return Object.values(row).some(val => 
      String(val).toLowerCase().includes(searchFilter.toLowerCase())
    );
  }) || [];

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* Top Header & Dataset Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-[#0f1422] border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Database size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {selectedDataset?.name}
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] uppercase font-mono font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/40">
                {selectedDataset?.format}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {selectedDataset?.description}
            </p>
          </div>
        </div>

        {/* Dataset Switcher Dropdown */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={selectedDataset?.id}
              onChange={(e) => {
                const ds = datasets.find(d => d.id === e.target.value);
                if (ds) {
                  onSelectDataset(ds);
                  setSelectedColumnForStats(ds.columns[0] || null);
                }
              }}
              aria-label="Select active dataset for explorer"
              className="appearance-none bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-2 pl-3 pr-8 text-xs font-medium text-slate-800 dark:text-slate-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {datasets.map(ds => (
                <option key={ds.id} value={ds.id}>{ds.name}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-2.5 text-slate-400 pointer-events-none" />
          </div>

          <button
            onClick={onNavigateToWorkspace}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all"
          >
            Analyze in Workspace
          </button>
        </div>
      </div>

      {/* Metric Overview Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-[#0f1422] border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Total Records
          </span>
          <span className="text-xl font-bold text-slate-900 dark:text-white mt-1 block">
            {selectedDataset?.row_count.toLocaleString()}
          </span>
          <span className="text-[10px] text-emerald-500 flex items-center gap-1 mt-1">
            <CheckCircle2 size={11} /> 100% indexed
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[#0f1422] border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Total Attributes
          </span>
          <span className="text-xl font-bold text-slate-900 dark:text-white mt-1 block">
            {selectedDataset?.column_count} columns
          </span>
          <span className="text-[10px] text-slate-400 mt-1 block">
            Typed schema inferred
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[#0f1422] border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Missing / Null Values
          </span>
          <span className="text-xl font-bold text-slate-900 dark:text-white mt-1 block">
            {selectedDataset?.columns.reduce((acc, c) => acc + c.null_count, 0)}
          </span>
          <span className="text-[10px] text-emerald-500 mt-1 block">
            &lt; 0.2% sparsity
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[#0f1422] border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            File Size / Storage
          </span>
          <span className="text-xl font-bold text-slate-900 dark:text-white mt-1 block">
            {selectedDataset?.file_size}
          </span>
          <span className="text-[10px] text-slate-400 mt-1 block">
            Vectorized DuckDB cached
          </span>
        </div>
      </div>

      {/* Main Tabs Container */}
      <div className="rounded-2xl bg-white dark:bg-[#0f1422] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Navigation Bar inside Explorer */}
        <div className="flex flex-wrap items-center justify-between border-b border-slate-200 dark:border-slate-800 px-4 py-3 bg-slate-50/50 dark:bg-slate-900/30 gap-3">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'preview'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Dataset Preview
            </button>
            <button
              onClick={() => setActiveTab('schema')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'schema'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Schema & Types
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'stats'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Column Statistics
            </button>
          </div>

          {activeTab === 'preview' && (
            <div className="relative flex items-center">
              <Search size={13} className="absolute left-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search rows..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="bg-white dark:bg-[#111726] border border-slate-200 dark:border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          )}
        </div>

        {/* Tab 1: Dataset Preview Table */}
        {activeTab === 'preview' && (
          <div className="p-4 overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                  <th className="py-2.5 px-3 text-slate-400 font-mono text-[10px]">#</th>
                  {selectedDataset?.columns.map((col, idx) => (
                    <th key={idx} className="py-2.5 px-3 font-semibold text-slate-700 dark:text-slate-300">
                      <div className="flex items-center gap-1.5">
                        {getDtypeIcon(col.dtype)}
                        <span className="font-mono text-[11px]">{col.name}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-[11px]">
                {filteredPreviewRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 text-slate-400">{rIdx + 1}</td>
                    {selectedDataset?.columns.map((col, cIdx) => (
                      <td key={cIdx} className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                        {String(row[col.name])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Schema & Types Table */}
        {activeTab === 'schema' && (
          <div className="p-4 overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400">
                  <th className="py-2.5 px-4 font-semibold">Column Name</th>
                  <th className="py-2.5 px-4 font-semibold">Inferred Type</th>
                  <th className="py-2.5 px-4 font-semibold">Unique Values</th>
                  <th className="py-2.5 px-4 font-semibold">Null Count</th>
                  <th className="py-2.5 px-4 font-semibold">Sample Values</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-[11px]">
                {selectedDataset?.columns.map((col, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                      {col.name}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {getDtypeIcon(col.dtype)}
                        {col.dtype}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                      {col.unique_count.toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className={col.null_count > 0 ? 'text-amber-500 font-semibold' : 'text-slate-400'}>
                        {col.null_count}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                      {col.sample_values.join(', ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Column Statistics */}
        {activeTab === 'stats' && (
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                Select Column to Inspect:
              </span>
              <div className="space-y-1">
                {selectedDataset?.columns.map((col, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedColumnForStats(col)}
                    className={`w-full text-left p-2.5 rounded-lg text-xs font-medium transition-all flex items-center justify-between ${
                      selectedColumnForStats?.name === col.name
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {getDtypeIcon(col.dtype)}
                      <span className="font-mono">{col.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-400">{col.dtype}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="md:col-span-2 space-y-4">
              {selectedColumnForStats?.stats ? (
                <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                        {selectedColumnForStats.name}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Statistical profile generated by DuckDB descriptive engine
                      </p>
                    </div>
                    <span className="px-2 py-1 rounded bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 text-xs font-mono">
                      Numeric Distribution
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-3 bg-white dark:bg-[#0b0f19] rounded-lg border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-mono block">Minimum</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                        {selectedColumnForStats.stats.min}
                      </span>
                    </div>
                    <div className="p-3 bg-white dark:bg-[#0b0f19] rounded-lg border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-mono block">Maximum</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                        {selectedColumnForStats.stats.max}
                      </span>
                    </div>
                    <div className="p-3 bg-white dark:bg-[#0b0f19] rounded-lg border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-mono block">Mean (Average)</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                        {selectedColumnForStats.stats.mean}
                      </span>
                    </div>
                    <div className="p-3 bg-white dark:bg-[#0b0f19] rounded-lg border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-mono block">Median</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                        {selectedColumnForStats.stats.median}
                      </span>
                    </div>
                    <div className="p-3 bg-white dark:bg-[#0b0f19] rounded-lg border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-mono block">Std Deviation</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                        {selectedColumnForStats.stats.std}
                      </span>
                    </div>
                    <div className="p-3 bg-white dark:bg-[#0b0f19] rounded-lg border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-mono block">Distinct Count</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                        {selectedColumnForStats.unique_count}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
                  This column has categorical/string format. Distinct values count: {selectedColumnForStats?.unique_count}.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
