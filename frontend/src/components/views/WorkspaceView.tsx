import { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  Database, 
  Copy, 
  Check, 
  Table as TableIcon,
  RefreshCw,
  ArrowRight,
  Terminal,
  BarChart3,
  Activity,
  Download,
  Plus,
  SlidersHorizontal,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  RotateCcw
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
  Cell
} from 'recharts';
import type { Dataset, AnalysisMessage } from '../../types/models';
import { chatApi } from '../../services/api';
import { MOCK_ANALYSIS_MESSAGES } from '../../mock/data';

interface WorkspaceViewProps {
  datasets: Dataset[];
  selectedDataset: Dataset | null;
  onSelectDataset: (dataset: Dataset) => void;
  onNavigate: (tabId: string) => void;
}

export const WorkspaceView: React.FC<WorkspaceViewProps> = ({
  datasets,
  selectedDataset,
  onSelectDataset,
  onNavigate,
}) => {
  const [messages, setMessages] = useState<AnalysisMessage[]>(MOCK_ANALYSIS_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [currentAgentStep, setCurrentAgentStep] = useState<string>('');
  const [copiedSqlId, setCopiedSqlId] = useState<string | null>(null);
  const [lastFailedQuery, setLastFailedQuery] = useState<string | null>(null);
  const [activeTabByMsg, setActiveTabByMsg] = useState<Record<string, 'chart' | 'table' | 'sql'>>({
    'msg-2': 'chart'
  });
  const [showInsightPanel, setShowInsightPanel] = useState(true);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages or thinking updates
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isThinking, currentAgentStep]);

  // Dynamic suggested questions grounded in the actual dataset schema
  const dynamicSuggestions = useMemo(() => {
    if (!selectedDataset || !selectedDataset.columns || selectedDataset.columns.length === 0) {
      return [
        'What are the top 5 records by value?',
        'Show summary statistics across numerical fields',
        'Find any unusual values or outliers'
      ];
    }

    const numCols = selectedDataset.columns.filter(c => c.column_type === 'numerical').map(c => c.name);
    const catCols = selectedDataset.columns.filter(c => c.column_type === 'categorical').map(c => c.name);
    const dateCols = selectedDataset.columns.filter(c => c.column_type === 'datetime').map(c => c.name);

    const list: string[] = [];
    if (catCols.length > 0 && numCols.length > 0) {
      list.push(`Show total ${numCols[0]} by ${catCols[0]}`);
      list.push(`Which ${catCols[0]} performs best by ${numCols[0]}?`);
    }
    if (dateCols.length > 0 && numCols.length > 0) {
      list.push(`Show monthly ${numCols[0]} over time`);
    }
    if (numCols.length >= 2) {
      list.push(`Is there a correlation between ${numCols[0]} and ${numCols[1]}?`);
    }
    if (numCols.length > 0) {
      list.push(`Find unusual values and outliers in ${numCols[0]}`);
    }

    list.push('Summarize dataset health and missing values');
    return list.slice(0, 4);
  }, [selectedDataset]);

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
    setCurrentAgentStep('Understanding analytical intent...');

    try {
      const history = messages.slice(-4).map(m => ({
        role: m.sender,
        content: m.content
      }));

      // Stepper progression for UI
      const t1 = setTimeout(() => setCurrentAgentStep('Inspecting schema & selecting tools...'), 500);
      const t2 = setTimeout(() => setCurrentAgentStep('Executing DuckDB SQL / Python analytics...'), 1200);

      const res = await chatApi.sendMessage({
        question: query,
        dataset_id: selectedDataset?.id,
        conversation_history: history
      });

      clearTimeout(t1);
      clearTimeout(t2);

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
          type: (res.chart.type as any) || 'bar',
          xAxisKey: res.chart.xAxisKey || res.chart.xKey || 'x',
          yAxisKey: res.chart.yAxisKey || res.chart.yKey || 'y',
          title: res.chart.title || 'Analysis Chart',
          data: res.chart.data || []
        } : undefined,
        tableData: res.table_data ? {
          columns: res.table_data.columns,
          rows: res.table_data.rows
        } : undefined
      };

      setMessages(prev => [...prev, assistantMsg]);
      if (res.chart) {
        setActiveTabByMsg(prev => ({ ...prev, [assistantMsg.id]: 'chart' }));
      } else if (res.table_data) {
        setActiveTabByMsg(prev => ({ ...prev, [assistantMsg.id]: 'table' }));
      }
    } catch (err: any) {
      setLastFailedQuery(query);
      const errMsg: AnalysisMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        content: `Error during analytical inference: ${err?.response?.data?.error?.message || err?.message || 'Server error.'}`
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

  const latestAssistantMsg = useMemo(() => {
    return [...messages].reverse().find(m => m.sender === 'assistant' && (m.keyInsight || m.directAnswer));
  }, [messages]);

  const COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

  return (
    <div className="flex h-[calc(100vh-6.5rem)] gap-4 animate-fadeIn max-w-[1700px] mx-auto overflow-hidden">
      
      {/* 1. LEFT PANEL: Datasets & Quick Navigation */}
      <div className="hidden lg:flex flex-col w-64 shrink-0 rounded-2xl bg-white dark:bg-[#0f1422] border border-slate-200 dark:border-slate-800 shadow-sm p-4 overflow-hidden">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Database size={16} className="text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">Data Sources</span>
          </div>
          <button 
            onClick={() => onNavigate('datasets')}
            className="p-1 rounded-md text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            title="Add or upload new dataset"
          >
            <Plus size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-3 space-y-2">
          {datasets.map(ds => {
            const isSelected = ds.id === selectedDataset?.id;
            return (
              <button
                key={ds.id}
                onClick={() => onSelectDataset(ds)}
                className={`w-full text-left p-3 rounded-xl transition-all border ${
                  isSelected 
                    ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800/80 shadow-xs' 
                    : 'bg-slate-50/50 dark:bg-slate-900/30 border-transparent hover:bg-slate-100/70 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold truncate ${isSelected ? 'text-indigo-900 dark:text-indigo-200' : 'text-slate-800 dark:text-slate-200'}`}>
                    {ds.name}
                  </span>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700">
                    {ds.format}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-2 font-mono">
                  <span>{ds.row_count.toLocaleString()} rows</span>
                  <span>•</span>
                  <span>{ds.column_count} cols</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Quick Explorer Button */}
        <button
          onClick={() => onNavigate('explorer')}
          className="w-full py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-between transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <TableIcon size={14} /> Data Explorer
          </span>
          <ChevronRight size={14} />
        </button>
      </div>

      {/* 2. CENTER PANEL: AI Conversation & Analysis Results */}
      <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#0f1422] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        
        {/* Top Workspace Header Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0c101c] shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Bot size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white">Active Source:</span>
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200/50 dark:border-indigo-800/50">
                  {selectedDataset?.name || 'No Dataset Selected'}
                </span>
              </div>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                {selectedDataset ? `${selectedDataset.row_count.toLocaleString()} rows • ${selectedDataset.column_count} columns` : 'Upload or select a dataset'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowInsightPanel(!showInsightPanel)}
              className={`p-1.5 rounded-lg text-xs font-medium border transition-colors hidden xl:flex items-center gap-1.5 ${
                showInsightPanel 
                  ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
              title="Toggle Right Context & Insights Panel"
            >
              <SlidersHorizontal size={14} />
              <span className="text-[11px]">Insights Panel</span>
            </button>
            <button
              onClick={() => setMessages([])}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              title="New Analysis (Clear workspace)"
            >
              <RefreshCw size={15} />
            </button>
          </div>
        </div>

        {/* Message Stream */}
        <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4 py-8">
              <div className="h-14 w-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-md shadow-indigo-500/10">
                <Sparkles size={28} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Turn Your Data Into Instant Answers
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Ask analytical questions in natural language. Powered by DuckDB, Python statistical models, and NVIDIA NIM.
                </p>
              </div>

              {/* Dynamic Suggestions */}
              <div className="w-full space-y-1.5 pt-3 text-left">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Suggested starter questions:</span>
                {dynamicSuggestions.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(prompt)}
                    className="w-full text-left p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 transition-all flex items-center justify-between"
                  >
                    <span>{prompt}</span>
                    <ArrowRight size={12} className="text-indigo-500 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="space-y-3">
                {msg.sender === 'user' ? (
                  <div className="flex items-start justify-end gap-3">
                    <div className="bg-indigo-600 text-white rounded-2xl rounded-tr-none px-4 py-2.5 text-xs max-w-xl shadow-xs leading-relaxed font-medium">
                      {msg.content}
                    </div>
                    <div className="h-7 w-7 rounded-lg bg-indigo-700 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                      U
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <div className="h-7 w-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-xs shadow-indigo-500/20">
                      <Bot size={15} />
                    </div>
                    <div className="flex-1 space-y-4 max-w-4xl min-w-0">
                      <div className="p-4 rounded-2xl rounded-tl-none bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 space-y-4 shadow-xs">
                        
                        {/* 1. Direct Answer */}
                        {msg.directAnswer ? (
                          <div className="space-y-3">
                            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-950/90 border border-slate-200/80 dark:border-slate-800/90 shadow-xs">
                              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1">
                                <Sparkles size={13} />
                                Direct Answer
                              </div>
                              <p className="text-xs font-medium text-slate-900 dark:text-slate-100 leading-relaxed">
                                {msg.directAnswer}
                              </p>
                            </div>

                            {/* 2. Key Insight */}
                            {msg.keyInsight && (
                              <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/50 shadow-xs">
                                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-1">
                                  <TrendingUp size={13} />
                                  Key Insight
                                </div>
                                <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                                  {msg.keyInsight}
                                </p>
                              </div>
                            )}

                            {/* Badges */}
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              {msg.analysisMethod && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/50">
                                  Method: {msg.analysisMethod}
                                </span>
                              )}
                              {msg.datasetInfo && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                  Source: {msg.datasetInfo.name} ({msg.datasetInfo.row_count.toLocaleString()} rows)
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap font-normal">
                            {msg.content}
                          </div>
                        )}

                        {/* Multi-Tab Interactive Artifact Container */}
                        {(msg.chart || msg.tableData || msg.sql) && (
                          <div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f19] overflow-hidden shadow-xs">
                            {/* Tab Switcher & Export Controls */}
                            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-3 bg-slate-50/80 dark:bg-slate-900/50">
                              <div className="flex items-center gap-1">
                                {msg.chart && (
                                  <button
                                    onClick={() => setActiveTabByMsg(p => ({ ...p, [msg.id]: 'chart' }))}
                                    className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                                      (activeTabByMsg[msg.id] || 'chart') === 'chart'
                                        ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                                        : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                    }`}
                                  >
                                    <BarChart3 size={13} />
                                    Visualization
                                  </button>
                                )}
                                {msg.tableData && (
                                  <button
                                    onClick={() => setActiveTabByMsg(p => ({ ...p, [msg.id]: 'table' }))}
                                    className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                                      activeTabByMsg[msg.id] === 'table'
                                        ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                                        : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                    }`}
                                  >
                                    <TableIcon size={13} />
                                    Data Table ({msg.tableData.rows.length})
                                  </button>
                                )}
                                {msg.sql && (
                                  <button
                                    onClick={() => setActiveTabByMsg(p => ({ ...p, [msg.id]: 'sql' }))}
                                    className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                                      activeTabByMsg[msg.id] === 'sql'
                                        ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                                        : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                    }`}
                                  >
                                    <Terminal size={13} />
                                    View SQL
                                  </button>
                                )}
                              </div>

                              {/* Right Export Actions */}
                              <div className="flex items-center gap-1">
                                {msg.tableData && (
                                  <button
                                    onClick={() => exportTableCsv(msg.chart?.title || 'analysis_results', msg.tableData!)}
                                    className="p-1 rounded text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                                    title="Export CSV"
                                  >
                                    <Download size={13} />
                                  </button>
                                )}
                                {msg.sql && activeTabByMsg[msg.id] === 'sql' && (
                                  <button
                                    onClick={() => copySql(msg.id, msg.sql!)}
                                    className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                    title="Copy SQL Query"
                                  >
                                    {copiedSqlId === msg.id ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Tab Content Display */}
                            <div className="p-4">
                              {/* 1. Chart Tab */}
                              {(!activeTabByMsg[msg.id] || activeTabByMsg[msg.id] === 'chart') && msg.chart && (
                                <div className="space-y-2">
                                  <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 text-center">
                                    {msg.chart.title}
                                  </h4>
                                  <div className="h-64 w-full pt-2">
                                    <ResponsiveContainer width="100%" height="100%">
                                      {msg.chart.type === 'line' ? (
                                        <ReLineChart data={msg.chart.data}>
                                          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                                          <XAxis dataKey={msg.chart.xAxisKey} tick={{ fontSize: 11 }} />
                                          <YAxis tick={{ fontSize: 11 }} />
                                          <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', fontSize: '11px', borderRadius: '8px' }} />
                                          <Line type="monotone" dataKey={msg.chart.yAxisKey} stroke="#4f46e5" strokeWidth={2.5} dot={{ r: 3 }} />
                                        </ReLineChart>
                                      ) : msg.chart.type === 'pie' ? (
                                        <RePieChart>
                                          <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', fontSize: '11px', borderRadius: '8px' }} />
                                          <Pie data={msg.chart.data} dataKey={msg.chart.yAxisKey} nameKey={msg.chart.xAxisKey} cx="50%" cy="50%" innerRadius={50} outerRadius={80} fill="#6366f1">
                                            {msg.chart.data.map((_, index) => (
                                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                          </Pie>
                                        </RePieChart>
                                      ) : (
                                        <BarChart data={msg.chart.data}>
                                          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                                          <XAxis dataKey={msg.chart.xAxisKey} tick={{ fontSize: 11 }} />
                                          <YAxis tick={{ fontSize: 11 }} />
                                          <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', fontSize: '11px', borderRadius: '8px' }} />
                                          <Bar dataKey={msg.chart.yAxisKey} fill="#4f46e5" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                      )}
                                    </ResponsiveContainer>
                                  </div>
                                </div>
                              )}

                              {/* 2. Data Table Tab */}
                              {activeTabByMsg[msg.id] === 'table' && msg.tableData && (
                                <div className="overflow-x-auto max-h-64">
                                  <table className="w-full text-left text-xs border-collapse">
                                    <thead className="sticky top-0 bg-slate-100 dark:bg-slate-900 z-10">
                                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                                        {msg.tableData.columns.map((col, idx) => (
                                          <th key={idx} className="py-2 px-3 font-semibold capitalize font-mono text-[11px]">
                                            {col.replace('_', ' ')}
                                          </th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-[11px]">
                                      {msg.tableData.rows.map((row, rIdx) => (
                                        <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                          {msg.tableData!.columns.map((col, cIdx) => (
                                            <td key={cIdx} className="py-2 px-3 text-slate-700 dark:text-slate-300">
                                              {String(row[col] ?? '')}
                                            </td>
                                          ))}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}

                              {/* 3. Generated SQL Tab */}
                              {activeTabByMsg[msg.id] === 'sql' && msg.sql && (
                                <pre className="p-3.5 rounded-lg bg-slate-950 font-mono text-xs text-indigo-300 overflow-x-auto leading-relaxed border border-slate-800">
                                  {msg.sql}
                                </pre>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}

          {/* Skeleton / Agent Progress Stepper */}
          {isThinking && (
            <div className="flex items-start gap-3 animate-fadeIn">
              <div className="h-7 w-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-xs animate-pulse">
                <Bot size={15} />
              </div>
              <div className="p-4 rounded-2xl rounded-tl-none bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 space-y-3 w-full max-w-xl">
                <div className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-indigo-500 animate-ping shrink-0" />
                  <span className="font-mono text-xs font-medium text-indigo-600 dark:text-indigo-400">
                    {currentAgentStep || 'Agent reasoning...'}
                  </span>
                </div>
                <div className="space-y-1.5 pt-1">
                  <div className="h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full w-4/5 animate-pulse" />
                  <div className="h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full w-3/5 animate-pulse" />
                </div>
              </div>
            </div>
          )}

          {/* Error Recovery Banner */}
          {lastFailedQuery && !isThinking && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-center justify-between text-xs text-rose-800 dark:text-rose-300">
              <div className="flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0 text-rose-600" />
                <span>Query execution encountered an issue. Would you like to retry?</span>
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

        {/* Dynamic Follow-up Suggestions Bar */}
        {dynamicSuggestions.length > 0 && !isThinking && (
          <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-[#0a0e18] flex items-center gap-2 overflow-x-auto">
            <span className="text-[10px] uppercase font-mono text-slate-400 shrink-0 font-bold">Suggested:</span>
            {dynamicSuggestions.map((followup, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(followup)}
                className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-500 dark:hover:border-indigo-400 hover:text-indigo-600 transition-all flex items-center gap-1"
              >
                <span>{followup}</span>
                <ArrowRight size={10} className="text-slate-400" />
              </button>
            ))}
          </div>
        )}

        {/* Input Bar */}
        <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0c101c]">
          <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="relative flex items-center">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask an analytical question (e.g. 'What are the top 5 categories by revenue?')..."
              className="w-full bg-white dark:bg-[#111726] border border-slate-200 dark:border-slate-700/80 rounded-xl pl-4 pr-12 py-3 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-xs"
              disabled={isThinking}
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isThinking}
              aria-label="Send analysis question"
              className="absolute right-2 p-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 transition-all"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      </div>

      {/* 3. RIGHT PANEL: Live Context & Insights Panel */}
      {showInsightPanel && (
        <div className="hidden xl:flex flex-col w-72 shrink-0 rounded-2xl bg-white dark:bg-[#0f1422] border border-slate-200 dark:border-slate-800 shadow-sm p-4 overflow-y-auto space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Activity size={16} className="text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
              Live Insights
            </span>
          </div>

          {/* Latest Key Finding */}
          {latestAssistantMsg?.keyInsight ? (
            <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 space-y-1.5">
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Latest Finding</span>
              <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                {latestAssistantMsg.keyInsight}
              </p>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800 text-xs text-slate-400 text-center py-6">
              Ask a question to generate contextual insights.
            </div>
          )}

          {/* Active Dataset Schema Snapshot */}
          {selectedDataset && (
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Columns ({selectedDataset.column_count})</span>
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {selectedDataset.columns.map((col, idx) => (
                  <div key={idx} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/60 flex items-center justify-between text-xs">
                    <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300 truncate max-w-[120px]">{col.name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 text-slate-500 border border-slate-200/50 dark:border-slate-700 capitalize">
                      {col.column_type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Data Quality Snapshot */}
          {selectedDataset?.quality && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Quality Score</span>
                <span className="text-xs font-bold text-emerald-600 font-mono">{selectedDataset.quality.quality_score}%</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5">
                <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${selectedDataset.quality.quality_score}%` }} />
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
