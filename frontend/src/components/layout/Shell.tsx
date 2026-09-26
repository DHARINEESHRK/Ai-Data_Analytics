import { useState } from 'react';
import { 
  Database, 
  Bot, 
  Layers, 
  Sun, 
  Moon, 
  ChevronLeft, 
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  Table as TableIcon,
  History,
  Sliders,
  Home,
  BarChart3
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import type { HealthStatus } from '../../types';

interface ShellProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tabId: string) => void;
  health: HealthStatus | null;
  healthLoading: boolean;
  healthError: string | null;
  onReturnHome: () => void;
}

export const Shell: React.FC<ShellProps> = ({
  children,
  activeTab,
  onTabChange,
  health,
  healthLoading,
  healthError,
  onReturnHome,
}) => {
  const { theme, toggleTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Layers },
    { id: 'workspace', label: 'AI Analyst Workspace', icon: Bot },
    { id: 'datasets', label: 'Datasets & Sources', icon: Database },
    { id: 'explorer', label: 'Data Explorer & Profiler', icon: TableIcon },
    { id: 'analytics', label: 'Python Analytics', icon: BarChart3 },
    { id: 'history', label: 'Analysis History', icon: History },
    { id: 'settings', label: 'Settings', icon: Sliders },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 transition-colors">
      {/* Sidebar */}
      <aside 
        className={`flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f1422] transition-all duration-200 z-30 ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200 dark:border-slate-800">
          {!collapsed && (
            <button 
              onClick={onReturnHome}
              className="flex items-center gap-2.5 overflow-hidden text-left hover:opacity-80 transition-opacity"
            >
              <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold shadow-sm shadow-indigo-500/20 shrink-0">
                <Bot size={18} />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold tracking-tight text-sm text-slate-900 dark:text-white leading-tight">
                  Nova Analytics
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono">
                  Enterprise AI
                </span>
              </div>
            </button>
          )}
          {collapsed && (
            <button 
              onClick={onReturnHome}
              className="mx-auto h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold hover:opacity-80"
            >
              <Bot size={18} />
            </button>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/40 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={18} className={isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Quick Return Home Link */}
        <div className="px-2 py-2 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onReturnHome}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/40 transition-colors"
          >
            <Home size={16} />
            {!collapsed && <span>Landing Page</span>}
          </button>
        </div>

        {/* System Health Status Indicator in Sidebar */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800">
          {!collapsed ? (
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 text-xs">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${
                  healthLoading 
                    ? 'bg-amber-400 animate-pulse' 
                    : health?.status === 'healthy' 
                      ? 'bg-emerald-500' 
                      : 'bg-rose-500'
                }`} />
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {healthLoading ? 'Connecting...' : health?.status === 'healthy' ? 'Engine Online' : 'Engine Offline'}
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">v{health?.version || '0.1.0'}</span>
            </div>
          ) : (
            <div className="flex justify-center">
              <span className={`h-2 w-2 rounded-full ${
                healthLoading 
                  ? 'bg-amber-400 animate-pulse' 
                  : health?.status === 'healthy' 
                    ? 'bg-emerald-500' 
                    : 'bg-rose-500'
              }`} />
            </div>
          )}
          {healthError && !collapsed && (
            <p className="mt-1.5 text-[10px] text-rose-500 dark:text-rose-400 truncate" title={healthError}>
              {healthError}
            </p>
          )}
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#0f1422]/80 backdrop-blur-md px-6 flex items-center justify-between z-20">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold text-slate-800 dark:text-slate-100 capitalize">
              {navItems.find(i => i.id === activeTab)?.label || 'Workspace'}
            </h1>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Production SaaS</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Status Pill */}
            {health?.environment.nim_configured ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
                <ShieldCheck size={13} />
                NVIDIA NIM Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40">
                <AlertCircle size={13} />
                NIM Configured
              </span>
            )}

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50/50 dark:bg-[#090d16]">
          {children}
        </main>
      </div>
    </div>
  );
};
