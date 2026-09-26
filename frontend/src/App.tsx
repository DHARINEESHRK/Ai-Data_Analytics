import { useState, useEffect } from 'react';
import { Shell } from './components/layout/Shell';
import { LandingPage } from './components/views/LandingPage';
import { DashboardView } from './components/views/DashboardView';
import { WorkspaceView } from './components/views/WorkspaceView';
import { DataExplorerView } from './components/views/DataExplorerView';
import { AnalyticsView } from './components/views/AnalyticsView';
import { HistoryView } from './components/views/HistoryView';
import { DatasetsView } from './components/views/DatasetsView';
import { SettingsView } from './components/views/SettingsView';
import { systemApi, datasetsApi } from './services/api';
import type { HealthStatus } from './types';
import type { Dataset, AnalysisHistoryItem } from './types/models';

export function App() {
  const [currentPage, setCurrentPage] = useState<'landing' | 'app'>('landing');
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [healthLoading, setHealthLoading] = useState<boolean>(true);
  const [healthError, setHealthError] = useState<string | null>(null);

  const fetchHealthAndDatasets = async () => {
    try {
      setHealthLoading(true);
      const [healthData, datasetsRes] = await Promise.all([
        systemApi.checkHealth(),
        datasetsApi.listDatasets().catch(() => ({ datasets: [], total: 0 })),
      ]);
      setHealth(healthData);
      setHealthError(null);

      // Fetch detailed schema for real uploaded datasets
      if (datasetsRes.datasets && datasetsRes.datasets.length > 0) {
        const fullDatasets: Dataset[] = await Promise.all(
          datasetsRes.datasets.map(async (d: any) => {
            try {
              return await datasetsApi.getDataset(d.id);
            } catch {
              return d;
            }
          })
        );
        setDatasets(fullDatasets);
        setSelectedDataset(prev => {
          if (prev && fullDatasets.some(d => d.id === prev.id)) return prev;
          return fullDatasets[0];
        });
      } else {
        setDatasets([]);
        setSelectedDataset(null);
      }
    } catch (err: any) {
      setHealthError(err?.message || 'Failed to connect to backend engine');
      setHealth(null);
    } finally {
      setHealthLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthAndDatasets();
    const interval = setInterval(fetchHealthAndDatasets, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleStartAnalyzing = () => {
    setCurrentPage('app');
    setActiveTab('workspace');
  };

  const handleExploreDemo = () => {
    setCurrentPage('app');
    setActiveTab('dashboard');
  };

  const handleRerunAnalysis = (item: AnalysisHistoryItem) => {
    const ds = datasets.find(d => d.id === item.datasetId) || datasets[0] || null;
    setSelectedDataset(ds);
    setActiveTab('workspace');
  };

  const handleDatasetUploaded = (newDs: Dataset) => {
    setDatasets(prev => [newDs, ...prev.filter(d => d.id !== newDs.id)]);
    setSelectedDataset(newDs);
    setActiveTab('explorer');
  };

  if (currentPage === 'landing') {
    return (
      <LandingPage
        onStartAnalyzing={handleStartAnalyzing}
        onExploreDemo={handleExploreDemo}
      />
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardView
            datasets={datasets}
            selectedDataset={selectedDataset}
            onSelectDataset={setSelectedDataset}
            onNavigate={(tab) => setActiveTab(tab)}
            health={health}
          />
        );
      case 'workspace':
        return (
          <WorkspaceView
            datasets={datasets}
            selectedDataset={selectedDataset}
            onSelectDataset={setSelectedDataset}
            onNavigate={(tab) => setActiveTab(tab)}
          />
        );
      case 'datasets':
        return (
          <DatasetsView
            datasets={datasets}
            selectedDataset={selectedDataset}
            onSelectDataset={setSelectedDataset}
            onNavigateToExplorer={() => setActiveTab('explorer')}
            onNavigateToWorkspace={() => setActiveTab('workspace')}
            onDatasetUploaded={handleDatasetUploaded}
          />
        );
      case 'explorer':
        return (
          <DataExplorerView
            datasets={datasets}
            selectedDataset={selectedDataset}
            onSelectDataset={setSelectedDataset}
            onNavigateToWorkspace={() => setActiveTab('workspace')}
          />
        );
      case 'analytics':
        return (
          <AnalyticsView
            datasets={datasets}
            selectedDataset={selectedDataset}
            onSelectDataset={setSelectedDataset}
            onNavigateToWorkspace={() => setActiveTab('workspace')}
          />
        );
      case 'history':
        return (
          <HistoryView
            onRerunAnalysis={handleRerunAnalysis}
          />
        );
      case 'settings':
        return <SettingsView />;
      default:
        return null;
    }
  };

  return (
    <Shell
      activeTab={activeTab}
      onTabChange={setActiveTab}
      health={health}
      healthLoading={healthLoading}
      healthError={healthError}
      onReturnHome={() => setCurrentPage('landing')}
    >
      {renderContent()}
    </Shell>
  );
}

export default App;
