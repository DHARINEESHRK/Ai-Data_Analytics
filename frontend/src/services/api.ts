import axios from 'axios';
import type { HealthStatus } from '../types';
import type { Dataset, DatasetPreview } from '../types/models';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
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
