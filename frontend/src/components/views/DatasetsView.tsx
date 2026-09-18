import { useState } from 'react';
import { 
  Plus, 
  Database, 
  FileSpreadsheet, 
  Calendar, 
  ArrowUpRight, 
  Search
} from 'lucide-react';
import type { Dataset } from '../../types/models';

interface DatasetsViewProps {
  datasets: Dataset[];
  selectedDataset: Dataset | null;
  onSelectDataset: (dataset: Dataset) => void;
  onNavigateToExplorer: () => void;
  onNavigateToWorkspace: () => void;
}

export const DatasetsView: React.FC<DatasetsViewProps> = ({
  datasets,
  selectedDataset,
  onSelectDataset,
  onNavigateToExplorer,
  onNavigateToWorkspace,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredDatasets = datasets.filter(ds => 
    ds.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ds.filename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-[#0f1422] border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Database size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Data Sources & Catalogs
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Manage uploaded CSV, Excel sheets, Parquet stores, and PostgreSQL connections.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search datasets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-8 pr-3 py-2 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <button
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all"
          >
            <Plus size={14} />
            Upload Dataset
          </button>
        </div>
      </div>

      {/* Dataset Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredDatasets.map((dataset) => {
          const isSelected = selectedDataset?.id === dataset.id;
          return (
            <div
              key={dataset.id}
              onClick={() => onSelectDataset(dataset)}
              className={`p-5 rounded-2xl border transition-all cursor-pointer bg-white dark:bg-[#0f1422] ${
                isSelected
                  ? 'border-indigo-600 dark:border-indigo-500 ring-2 ring-indigo-500/20 shadow-md'
                  : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                    <FileSpreadsheet size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {dataset.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                      {dataset.filename}
                    </p>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded text-[10px] uppercase font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {dataset.format}
                </span>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400 mt-3 line-clamp-2">
                {dataset.description}
              </p>

              {/* Dataset metrics summary */}
              <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60">
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Rows</span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white mt-0.5 block">
                    {dataset.row_count.toLocaleString()}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60">
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Columns</span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white mt-0.5 block">
                    {dataset.column_count}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60">
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Size</span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white mt-0.5 block">
                    {dataset.file_size}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                <span className="text-slate-400 text-[11px] flex items-center gap-1">
                  <Calendar size={12} /> {dataset.uploaded_at}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectDataset(dataset);
                      onNavigateToExplorer();
                    }}
                    className="px-2.5 py-1 rounded text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Inspect
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectDataset(dataset);
                      onNavigateToWorkspace();
                    }}
                    className="px-2.5 py-1 rounded text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 flex items-center gap-1"
                  >
                    Analyze <ArrowUpRight size={12} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
