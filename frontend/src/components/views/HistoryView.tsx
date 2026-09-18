import { useState } from 'react';
import { 
  History, 
  Search, 
  Database, 
  ArrowUpRight, 
  Trash2,
  Calendar
} from 'lucide-react';
import type { AnalysisHistoryItem } from '../../types/models';
import { MOCK_HISTORY_ITEMS } from '../../mock/data';

interface HistoryViewProps {
  onRerunAnalysis: (item: AnalysisHistoryItem) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ onRerunAnalysis }) => {
  const [historyItems, setHistoryItems] = useState<AnalysisHistoryItem[]>(MOCK_HISTORY_ITEMS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('All');

  const filteredItems = historyItems.filter(item => {
    const matchesSearch = item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.datasetName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedTypeFilter === 'All' || item.analysisType === selectedTypeFilter;
    return matchesSearch && matchesType;
  });

  const handleDelete = (id: string) => {
    setHistoryItems(prev => prev.filter(i => i.id !== id));
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-[#0f1422] border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <History size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Analysis History & Audit Log
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Review prior questions, executed SQL summaries, and analytical outcomes.
            </p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search history..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-8 pr-3 py-2 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <select
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
            aria-label="Filter analysis by type"
            className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="All">All Types</option>
            <option value="Aggregation">Aggregation</option>
            <option value="Trend Analysis">Trend Analysis</option>
            <option value="Correlation">Correlation</option>
            <option value="Anomaly Detection">Anomaly Detection</option>
          </select>
        </div>
      </div>

      {/* History Items List */}
      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#0f1422] border border-slate-200 dark:border-slate-800 text-xs text-slate-400">
            No analysis history records match your search query.
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-xl bg-white dark:bg-[#0f1422] border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-indigo-500/50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/40">
                    {item.analysisType}
                  </span>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                    <Database size={12} className="text-slate-400" />
                    <span>{item.datasetName}</span>
                  </div>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Calendar size={12} />
                    <span>{item.timestamp}</span>
                  </div>
                </div>

                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  "{item.question}"
                </h3>

                <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Summary: </span>
                  {item.previewResult}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0">
                <button
                  onClick={() => onRerunAnalysis(item)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors"
                >
                  <ArrowUpRight size={14} />
                  Open in Workspace
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  aria-label="Delete analysis history item"
                  className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                  title="Remove from history"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
