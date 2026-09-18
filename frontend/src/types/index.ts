export interface HealthStatus {
  status: string;
  app_name: string;
  version: string;
  debug: boolean;
  environment: {
    storage_ready: boolean;
    nim_configured: boolean;
    nim_model: string;
    [key: string]: any;
  };
}

export interface DatasetSummary {
  id: string;
  name: string;
  filename: string;
  row_count: number;
  column_count: number;
  file_size: number;
  uploaded_at: string;
  columns: Array<{
    name: string;
    dtype: string;
    null_count: number;
  }>;
}

export type ThemeMode = 'light' | 'dark' | 'system';
