import axios from 'axios';
import type { HealthStatus } from '../types';
import type { Dataset, DatasetPreview } from '../types/models';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 35000,
});

export const systemApi = {
  checkHealth: async (): Promise<HealthStatus> => {
    const response = await apiClient.get<HealthStatus>('/health');
    return response.data;
  },
};

export const datasetsApi = {
  listDatasets: async (): Promise<{ datasets: any[]; total: number }> => {
    const response = await apiClient.get<{ datasets: any[]; total: number }>('/datasets');
    return response.data;
  },

  getDataset: async (id: string): Promise<Dataset> => {
    const response = await apiClient.get<Dataset>(`/datasets/${id}`);
    return response.data;
  },

  getPreview: async (id: string, limit: number = 50): Promise<DatasetPreview> => {
    const response = await apiClient.get<DatasetPreview>(`/datasets/${id}/preview?limit=${limit}`);
    return response.data;
  },

  uploadDataset: async (file: File): Promise<Dataset> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<Dataset>('/datasets/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

export interface ChatApiRequest {
  question: string;
  dataset_id?: string;
  conversation_history?: Array<{ role: string; content: string }>;
  model?: string;
}

export interface ChartConfig {
  type: 'bar' | 'line' | 'scatter' | 'pie' | 'area';
  title?: string;
  xAxisKey?: string;
  yAxisKey?: string;
  xKey?: string;
  yKey?: string;
  data: any[];
  colors?: string[];
}

export interface TableData {
  columns: string[];
  rows: any[];
  total_rows?: number;
}

export interface DatasetInfo {
  id: string;
  name: string;
  row_count: number;
  column_count: number;
  format: string;
}

export interface ChatApiResponse {
  answer: string;
  direct_answer?: string;
  key_insight?: string;
  analysis_method?: string;
  dataset_info?: DatasetInfo;
  dataset_id?: string;
  dataset_name?: string;
  model: string;
  tokens_used?: number;
  latency_ms: number;
  suggested_followups: string[];
  status: string;
  steps?: string[];
  sql?: string;
  chart?: ChartConfig;
  table_data?: TableData;
  statistics?: Record<string, any>;
}

export const chatApi = {
  sendMessage: async (payload: ChatApiRequest): Promise<ChatApiResponse> => {
    const response = await apiClient.post<ChatApiResponse>('/chat', payload);
    return response.data;
  },
};

export interface SQLQueryRequest {
  dataset_id: string;
  sql_query: string;
  row_limit?: number;
}

export interface SQLQueryResponse {
  success: boolean;
  sql: string;
  columns: string[];
  rows: any[];
  execution_time_ms: number;
  row_count: number;
  total_rows_matched: number;
}

export interface PythonAnalyticsRequest {
  dataset_id: string;
  operation: 'descriptive_statistics' | 'correlation' | 'group_aggregation' | 'outlier_detection' | 'distribution' | 'time_series';
  columns?: string[];
  x_column?: string;
  y_column?: string;
  group_by_column?: string;
  metric_column?: string;
  aggregation_func?: 'mean' | 'sum' | 'count' | 'min' | 'max' | 'median';
  time_column?: string;
  interval?: 'D' | 'W' | 'M' | 'Y';
  method?: 'iqr' | 'zscore';
}

export interface PythonAnalyticsResponse {
  success: boolean;
  operation: string;
  dataset_id: string;
  dataset_name: string;
  parameters: Record<string, any>;
  results: Record<string, any>;
  summary: string;
  execution_time_ms: number;
}

export const pythonAnalyticsApi = {
  execute: async (payload: PythonAnalyticsRequest): Promise<PythonAnalyticsResponse> => {
    const response = await apiClient.post<PythonAnalyticsResponse>('/analytics/execute', payload);
    return response.data;
  },
};

export interface VisualizationRequest {
  dataset_id: string;
  chart_type: 'bar' | 'line' | 'pie' | 'scatter' | 'histogram' | 'area' | 'kpi' | 'table';
  x_column?: string;
  y_column?: string;
  group_by_column?: string;
  aggregation_func?: 'sum' | 'mean' | 'count' | 'min' | 'max' | 'median';
  title?: string;
  description?: string;
  max_categories?: number;
}

export interface VisualizationResponse {
  success: boolean;
  chart_type: string;
  title: string;
  description?: string;
  plotly_spec?: Record<string, any>;
  recharts_data?: any[];
  kpi_data?: {
    metric_name: string;
    value: number;
    formatted_value: string;
    aggregation: string;
    count: number;
  };
  table_data?: {
    columns: string[];
    rows: any[];
    total_rows: number;
  };
  x_column?: string;
  y_column?: string;
  execution_time_ms: number;
  warning?: string;
}

export const visualizationApi = {
  build: async (payload: VisualizationRequest): Promise<VisualizationResponse> => {
    const response = await apiClient.post<VisualizationResponse>('/visualizations/build', payload);
    return response.data;
  },
};

export interface PostgresConnectionRequest {
  host: string;
  port: number;
  database: string;
  username: string;
  password?: string;
  ssl_mode?: 'disable' | 'allow' | 'prefer' | 'require';
  table_name?: string;
}

export interface PostgresTestResponse {
  success: boolean;
  message: string;
  server_version?: string;
  database: string;
  tables_count: number;
  tables: string[];
}

export interface PostgresTableSchemaResponse {
  success: boolean;
  database: string;
  table_name: string;
  row_count_estimate: number;
  columns: Array<{
    column_name: string;
    data_type: string;
    is_nullable: string;
    column_default?: string;
  }>;
}

export const postgresApi = {
  testConnection: async (payload: PostgresConnectionRequest): Promise<PostgresTestResponse> => {
    const response = await apiClient.post<PostgresTestResponse>('/postgres/test', payload);
    return response.data;
  },

  discoverTableSchema: async (payload: PostgresConnectionRequest): Promise<PostgresTableSchemaResponse> => {
    const response = await apiClient.post<PostgresTableSchemaResponse>('/postgres/schema', payload);
    return response.data;
  },

  connectTable: async (payload: PostgresConnectionRequest): Promise<Dataset> => {
    const response = await apiClient.post<Dataset>('/postgres/connect', payload);
    return response.data;
  },
};

export interface HistoryItem {
  id: string;
  question: string;
  dataset_id: string;
  dataset_name: string;
  timestamp: string;
  answer: string;
  direct_answer?: string;
  key_insight?: string;
  analysis_type: string;
  sql?: string;
  chart_config?: Record<string, any>;
  duration_ms: number;
}

export interface HistoryListResponse {
  total: number;
  items: HistoryItem[];
}

export const historyApi = {
  listHistory: async (params?: { q?: string; analysis_type?: string; limit?: number; offset?: number }): Promise<HistoryListResponse> => {
    const response = await apiClient.get<HistoryListResponse>('/history', { params });
    return response.data;
  },

  deleteHistory: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete<{ success: boolean; message: string }>(`/history/${id}`);
    return response.data;
  },

  clearAllHistory: async (): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete<{ success: boolean; message: string }>('/history');
    return response.data;
  },
};
