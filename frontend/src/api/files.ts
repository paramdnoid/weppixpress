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
    const params = new URLSearchParams();
    params.append('path', path);
    
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, String(value));
      }
    });

    const token = localStorage.getItem('accessToken');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`/api/files?${params}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to list files: ${response.statusText}`);
    }

    return response.json();
  },

  async upload(formData: FormData, _options: UploadOptions = {}): Promise<any> {
    const token = localStorage.getItem('accessToken');
    const headers: HeadersInit = {};
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch('/api/upload', {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    return response.json();
  },

  async delete(paths: string[]): Promise<void> {
    const token = localStorage.getItem('accessToken');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch('/api/files', {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ paths }),
    });

    if (!response.ok) {
      throw new Error(`Delete failed: ${response.statusText}`);
    }
  },

  async move(paths: string[], destination: string): Promise<void> {
    const token = localStorage.getItem('accessToken');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch('/api/files/move', {
      method: 'POST',
      headers,
      body: JSON.stringify({ paths, destination }),
    });

    if (!response.ok) {
      throw new Error(`Move failed: ${response.statusText}`);
    }
  },
};