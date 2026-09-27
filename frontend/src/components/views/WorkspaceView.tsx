import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  Database, 
  Copy, 
  Check, 
  Table as TableIcon, 
  ArrowRight, 
  BarChart3, 
  Download, 
  Plus, 
  ChevronRight, 
  TrendingUp, 
  AlertCircle, 
  RotateCcw,
  X,
  FileSpreadsheet,
  HelpCircle,
  Hash,
  Calendar,
  ToggleLeft,
  Type,
  UploadCloud,
  ChevronLeft
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  LineChart as ReLineChart, 
  Line, 
  PieChart as RePieChart, 
  Pie, 
  Cell, 
  AreaChart as ReAreaChart, 
  Area, 
  ScatterChart as ReScatterChart, 
  Scatter, 
  Legend 
} from 'recharts';
import type { Dataset, AnalysisMessage, ColumnType } from '../../types/models';
import { chatApi, datasetsApi } from '../../services/api';

interface WorkspaceViewProps {
  datasets: Dataset[];
  selectedDataset: Dataset | null;
  onSelectDataset: (dataset: Dataset) => void;
  onNavigate: (tabId: string) => void;
  onDatasetUploaded?: (newDataset: Dataset) => void;
}

export const WorkspaceView: React.FC<WorkspaceViewProps> = ({
  datasets,
  selectedDataset,
  onSelectDataset,
  onNavigate,
  onDatasetUploaded,
}) => {
  const [messages, setMessages] = useState<AnalysisMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [currentAgentStep, setCurrentAgentStep] = useState<string>('');
  const [copiedSqlId, setCopiedSqlId] = useState<string | null>(null);
  const [lastFailedQuery, setLastFailedQuery] = useState<string | null>(null);

  // Expandable sections state per message
  const [expandedSupportingData, setExpandedSupportingData] = useState<Record<string, boolean>>({});
  const [expandedCalculation, setExpandedCalculation] = useState<Record<string, boolean>>({});
  const [tablePages, setTablePages] = useState<Record<string, number>>({});

  // Modals for Dataset Header: View Data & Data Overview
  const [showDataOverview, setShowDataOverview] = useState(false);
  const [showViewData, setShowViewData] = useState(false);
  const [previewRows, setPreviewRows] = useState<Record<string, any>[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Upload Progress Experience
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages or thinking updates
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isThinking, currentAgentStep]);

  // Load preview data when View Data modal opens
  useEffect(() => {
    if (showViewData && selectedDataset?.id) {
      const fetchPreview = async () => {
        try {
          setPreviewLoading(true);
          const res = await datasetsApi.getPreview(selectedDataset.id, 50);
          setPreviewRows(res.rows || []);
        } catch {
          setPreviewRows([]);
        } finally {
          setPreviewLoading(false);
        }
      };
      fetchPreview();
    }
  }, [showViewData, selectedDataset?.id]);

  // Dynamic suggested questions grounded strictly in the active dataset schema
  const dynamicSuggestions = useMemo(() => {
    if (!selectedDataset || !selectedDataset.columns || selectedDataset.columns.length === 0) {
      return [
        'What are the top records by value?',
        'Show summary statistics across numerical fields',
        'Find any unusual values or outliers'
      ];
    }

    const cols = selectedDataset.columns;
    const numCols = cols.filter(c => c.column_type === 'numerical').map(c => c.name);
    const catCols = cols.filter(c => c.column_type === 'categorical').map(c => c.name);
    const dateCols = cols.filter(c => c.column_type === 'datetime').map(c => c.name);
    const colNamesLower = cols.map(c => c.name.toLowerCase());

    const list: string[] = [];

    // 1. Detect Student / Academic data
    const isStudentData = colNamesLower.some(c => c.includes('student') || c.includes('grade') || c.includes('score') || c.includes('exam'));
    if (isStudentData) {
      const scoreCol = numCols.find(c => c.toLowerCase().includes('score') || c.toLowerCase().includes('grade')) || numCols[0];
      const subjectCol = catCols.find(c => c.toLowerCase().includes('subject') || c.toLowerCase().includes('course')) || catCols[0];
      if (scoreCol && subjectCol) {
        list.push(`Which ${subjectCol.toLowerCase()} has the highest average?`);
      }
      if (scoreCol) {
        list.push(`Show the ${scoreCol.toLowerCase()} distribution`);
      }
      list.push('Which students scored highest?');
      return list;
    }

    // 2. Detect Time Series (e.g. Sales by Month)
    if (dateCols.length > 0 && numCols.length > 0) {
      const metric = numCols.find(c => ['sales', 'revenue', 'profit', 'amount'].includes(c.toLowerCase())) || numCols[0];
      list.push(`Show monthly ${metric.toLowerCase()}`);
      list.push(`Show yearly ${metric.toLowerCase()} by month`);
    }

    // 3. Category Comparison / Ranking
    if (catCols.length > 0 && numCols.length > 0) {
      const metric = numCols[0];
      const cat = catCols.find(c => ['product', 'region', 'category', 'item'].includes(c.toLowerCase())) || catCols[0];
      list.push(`Which ${cat.toLowerCase()} has the highest ${metric.toLowerCase()}?`);
      list.push(`Which ${cat.toLowerCase()} performs best?`);
    }

    // 4. Numerical Relationship / Scatter
    if (numCols.length >= 2) {
      list.push(`Is ${numCols[0].toLowerCase()} related to ${numCols[1].toLowerCase()}?`);
    }

    // 5. Data Quality fallback
    if (list.length < 4) {
      list.push('What values are missing in this dataset?');
    }

    return list.slice(0, 4);
  }, [selectedDataset]);

  // Upload handler with sequential progress experience
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setUploadError(null);
      setUploadStep('Uploading dataset...');

      const p1 = setTimeout(() => setUploadStep('Reading columns...'), 300);
      const p2 = setTimeout(() => setUploadStep('Profiling data...'), 700);
      const p3 = setTimeout(() => setUploadStep('Checking data quality...'), 1200);
      const p4 = setTimeout(() => setUploadStep('Preparing QueryLens...'), 1700);

      const newDs = await datasetsApi.uploadDataset(file);

      clearTimeout(p1);
      clearTimeout(p2);
      clearTimeout(p3);
      clearTimeout(p4);

      if (onDatasetUploaded) {
        onDatasetUploaded(newDs);
      }
      onSelectDataset(newDs);
      setMessages([]);
    } catch (err: any) {
      setUploadError(err?.response?.data?.error?.message || err?.message || 'Failed to upload dataset.');
    } finally {
      setIsUploading(false);
      setUploadStep('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const query = customPrompt || inputText;
    if (!query.trim() || isThinking) return;

    const userMsg: AnalysisMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      content: query
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setLastFailedQuery(null);
    setIsThinking(true);
    setCurrentAgentStep('Understanding your question...');

    try {
      const history = messages.slice(-4).map(m => ({
        role: m.sender,
        content: m.content
      }));

      // User-friendly loading progression
      const t1 = setTimeout(() => setCurrentAgentStep('Checking your data...'), 400);
      const t2 = setTimeout(() => setCurrentAgentStep('Analyzing...'), 1000);
      const t3 = setTimeout(() => setCurrentAgentStep('Creating visualization...'), 1800);

      const res = await chatApi.sendMessage({
        question: query,
        dataset_id: selectedDataset?.id,
        conversation_history: history
      });

      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);

      const assistantMsg: AnalysisMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        content: res.answer,
        directAnswer: res.direct_answer,
        keyInsight: res.key_insight,
        analysisMethod: res.analysis_method,
        datasetInfo: res.dataset_info,
        steps: res.steps,
        sql: res.sql || undefined,
        explanation: res.answer,
        chart: res.chart ? {
          type: res.chart.type || 'bar',
          xAxisKey: res.chart.xAxisKey || res.chart.xKey || undefined,
          yAxisKey: res.chart.yAxisKey || res.chart.yKey || undefined,
          groupKey: res.chart.groupKey,
          seriesKeys: res.chart.seriesKeys,
          xLabel: res.chart.xLabel,
          yLabel: res.chart.yLabel,
          kpiValue: res.chart.kpiValue,
          kpiLabel: res.chart.kpiLabel,
          title: res.chart.title || 'Analysis Chart',
          data: res.chart.data || []
        } : undefined,
        tableData: res.table_data ? {
          columns: res.table_data.columns,
          rows: res.table_data.rows
        } : undefined,
        dataUsed: res.data_used ? {
          columns: res.data_used.columns || [],
          filters: res.data_used.filters || [],
          grouping: res.data_used.grouping,
          aggregation: res.data_used.aggregation
        } : undefined
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      setLastFailedQuery(query);
      const errMsg: AnalysisMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        content: `I couldn't complete this analysis. Reason: ${err?.response?.data?.error?.message || err?.message || 'Server error.'}`
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsThinking(false);
      setCurrentAgentStep('');
    }
  };

  const copySql = (id: string, sql: string) => {
    navigator.clipboard.writeText(sql);
    setCopiedSqlId(id);
    setTimeout(() => setCopiedSqlId(null), 2000);
  };

  const exportTableCsv = (filename: string, tableData: { columns: string[]; rows: any[] }) => {
    if (!tableData || !tableData.rows || tableData.rows.length === 0) return;
    const headers = tableData.columns.join(',');
    const rows = tableData.rows.map(r => tableData.columns.map(c => `"${String(r[c] ?? '').replace(/"/g, '""')}"`).join(','));
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filename || 'analysis_results'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getTypeBadge = (type: ColumnType | string) => {
    switch (type) {
      case 'numerical':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/40">
            <Hash size={11} /> Number
          </span>
        );
      case 'categorical':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200/60 dark:border-purple-800/40">
            <BarChart3 size={11} /> Text
          </span>
        );
      case 'datetime':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40">
            <Calendar size={11} /> Date
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
            <Type size={11} /> Text
          </span>
        );
    }
  };

  const COLORS = ['#4f46e5', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

  return (
    <div className="flex flex-col h-[calc(100vh-6.5rem)] max-w-5xl mx-auto w-full px-2 sm:px-4 py-2 animate-fadeIn overflow-hidden">
      
      {/* Hidden File Input for Direct Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".csv,.xlsx,.xls,.parquet"
        className="hidden"
      />

      {/* ============================================================== */}
      {/* 1. TOP HEADER: CURRENT DATASET & CONTROLS                     */}
      {/* ============================================================== */}
      {selectedDataset ? (
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-[#0f1422] border border-slate-200/90 dark:border-slate-800 shadow-xs shrink-0 mb-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-xs">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold tracking-widest uppercase text-indigo-600 dark:text-indigo-400">
                  QueryLens
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Connected
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-xs sm:max-w-md">
                  {selectedDataset.filename || selectedDataset.name}
                </h2>
                <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                  {selectedDataset.row_count.toLocaleString()} rows · {selectedDataset.column_count} columns
                </span>
              </div>
            </div>
          </div>

          {/* Dataset Action Buttons */}
          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={() => setShowViewData(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-200/80 dark:border-slate-700"
            >
              <TableIcon size={13} />
              View Data
            </button>
            <button
              onClick={() => setShowDataOverview(true)}
              className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-indigo-200/60 dark:border-indigo-800/60"
            >
              <Sparkles size={13} />
              Data Overview
            </button>

            {/* Quick Switcher dropdown if multiple datasets */}
            {datasets.length > 1 && (
              <select
                value={selectedDataset.id}
                onChange={(e) => {
                  const ds = datasets.find(d => d.id === e.target.value);
                  if (ds) {
                    onSelectDataset(ds);
                    setMessages([]);
                  }
                }}
                className="px-2 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                {datasets.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Upload another dataset"
            >
              <Plus size={16} />
            </button>
          </div>
        </header>
      ) : null}

      {/* ============================================================== */}
      {/* 2. MAIN BODY: EMPTY STATE vs WORKSPACE STREAM                  */}
      {/* ============================================================== */}
      {!selectedDataset ? (
        /* EMPTY STATE: Section 3 */
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 sm:p-10 rounded-2xl bg-white dark:bg-[#0f1422] border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-6">
          <div className="h-16 w-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-md shadow-indigo-500/10">
            <Database size={32} />
          </div>
          <div className="space-y-2 max-w-md">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Connect your data to get started.
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Upload a CSV, Excel or Parquet file, or connect PostgreSQL. Every metric, chart, and insight will be computed directly from your real data.
            </p>
          </div>

          {/* Upload Dropzone */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="w-full max-w-md p-6 rounded-2xl border-2 border-dashed border-indigo-200 dark:border-indigo-900/60 hover:border-indigo-400 dark:hover:border-indigo-600 bg-slate-50/50 dark:bg-slate-900/30 cursor-pointer transition-all flex flex-col items-center gap-2 group"
          >
            <UploadCloud size={28} className="text-indigo-500 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Drag & drop file here, or click to browse
            </span>
            <span className="text-[11px] text-slate-400">
              Supports .csv, .xlsx, .xls, .parquet
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-all"
            >
              <UploadCloud size={14} />
              Upload Data
            </button>
            <button
              onClick={() => onNavigate('settings')}
              className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-2 border border-slate-200 dark:border-slate-700 transition-all"
            >
              <Database size={14} />
              Connect PostgreSQL
            </button>
          </div>

          {uploadError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}
        </div>
      ) : (
        /* ACTIVE WORKSPACE: Stream of Q&A + Suggestion Starter */
        <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-[#0f1422] rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden">
          
          {/* Scrollable Chat Area */}
          <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            
            {/* When no questions asked yet: Show Starter Box */}
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto py-8 space-y-5">
                <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
                  <Sparkles size={24} />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Ask anything about your data
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    QueryLens understands normal business English and computes verified answers directly from <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedDataset.name}</span>.
                  </p>
                </div>

                {/* Suggested Questions Grid: Section 11 */}
                <div className="w-full space-y-2 pt-2 text-left">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block font-mono">
                    Suggested questions for this dataset:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {dynamicSuggestions.map((prompt, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(prompt)}
                        className="text-left p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40 border border-slate-200/70 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all flex items-center justify-between group shadow-2xs"
                      >
                        <span className="truncate pr-2">{prompt}</span>
                        <ArrowRight size={12} className="text-slate-400 group-hover:text-indigo-500 shrink-0 transition-transform group-hover:translate-x-0.5" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Message History / Analysis Results */
              messages.map((msg) => (
                <div key={msg.id} className="space-y-4">
                  {msg.sender === 'user' ? (
                    /* User Question Pill */
                    <div className="flex items-start justify-end gap-2.5">
                      <div className="bg-indigo-600 text-white rounded-2xl rounded-tr-none px-4 py-2.5 text-xs max-w-xl shadow-xs leading-relaxed font-medium">
                        {msg.content}
                      </div>
                      <div className="h-7 w-7 rounded-lg bg-indigo-700 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                        U
                      </div>
                    </div>
                  ) : (
                    /* ============================================================== */
                    /* QUERYLENS ANALYSIS RESULT CARD: Section 6                      */
                    /* ============================================================== */
                    <div className="flex items-start gap-3">
                      <div className="h-7 w-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-xs shadow-indigo-500/20">
                        <Bot size={15} />
                      </div>
                      <div className="flex-1 space-y-4 max-w-4xl min-w-0">
                        <div className="p-4 sm:p-5 rounded-2xl rounded-tl-none bg-slate-50 dark:bg-slate-900/70 border border-slate-200/90 dark:border-slate-800 space-y-4 shadow-xs">
                          
                          {/* 1. YOUR QUESTION & ANSWER */}
                          <div className="space-y-2">
                            {/* Answer Header */}
                            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-mono">
                              <Sparkles size={12} />
                              Answer
                            </div>
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-white leading-relaxed">
                              {msg.directAnswer || msg.content}
                            </h3>
                          </div>

                          {/* 2. REAL INTERACTIVE VISUALIZATION */}
                          {msg.chart && (
                            <div className="p-4 rounded-xl bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
                              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2">
                                <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                  {msg.chart.title}
                                </h4>
                                {msg.chart.type === 'kpi' && (
                                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 font-semibold border border-indigo-200/50 dark:border-indigo-800/50">
                                    KPI
                                  </span>
                                )}
                              </div>

                              {/* Visualization Body */}
                              <div className="h-64 w-full pt-2">
                                <ResponsiveContainer width="100%" height="100%">
                                  {msg.chart.type === 'kpi' ? (
                                    <div className="flex flex-col items-center justify-center h-full p-6 bg-gradient-to-br from-indigo-50/50 via-purple-50/30 to-slate-50 dark:from-indigo-950/20 dark:via-purple-950/10 dark:to-slate-900/40 rounded-xl border border-indigo-100 dark:border-indigo-900/40 text-center">
                                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                                        {msg.chart.kpiLabel || msg.chart.title}
                                      </span>
                                      <span className="text-4xl font-extrabold text-indigo-600 dark:text-indigo-400 font-mono tracking-tight">
                                        {typeof msg.chart.kpiValue === 'number'
                                          ? (msg.chart.kpiValue >= 1000 ? msg.chart.kpiValue.toLocaleString(undefined, { maximumFractionDigits: 2 }) : msg.chart.kpiValue)
                                          : (msg.chart.kpiValue || (msg.chart.data[0] ? Object.values(msg.chart.data[0])[0] : 'N/A'))}
                                      </span>
                                      <span className="text-[11px] text-slate-400 mt-2 font-medium">
                                        Empirical value verified from {selectedDataset?.name}
                                      </span>
                                    </div>
                                  ) : msg.chart.type === 'line' ? (
                                    <ReLineChart data={msg.chart.data}>
                                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                                      <XAxis dataKey={msg.chart.xAxisKey || 'month'} tick={{ fontSize: 11 }} />
                                      <YAxis tick={{ fontSize: 11 }} />
                                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', fontSize: '11px', borderRadius: '8px' }} />
                                      {msg.chart.seriesKeys && msg.chart.seriesKeys.length > 0 ? (
                                        <>
                                          <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                                          {msg.chart.seriesKeys.map((sKey, sIdx) => (
                                            <Line
                                              key={sKey}
                                              type="monotone"
                                              dataKey={sKey}
                                              name={sKey}
                                              stroke={COLORS[sIdx % COLORS.length]}
                                              strokeWidth={2.5}
                                              dot={{ r: 3 }}
                                            />
                                          ))}
                                        </>
                                      ) : (
                                        <Line type="monotone" dataKey={msg.chart.yAxisKey || 'value'} stroke="#4f46e5" strokeWidth={2.5} dot={{ r: 3 }} />
                                      )}
                                    </ReLineChart>
                                  ) : msg.chart.type === 'area' ? (
                                    <ReAreaChart data={msg.chart.data}>
                                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                                      <XAxis dataKey={msg.chart.xAxisKey || 'x'} tick={{ fontSize: 11 }} />
                                      <YAxis tick={{ fontSize: 11 }} />
                                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', fontSize: '11px', borderRadius: '8px' }} />
                                      <Area type="monotone" dataKey={msg.chart.yAxisKey || 'value'} stroke="#4f46e5" fill="#6366f1" fillOpacity={0.25} />
                                    </ReAreaChart>
                                  ) : msg.chart.type === 'pie' ? (
                                    <RePieChart>
                                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', fontSize: '11px', borderRadius: '8px' }} />
                                      <Pie data={msg.chart.data} dataKey={msg.chart.yAxisKey || 'value'} nameKey={msg.chart.xAxisKey || 'name'} cx="50%" cy="50%" innerRadius={50} outerRadius={80} fill="#6366f1">
                                        {msg.chart.data.map((_, index) => (
                                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                      </Pie>
                                    </RePieChart>
                                  ) : msg.chart.type === 'scatter' ? (
                                    <ReScatterChart>
                                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                                      <XAxis dataKey={msg.chart.xAxisKey || 'x'} type="number" tick={{ fontSize: 11 }} name={msg.chart.xAxisKey || 'x'} />
                                      <YAxis dataKey={msg.chart.yAxisKey || 'y'} type="number" tick={{ fontSize: 11 }} name={msg.chart.yAxisKey || 'y'} />
                                      <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', fontSize: '11px', borderRadius: '8px' }} />
                                      <Scatter data={msg.chart.data} fill="#8b5cf6" />
                                    </ReScatterChart>
                                  ) : (
                                    <BarChart data={msg.chart.data}>
                                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                                      <XAxis dataKey={msg.chart.xAxisKey || 'x'} tick={{ fontSize: 11 }} />
                                      <YAxis tick={{ fontSize: 11 }} />
                                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', fontSize: '11px', borderRadius: '8px' }} />
                                      <Bar dataKey={msg.chart.yAxisKey || 'value'} fill="#4f46e5" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                  )}
                                </ResponsiveContainer>
                              </div>
                            </div>
                          )}

                          {/* 3. KEY INSIGHT */}
                          {msg.keyInsight && (
                            <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/50 shadow-xs">
                              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-1">
                                <TrendingUp size={13} />
                                Key Insight
                              </div>
                              <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                                {msg.keyInsight}
                              </p>
                            </div>
                          )}

                          {/* 4. DATA USED: Section 7 */}
                          {msg.dataUsed && (
                            <div className="p-3 rounded-xl bg-white dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 space-y-2">
                              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 font-mono">
                                Data Used
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-xs">
                                <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400 font-medium">
                                  <span>Columns:</span>
                                  {msg.dataUsed.columns.length > 0 ? (
                                    msg.dataUsed.columns.map((c, cIdx) => (
                                      <span key={cIdx} className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono text-[11px] border border-slate-200/70 dark:border-slate-700">
                                        {c}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-slate-400">All fields</span>
                                  )}
                                </div>

                                {msg.dataUsed.grouping && (
                                  <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400 font-medium">
                                    <span>• Grouping:</span>
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">{msg.dataUsed.grouping}</span>
                                  </div>
                                )}

                                {msg.dataUsed.aggregation && (
                                  <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400 font-medium">
                                    <span>• Aggregation:</span>
                                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">{msg.dataUsed.aggregation}</span>
                                  </div>
                                )}

                                <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400 font-medium">
                                  <span>• Filters:</span>
                                  <span className="text-slate-500">
                                    {msg.dataUsed.filters && msg.dataUsed.filters.length > 0 ? msg.dataUsed.filters.join(', ') : 'None'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 5. EXPANDABLE: VIEW SUPPORTING DATA (Section 8) & HOW WAS THIS CALCULATED (Section 9) */}
                          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200/70 dark:border-slate-800/80">
                            {msg.tableData && (
                              <button
                                onClick={() => setExpandedSupportingData(p => ({ ...p, [msg.id]: !p[msg.id] }))}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
                                  expandedSupportingData[msg.id]
                                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800'
                                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                              >
                                <TableIcon size={12} />
                                {expandedSupportingData[msg.id] ? 'Hide supporting data' : 'View supporting data'}
                                <span className="text-[10px] text-slate-400">({msg.tableData.rows.length} rows)</span>
                              </button>
                            )}

                            <button
                              onClick={() => setExpandedCalculation(p => ({ ...p, [msg.id]: !p[msg.id] }))}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
                                expandedCalculation[msg.id]
                                  ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 border-purple-300 dark:border-purple-800'
                                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                            >
                              <HelpCircle size={12} />
                              {expandedCalculation[msg.id] ? 'Hide calculation details' : 'How was this calculated?'}
                            </button>
                          </div>

                          {/* SUPPORTING DATA DRAWER */}
                          {expandedSupportingData[msg.id] && msg.tableData && (
                            <div className="p-3.5 rounded-xl bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 space-y-3 animate-fadeIn">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                  Supporting Result Rows
                                </span>
                                <button
                                  onClick={() => exportTableCsv(msg.chart?.title || 'supporting_data', msg.tableData!)}
                                  className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-1 border border-slate-200 dark:border-slate-700"
                                >
                                  <Download size={11} />
                                  Download CSV
                                </button>
                              </div>

                              <div className="overflow-x-auto max-h-56 rounded-lg border border-slate-200/80 dark:border-slate-800">
                                <table className="w-full text-left text-xs border-collapse">
                                  <thead className="sticky top-0 bg-slate-100 dark:bg-slate-900 z-10">
                                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                                      {msg.tableData.columns.map((col, cIdx) => (
                                        <th key={cIdx} className="py-1.5 px-3 font-semibold font-mono text-[11px] capitalize">
                                          {col.replace('_', ' ')}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-[11px]">
                                    {msg.tableData.rows
                                      .slice((tablePages[msg.id] || 0) * 10, ((tablePages[msg.id] || 0) + 1) * 10)
                                      .map((row, rIdx) => (
                                        <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                          {msg.tableData!.columns.map((col, cIdx) => (
                                            <td key={cIdx} className="py-1.5 px-3 text-slate-700 dark:text-slate-300">
                                              {typeof row[col] === 'number'
                                                ? (row[col] >= 1000 ? row[col].toLocaleString() : row[col])
                                                : String(row[col] ?? '')}
                                            </td>
                                          ))}
                                        </tr>
                                      ))}
                                  </tbody>
                                </table>
                              </div>

                              {/* Pagination */}
                              {msg.tableData.rows.length > 10 && (
                                <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                                  <span>
                                    Showing {((tablePages[msg.id] || 0) * 10) + 1} - {Math.min(((tablePages[msg.id] || 0) + 1) * 10, msg.tableData.rows.length)} of {msg.tableData.rows.length} rows
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <button
                                      disabled={(tablePages[msg.id] || 0) === 0}
                                      onClick={() => setTablePages(p => ({ ...p, [msg.id]: (p[msg.id] || 0) - 1 }))}
                                      className="p-1 rounded border border-slate-200 dark:border-slate-800 disabled:opacity-30"
                                    >
                                      <ChevronLeft size={13} />
                                    </button>
                                    <button
                                      disabled={((tablePages[msg.id] || 0) + 1) * 10 >= msg.tableData.rows.length}
                                      onClick={() => setTablePages(p => ({ ...p, [msg.id]: (p[msg.id] || 0) + 1 }))}
                                      className="p-1 rounded border border-slate-200 dark:border-slate-800 disabled:opacity-30"
                                    >
                                      <ChevronRight size={13} />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* CALCULATION DETAILS DRAWER */}
                          {expandedCalculation[msg.id] && (
                            <div className="p-3.5 rounded-xl bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 space-y-2.5 animate-fadeIn">
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                                Technical Calculation Transparency
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Analysis Method</span>
                                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                                    {msg.analysisMethod || 'SQL Aggregation'}
                                  </span>
                                </div>
                                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Columns Used</span>
                                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                                    {msg.dataUsed?.columns.join(', ') || 'All'}
                                  </span>
                                </div>
                              </div>

                              {msg.sql && (
                                <div className="space-y-1 pt-1">
                                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                                    <span>Executed DuckDB Query:</span>
                                    <button
                                      onClick={() => copySql(msg.id, msg.sql!)}
                                      className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 text-[11px]"
                                    >
                                      {copiedSqlId === msg.id ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                                      Copy SQL
                                    </button>
                                  </div>
                                  <pre className="p-3 rounded-lg bg-slate-950 font-mono text-xs text-indigo-300 overflow-x-auto border border-slate-800">
                                    {msg.sql}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}

                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}

            {/* AI Analysis Loading Stepper: Section 5 */}
            {isThinking && (
              <div className="flex items-start gap-3 animate-fadeIn">
                <div className="h-7 w-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-xs animate-pulse">
                  <Bot size={15} />
                </div>
                <div className="p-4 rounded-2xl rounded-tl-none bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 space-y-3 w-full max-w-md">
                  <div className="flex items-center gap-3">
                    <span className="h-2 w-2 rounded-full bg-indigo-500 animate-ping shrink-0" />
                    <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                      {currentAgentStep || 'Analyzing...'}
                    </span>
                  </div>
                  <div className="space-y-1.5 pt-1">
                    <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full w-4/5 animate-pulse" />
                    <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full w-3/5 animate-pulse" />
                  </div>
                </div>
              </div>
            )}

            {/* Error Recovery Banner: Section 14 */}
            {lastFailedQuery && !isThinking && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-center justify-between text-xs text-rose-800 dark:text-rose-300">
                <div className="flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0 text-rose-600" />
                  <span>I couldn't complete this analysis. Please try rephrasing your question.</span>
                </div>
                <button
                  onClick={() => handleSendMessage(lastFailedQuery)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs transition-colors"
                >
                  <RotateCcw size={12} />
                  Retry
                </button>
              </div>
            )}
          </div>

          {/* ============================================================== */}
          {/* 3. BOTTOM INPUT: ASK QUERYLENS / FOLLOW-UP CHAT               */}
          {/* ============================================================== */}
          <div className="p-3 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0c101c] shrink-0">
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/80 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-1.5 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={isThinking}
                placeholder={messages.length === 0 ? "What would you like to know?" : "Ask a follow-up about this data..."}
                className="flex-1 bg-transparent px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none font-medium"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim() || isThinking}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all shrink-0"
              >
                <span>{messages.length === 0 ? 'Ask QueryLens' : 'Ask'}</span>
                <Send size={12} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: DATA OVERVIEW (Section 2)                             */}
      {/* ============================================================== */}
      {showDataOverview && selectedDataset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-[#0f1422] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Data Overview: {selectedDataset.name}
                </h3>
              </div>
              <button
                onClick={() => setShowDataOverview(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              
              {/* Dataset Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Rows</span>
                  <span className="text-lg font-bold text-slate-900 dark:text-white font-mono">
                    {selectedDataset.row_count.toLocaleString()}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Columns</span>
                  <span className="text-lg font-bold text-slate-900 dark:text-white font-mono">
                    {selectedDataset.column_count}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Data Quality</span>
                  <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    {selectedDataset.quality?.quality_score ?? 100}%
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Missing Cells</span>
                  <span className="text-lg font-bold text-slate-900 dark:text-white font-mono">
                    {selectedDataset.quality?.missing_cells?.toLocaleString() ?? 0}
                  </span>
                </div>
              </div>

              {/* Columns Inventory Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider font-mono">
                  Columns & Profiles
                </h4>
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 font-mono text-[11px]">
                      <tr className="border-b border-slate-200 dark:border-slate-800">
                        <th className="py-2 px-3 font-semibold">Column</th>
                        <th className="py-2 px-3 font-semibold">Type</th>
                        <th className="py-2 px-3 font-semibold">Missing</th>
                        <th className="py-2 px-3 font-semibold">Missing %</th>
                        <th className="py-2 px-3 font-semibold">Unique</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-[11px]">
                      {selectedDataset.columns.map((col, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                          <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">
                            {col.name}
                          </td>
                          <td className="py-2 px-3">
                            {getTypeBadge(col.column_type)}
                          </td>
                          <td className="py-2 px-3 text-slate-600 dark:text-slate-400">
                            {col.null_count.toLocaleString()}
                          </td>
                          <td className="py-2 px-3 text-slate-600 dark:text-slate-400">
                            {col.null_percentage}%
                          </td>
                          <td className="py-2 px-3 text-slate-600 dark:text-slate-400">
                            {col.unique_count.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: VIEW LIVE DATA TABLE                                 */}
      {/* ============================================================== */}
      {showViewData && selectedDataset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-[#0f1422] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <TableIcon size={18} className="text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Live Data: {selectedDataset.name} (First 50 Rows)
                </h3>
              </div>
              <button
                onClick={() => setShowViewData(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4">
              {previewLoading ? (
                <div className="h-48 flex items-center justify-center text-xs text-slate-400">
                  Loading dataset preview...
                </div>
              ) : previewRows.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-xs text-slate-400">
                  No preview records available.
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-slate-100 dark:bg-slate-900">
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-mono text-[11px]">
                      {Object.keys(previewRows[0] || {}).map((col, idx) => (
                        <th key={idx} className="py-2 px-3 font-semibold">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-[11px]">
                    {previewRows.map((r, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        {Object.keys(previewRows[0] || {}).map((col, cIdx) => (
                          <td key={cIdx} className="py-1.5 px-3 text-slate-700 dark:text-slate-300">
                            {String(r[col] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: UPLOAD IN-PROGRESS EXPERIENCE (Section 4)             */}
      {/* ============================================================== */}
      {isUploading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-[#0f1422] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 max-w-sm w-full text-center space-y-4">
            <div className="h-12 w-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mx-auto animate-bounce">
              <UploadCloud size={24} />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Processing Dataset
              </h4>
              <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 font-mono">
                {uploadStep || 'Uploading dataset...'}
              </p>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div className="bg-indigo-600 h-full w-3/4 animate-pulse rounded-full" />
            </div>
            <span className="text-[11px] text-slate-400 block">
              Profiling columns, data quality, and schema...
            </span>
          </div>
        </div>
      )}

    </div>
  );
};
