import api from './axios'
import type { FileItem, PaginatedResponse } from '@/types'

interface ListOptions {
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  search?: string
  page?: number
  limit?: number
}

interface UploadOptions {
  onUploadProgress?: (progress: { loaded: number; total: number }) => void
}

export const fileApi = {
  async list(path: string, options: ListOptions = {}): Promise<PaginatedResponse<FileItem>> {
    const response = await api.get('/files', {
      params: { path, ...options }
    })
    return response.data
  },

  async upload(formData: FormData, options: UploadOptions = {}): Promise<any> {
    const response = await api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: options.onUploadProgress ? (progressEvent) => {
        if (options.onUploadProgress && progressEvent.total) {
          options.onUploadProgress({
            loaded: progressEvent.loaded,
            total: progressEvent.total
          })
        }
      } : undefined
    })
    return response.data
  },

  async delete(paths: string[]): Promise<void> {
    await api.delete('/files', { data: { paths } })
  },

  async move(paths: string[], destination: string): Promise<void> {
    await api.post('/files/move', { paths, destination })
  },

  async copy(paths: string[], destination: string): Promise<void> {
    await api.post('/files/copy', { paths, destination })
  },

  async createFolder(name: string, path = ''): Promise<void> {
    await api.post('/files/folder', { name, path })
  },

  async rename(oldPath: string, newName: string): Promise<void> {
    await api.patch('/files/rename', { oldPath, newName })
  }
}
