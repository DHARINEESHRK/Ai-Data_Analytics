import { useState } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  Database, 
  ChevronDown, 
  Copy, 
  Check, 
  Table as TableIcon,
  RefreshCw
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
  AreaChart, 
  Area 
} from 'recharts';
import type { Dataset, AnalysisMessage } from '../../types/models';
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
  const [copiedSqlId, setCopiedSqlId] = useState<string | null>(null);
  const [activeTabByMsg, setActiveTabByMsg] = useState<Record<string, 'chart' | 'table' | 'sql' | 'explanation'>>({
    'msg-2': 'chart'
  });

  const promptSuggestions = [
    'Break down monthly spend and churn rate by plan tier',
    'Which region has the lowest customer NPS score?',
    'What is the correlation between support tickets and churn?',
    'Show top 10 highest value transactions'
  ];

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isThinking) return;

    const userMsg: AnalysisMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      timestamp: 'Just now',
      content: inputText
    };

    setMessages(prev => [...prev, userMsg]);
    const query = inputText;
    setInputText('');
    setIsThinking(true);

    // Realistic AI Thinking & Execution Simulation for UI phase
    setTimeout(() => {
      const assistantMsg: AnalysisMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'assistant',
        timestamp: 'Just now',
        content: `Analysis for query: "${query}"`,
        sql: `SELECT \n  plan_tier,\n  COUNT(*) AS user_count,\n  AVG(monthly_spend) AS avg_revenue\nFROM ${selectedDataset?.filename.replace('.csv', '').replace('.xlsx', '') || 'dataset'}\nGROUP BY plan_tier\nORDER BY avg_revenue DESC;`,
        explanation: `Based on the latest ${selectedDataset?.name || 'dataset'}, Enterprise and Custom tiers drive 64% of total ARR with an average tenure of 18.4 months.`,
        chart: {
          type: 'bar',
          xAxisKey: 'plan_tier',
          yAxisKey: 'avg_revenue',
          title: 'Average Revenue ($) by Tier',
          data: [
            { plan_tier: 'Enterprise', avg_revenue: 1840, users: 2140 },
            { plan_tier: 'Custom', avg_revenue: 960, users: 1420 },
            { plan_tier: 'Pro', avg_revenue: 199, users: 9850 },
            { plan_tier: 'Starter', avg_revenue: 49, users: 11440 },
          ]
        },
        tableData: {
          columns: ['plan_tier', 'user_count', 'avg_revenue'],
          rows: [
            { plan_tier: 'Enterprise', user_count: 2140, avg_revenue: '$1,840.00' },
            { plan_tier: 'Custom', user_count: 1420, avg_revenue: '$960.00' },
            { plan_tier: 'Pro', user_count: 9850, avg_revenue: '$199.00' },
            { plan_tier: 'Starter', user_count: 11440, avg_revenue: '$49.00' },
          ]
        }
      };

      setMessages(prev => [...prev, assistantMsg]);
      setActiveTabByMsg(prev => ({ ...prev, [assistantMsg.id]: 'chart' }));
      setIsThinking(false);
    }, 1200);
  };

  const copySql = (id: string, sql: string) => {
    navigator.clipboard.writeText(sql);
    setCopiedSqlId(id);
    setTimeout(() => setCopiedSqlId(null), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto flex flex-col h-[calc(100vh-7rem)] gap-4 animate-fadeIn">
      {/* Top Context Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-white dark:bg-[#0f1422] border border-slate-200 dark:border-slate-800 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <Database size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-900 dark:text-white">Active Dataset:</span>
              <div className="relative inline-block">
                <select 
                  value={selectedDataset?.id} 
                  onChange={(e) => {
                    const ds = datasets.find(d => d.id === e.target.value);
                    if (ds) onSelectDataset(ds);
                  }}
                  aria-label="Select active dataset"
                  className="appearance-none bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md py-1 pl-2.5 pr-7 text-xs font-medium text-slate-800 dark:text-slate-200 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {datasets.map(ds => (
                    <option key={ds.id} value={ds.id}>{ds.name} ({ds.row_count.toLocaleString()} rows)</option>
                  ))}
                </select>
                <ChevronDown size={12} className="absolute right-2 top-2 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {selectedDataset?.filename} • {selectedDataset?.column_count} columns • {selectedDataset?.row_count.toLocaleString()} rows
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => onNavigate('explorer')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
          >
            <TableIcon size={13} />
            View Data Explorer
          </button>
          <button 
            onClick={() => setMessages([])}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
            title="Clear workspace messages"
          >
            <RefreshCw size={13} />
            Reset Chat
          </button>
        </div>
      </div>

      {/* Main Chat & Analysis Output Stream */}
      <div className="flex-1 min-h-0 bg-white dark:bg-[#0f1422] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4 py-12">
              <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Bot size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Ask Anything About Your Dataset
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  The AI Analyst can execute DuckDB queries, compute statistical summaries, and generate visual charts.
                </p>
              </div>

              {/* Sample Prompts */}
              <div className="w-full space-y-1.5 pt-2 text-left">
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Suggested queries:</span>
                {promptSuggestions.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInputText(prompt);
                    }}
                    className="w-full text-left p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-700 dark:text-slate-300 transition-all flex items-center justify-between"
                  >
                    <span>{prompt}</span>
                    <Sparkles size={12} className="text-indigo-500 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="space-y-3">
                {msg.sender === 'user' ? (
                  <div className="flex items-start justify-end gap-3">
                    <div className="bg-indigo-600 text-white rounded-2xl rounded-tr-none px-4 py-2.5 text-xs max-w-xl shadow-sm">
                      {msg.content}
                    </div>
                    <div className="h-7 w-7 rounded-lg bg-indigo-700 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                      U
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <div className="h-7 w-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-sm shadow-indigo-500/20">
                      <Bot size={15} />
                    </div>
                    <div className="flex-1 space-y-3 max-w-4xl">
                      {/* Message Content */}
                      <div className="p-4 rounded-2xl rounded-tl-none bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 space-y-3">
                        <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-normal">
                          {msg.content}
                        </p>

                        {/* Multi-Tab Result Container (Chart, Table, SQL, Explanation) */}
                        {(msg.chart || msg.tableData || msg.sql) && (
                          <div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f19] overflow-hidden">
                            {/* Tab Switcher */}
                            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-3 bg-slate-50/70 dark:bg-slate-900/40">
                              <div className="flex items-center gap-1">
                                {msg.chart && (
                                  <button
                                    onClick={() => setActiveTabByMsg(p => ({ ...p, [msg.id]: 'chart' }))}
                                    className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                                      (activeTabByMsg[msg.id] || 'chart') === 'chart'
                                        ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                                        : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                    }`}
                                  >
                                    Visualization
                                  </button>
                                )}
                                {msg.tableData && (
                                  <button
                                    onClick={() => setActiveTabByMsg(p => ({ ...p, [msg.id]: 'table' }))}
                                    className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                                      activeTabByMsg[msg.id] === 'table'
                                        ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                                        : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                    }`}
                                  >
                                    Data Table
                                  </button>
                                )}
                                {msg.sql && (
                                  <button
                                    onClick={() => setActiveTabByMsg(p => ({ ...p, [msg.id]: 'sql' }))}
                                    className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                                      activeTabByMsg[msg.id] === 'sql'
                                        ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                                        : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                    }`}
                                  >
                                    Generated SQL
                                  </button>
                                )}
                                {msg.explanation && (
                                  <button
                                    onClick={() => setActiveTabByMsg(p => ({ ...p, [msg.id]: 'explanation' }))}
                                    className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                                      activeTabByMsg[msg.id] === 'explanation'
                                        ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                                        : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                    }`}
                                  >
                                    Insights
                                  </button>
                                )}
                              </div>

                              {msg.sql && activeTabByMsg[msg.id] === 'sql' && (
                                <button
                                  onClick={() => copySql(msg.id, msg.sql!)}
                                  className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                  title="Copy SQL"
                                >
                                  {copiedSqlId === msg.id ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                                </button>
                              )}
                            </div>

                            {/* Tab Content Display */}
                            <div className="p-4">
                              {/* 1. Chart View */}
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
                                          <Line type="monotone" dataKey={msg.chart.yAxisKey} stroke="#4f46e5" strokeWidth={2} />
                                        </ReLineChart>
                                      ) : msg.chart.type === 'area' ? (
                                        <AreaChart data={msg.chart.data}>
                                          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                                          <XAxis dataKey={msg.chart.xAxisKey} tick={{ fontSize: 11 }} />
                                          <YAxis tick={{ fontSize: 11 }} />
                                          <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', fontSize: '11px', borderRadius: '8px' }} />
                                          <Area type="monotone" dataKey={msg.chart.yAxisKey} fill="#4f46e5" stroke="#4f46e5" fillOpacity={0.2} />
                                        </AreaChart>
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

                              {/* 2. Table View */}
                              {activeTabByMsg[msg.id] === 'table' && msg.tableData && (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                                        {msg.tableData.columns.map((col, idx) => (
                                          <th key={idx} className="py-2 px-3 font-semibold capitalize font-mono text-[11px]">
                                            {col.replace('_', ' ')}
                                          </th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                      {msg.tableData.rows.map((row, rIdx) => (
                                        <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                          {msg.tableData!.columns.map((col, cIdx) => (
                                            <td key={cIdx} className="py-2.5 px-3 text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                                              {String(row[col])}
                                            </td>
                                          ))}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}

                              {/* 3. SQL View */}
                              {activeTabByMsg[msg.id] === 'sql' && msg.sql && (
                                <pre className="p-3.5 rounded-lg bg-slate-950 font-mono text-xs text-indigo-300 overflow-x-auto leading-relaxed border border-slate-800">
                                  {msg.sql}
                                </pre>
                              )}

                              {/* 4. Explanation View */}
                              {activeTabByMsg[msg.id] === 'explanation' && msg.explanation && (
                                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-lg text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                                  {msg.explanation}
                                </div>
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

          {/* Thinking / Running Agent State */}
          {isThinking && (
            <div className="flex items-start gap-3 animate-fadeIn">
              <div className="h-7 w-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-sm animate-pulse">
                <Bot size={15} />
              </div>
              <div className="p-4 rounded-2xl rounded-tl-none bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                <span className="h-2 w-2 rounded-full bg-indigo-500 animate-ping" />
                <span>NVIDIA NIM Agent is analyzing schema, generating SQL & compiling results...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0c101c]">
          <form onSubmit={handleSendMessage} className="relative flex items-center">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask a question about the active dataset (e.g. 'Show total revenue by country')..."
              className="w-full bg-white dark:bg-[#111726] border border-slate-200 dark:border-slate-700/80 rounded-xl pl-4 pr-12 py-3 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm"
              disabled={isThinking}
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isThinking}
              aria-label="Send analysis question"
              className="absolute right-2 p-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 disabled:hover:bg-indigo-600 transition-all"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
