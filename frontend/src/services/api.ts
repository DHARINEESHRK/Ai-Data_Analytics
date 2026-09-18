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

export interface ChatApiResponse {
  answer: string;
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


