export interface DatasetColumn {
  name: string;
  dtype: 'string' | 'integer' | 'float' | 'datetime' | 'boolean';
  null_count: number;
  unique_count: number;
  sample_values: any[];
  stats?: {
    min?: number | string;
    max?: number | string;
    mean?: number;
    median?: number;
    std?: number;
  };
}

export interface Dataset {
  id: string;
  name: string;
  filename: string;
  format: 'csv' | 'xlsx' | 'parquet' | 'postgres';
  row_count: number;
  column_count: number;
  file_size: string;
  uploaded_at: string;
  description: string;
  columns: DatasetColumn[];
  preview_rows: Record<string, any>[];
}

export interface ChartConfig {
  type: 'bar' | 'line' | 'area' | 'pie';
  xAxisKey: string;
  yAxisKey: string;
  title: string;
  data: Record<string, any>[];
}

export interface AnalysisMessage {
  id: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  content: string;
  sql?: string;
  explanation?: string;
  chart?: ChartConfig;
  tableData?: {
    columns: string[];
    rows: Record<string, any>[];
  };
}

export interface AnalysisHistoryItem {
  id: string;
  question: string;
  datasetId: string;
  datasetName: string;
  timestamp: string;
  analysisType: 'Aggregation' | 'Trend Analysis' | 'Segmentation' | 'Correlation' | 'Anomaly Detection';
  durationMs: number;
  status: 'completed' | 'failed';
  previewResult: string;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  apiKeys: {
    nvidiaNim: string;
    nvidiaBaseUrl: string;
    nvidiaModel: string;
  };
  postgres: {
    host: string;
    port: number;
    database: string;
    username: string;
    ssl: boolean;
    status: 'connected' | 'disconnected' | 'testing';
  };
  preferences: {
    autoExecuteQuery: boolean;
    defaultChartType: 'bar' | 'line' | 'area';
    maxPreviewRows: number;
    streamResponses: boolean;
  };
}
