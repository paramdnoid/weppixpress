import axios from 'axios';
import type { FileItem, PaginatedResponse } from '@/types';

interface ListOptions {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  page?: number;
  limit?: number;
}

interface UploadOptions {
  onUploadProgress?: (progress: { loaded: number; total: number }) => void;
}

export const fileApi = {
  async list(path: string, options: ListOptions = {}): Promise<PaginatedResponse<FileItem>> {
    const token = localStorage.getItem('accessToken');
    
    const response = await axios.get('/files', {
      params: {
        path,
        ...options
      },
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });

    return response.data;
  },

  async upload(formData: FormData, options: UploadOptions = {}): Promise<any> {
    const token = localStorage.getItem('accessToken');
    
    const response = await axios.post('/upload', formData, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      onUploadProgress: options.onUploadProgress ? (progressEvent) => {
        if (options.onUploadProgress && progressEvent.total) {
          options.onUploadProgress({
            loaded: progressEvent.loaded,
            total: progressEvent.total
          });
        }
      } : undefined
    });

    return response.data;
  },

  async delete(paths: string[]): Promise<void> {
    const token = localStorage.getItem('accessToken');
    
    await axios.delete('/files', {
      data: { paths },
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
  },

  async move(paths: string[], destination: string): Promise<void> {
    const token = localStorage.getItem('accessToken');
    
    await axios.post('/files/move', 
      { paths, destination },
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }
    );
  },
};