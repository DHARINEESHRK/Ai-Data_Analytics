import { useState, useEffect } from 'react';
import { Shell } from './components/layout/Shell';
import { LandingPage } from './components/views/LandingPage';
import { OverviewView } from './components/views/OverviewView';
import { WorkspaceView } from './components/views/WorkspaceView';
import { DataExplorerView } from './components/views/DataExplorerView';
import { HistoryView } from './components/views/HistoryView';
import { DatasetsView } from './components/views/DatasetsView';
import { SettingsView } from './components/views/SettingsView';
import { systemApi, datasetsApi } from './services/api';
import type { HealthStatus } from './types';
import type { Dataset, AnalysisHistoryItem } from './types/models';
import { MOCK_DATASETS } from './mock/data';

export function App() {
  const [currentPage, setCurrentPage] = useState<'landing' | 'app'>('landing');
  const [activeTab, setActiveTab] = useState<string>('workspace');
  const [datasets, setDatasets] = useState<Dataset[]>(MOCK_DATASETS);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(MOCK_DATASETS[0]);
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

      // If backend has datasets, load detailed metadata for the first one
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
        setDatasets([...fullDatasets, ...MOCK_DATASETS]);
        if (!selectedDataset || !fullDatasets.some(d => d.id === selectedDataset.id)) {
          setSelectedDataset(fullDatasets[0]);
        }
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
    setActiveTab('overview');
  };

  const handleRerunAnalysis = (item: AnalysisHistoryItem) => {
    const ds = datasets.find(d => d.id === item.datasetId) || datasets[0];
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
      case 'overview':
        return (
          <OverviewView
            health={health}
            healthLoading={healthLoading}
            healthError={healthError}
            onNavigate={(tab) => setActiveTab(tab)}
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
