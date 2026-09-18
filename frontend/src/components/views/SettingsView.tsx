import { useState } from 'react';
import { 
  Sliders, 
  Key, 
  Database, 
  CheckCircle2, 
  Save, 
  Sun, 
  Moon, 
  Check,
  Server
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { MOCK_APP_SETTINGS } from '../../mock/data';
import type { AppSettings } from '../../types/models';

export const SettingsView: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState<AppSettings>(MOCK_APP_SETTINGS);
  const [isSaved, setIsSaved] = useState(false);
  const [dbTesting, setDbTesting] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleTestConnection = () => {
    setDbTesting(true);
    setTimeout(() => {
      setDbTesting(false);
    }, 1000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fadeIn pb-12">
      {/* Header */}
      <div className="flex items-center justify-between p-5 rounded-2xl bg-white dark:bg-[#0f1422] border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Sliders size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              System & Agent Settings
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Configure AI inference parameters, database credentials, and workspace preferences.
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all"
        >
          {isSaved ? <Check size={14} className="text-emerald-300" /> : <Save size={14} />}
          {isSaved ? 'Settings Saved' : 'Save Changes'}
        </button>
      </div>

      {/* 1. Appearance & Theme Selection */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#0f1422] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Appearance & Theme
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Choose your preferred color theme for data visualizations and editor screens.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md">
          <button
            onClick={() => setTheme('light')}
            className={`p-4 rounded-xl border text-left flex items-center gap-3 transition-all ${
              theme === 'light'
                ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50 text-slate-700 dark:text-slate-300'
            }`}
          >
            <Sun size={20} className="text-amber-500" />
            <div>
              <span className="text-xs font-semibold block">Light Mode</span>
              <span className="text-[10px] text-slate-400">Crisp white canvas</span>
            </div>
          </button>

          <button
            onClick={() => setTheme('dark')}
            className={`p-4 rounded-xl border text-left flex items-center gap-3 transition-all ${
              theme === 'dark'
                ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50 text-slate-700 dark:text-slate-300'
            }`}
          >
            <Moon size={20} className="text-indigo-400" />
            <div>
              <span className="text-xs font-semibold block">Dark Mode</span>
              <span className="text-[10px] text-slate-400">High-contrast slate</span>
            </div>
          </button>
        </div>
      </div>

      {/* 2. NVIDIA NIM AI Engine Configuration */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#0f1422] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Key size={16} className="text-indigo-600 dark:text-indigo-400" />
              NVIDIA NIM API Configuration
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Inference endpoints for autonomous reasoning and SQL translation.
            </p>
          </div>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/40">
            <CheckCircle2 size={11} /> Ready
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              NVIDIA NIM API Key
            </label>
            <input
              type="password"
              value={settings.apiKeys.nvidiaNim}
              onChange={(e) => setSettings(s => ({ ...s, apiKeys: { ...s.apiKeys, nvidiaNim: e.target.value } }))}
              className="w-full bg-slate-50 dark:bg-[#111726] border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Selected LLM Model
            </label>
            <select
              value={settings.apiKeys.nvidiaModel}
              onChange={(e) => setSettings(s => ({ ...s, apiKeys: { ...s.apiKeys, nvidiaModel: e.target.value } }))}
              aria-label="Select NVIDIA NIM LLM Model"
              className="w-full bg-slate-50 dark:bg-[#111726] border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="meta/llama-3.1-70b-instruct">meta/llama-3.1-70b-instruct (Recommended)</option>
              <option value="mistralai/mixtral-8x22b-instruct">mistralai/mixtral-8x22b-instruct</option>
              <option value="nvidia/nemotron-4-340b-instruct">nvidia/nemotron-4-340b-instruct</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. PostgreSQL Database Connection */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#0f1422] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Database size={16} className="text-blue-600 dark:text-blue-400" />
              PostgreSQL Data Warehouse Connector
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Connect external databases for live schema inspection and read-only analytical queries.
            </p>
          </div>
          <button
            type="button"
            onClick={handleTestConnection}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
          >
            <Server size={13} />
            {dbTesting ? 'Testing...' : 'Test Connection'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Host</label>
            <input
              type="text"
              value={settings.postgres.host}
              onChange={(e) => setSettings(s => ({ ...s, postgres: { ...s.postgres, host: e.target.value } }))}
              className="w-full bg-slate-50 dark:bg-[#111726] border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Port</label>
            <input
              type="number"
              value={settings.postgres.port}
              onChange={(e) => setSettings(s => ({ ...s, postgres: { ...s.postgres, port: Number(e.target.value) } }))}
              className="w-full bg-slate-50 dark:bg-[#111726] border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Database Name</label>
            <input
              type="text"
              value={settings.postgres.database}
              onChange={(e) => setSettings(s => ({ ...s, postgres: { ...s.postgres, database: e.target.value } }))}
              className="w-full bg-slate-50 dark:bg-[#111726] border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 font-mono"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
