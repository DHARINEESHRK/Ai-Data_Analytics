export type ColumnType = 'numerical' | 'categorical' | 'datetime' | 'boolean' | 'text';

export interface CategoryFrequency {
  value: any;
  count: number;
  percentage: number;
}

export interface ColumnStats {
  min?: any;
  max?: any;
  mean?: number;
  median?: number;
  std?: number;
  most_frequent?: CategoryFrequency[];
  min_date?: string;
  max_date?: string;
}

export interface DatasetColumn {
  name: string;
  dtype: string;
  column_type: ColumnType;
  null_count: number;
  null_percentage: number;
  unique_count: number;
  sample_values: any[];
  stats?: ColumnStats;
}

export interface DataQualityMetrics {
  quality_score: number;
  total_cells: number;
  missing_cells: number;
  missing_percentage: number;
  duplicate_rows: number;
  duplicate_percentage: number;
  column_type_breakdown: Record<string, number>;
}

export interface Dataset {
  id: string;
  name: string;
  filename: string;
  format: 'csv' | 'xlsx' | 'parquet' | 'postgres' | string;
  row_count: number;
  column_count: number;
  file_size_bytes?: number;
  file_size_formatted?: string;
  file_size?: string;
  uploaded_at: string;
  description?: string;
  quality?: DataQualityMetrics;
  columns: DatasetColumn[];
  preview_rows?: Record<string, any>[];
}

export interface DatasetPreview {
  dataset_id: string;
  total_rows: number;
  preview_limit: number;
  columns: string[];
  rows: Record<string, any>[];
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
