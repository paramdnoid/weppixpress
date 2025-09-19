import api from './axios'
import type { 
  ApiResponse, 
  PaginatedApiResponse, 
  ApiRequestConfig,
  BatchOperationResult 
} from '@/types'
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios'

/**
 * Generic API service class for consistent API calls
 */
export class ApiService {
  /**
   * Make a GET request
   */
  static async get<T>(
    url: string, 
    config?: ApiRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const axiosConfig: AxiosRequestConfig = {
        ...config,
        params: config?.params,
        headers: config?.headers,
        timeout: config?.timeout,
        signal: config?.signal
      }
      
      const response: AxiosResponse<ApiResponse<T>> = await api.get(url, axiosConfig)
      return response.data
    } catch (error) {
      throw this.handleError(error)
    }
  }

  /**
   * Make a POST request
   */
  static async post<T, D = unknown>(
    url: string, 
    data?: D, 
    config?: ApiRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const axiosConfig: AxiosRequestConfig = {
        ...config,
        headers: config?.headers,
        timeout: config?.timeout,
        signal: config?.signal,
        onUploadProgress: config?.onUploadProgress
      }
      
      const response: AxiosResponse<ApiResponse<T>> = await api.post(url, data, axiosConfig)
      return response.data
    } catch (error) {
      throw this.handleError(error)
    }
  }

  /**
   * Make a PUT request
   */
  static async put<T, D = unknown>(
    url: string, 
    data?: D, 
    config?: ApiRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const axiosConfig: AxiosRequestConfig = {
        ...config,
        headers: config?.headers,
        timeout: config?.timeout,
        signal: config?.signal
      }
      
      const response: AxiosResponse<ApiResponse<T>> = await api.put(url, data, axiosConfig)
      return response.data
    } catch (error) {
      throw this.handleError(error)
    }
  }

  /**
   * Make a PATCH request
   */
  static async patch<T, D = unknown>(
    url: string, 
    data?: D, 
    config?: ApiRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const axiosConfig: AxiosRequestConfig = {
        ...config,
        headers: config?.headers,
        timeout: config?.timeout,
        signal: config?.signal
      }
      
      const response: AxiosResponse<ApiResponse<T>> = await api.patch(url, data, axiosConfig)
      return response.data
    } catch (error) {
      throw this.handleError(error)
    }
  }

  /**
   * Make a DELETE request
   */
  static async delete<T>(
    url: string, 
    config?: ApiRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const axiosConfig: AxiosRequestConfig = {
        ...config,
        headers: config?.headers,
        timeout: config?.timeout,
        signal: config?.signal
      }
      
      const response: AxiosResponse<ApiResponse<T>> = await api.delete(url, axiosConfig)
      return response.data
    } catch (error) {
      throw this.handleError(error)
    }
  }

  /**
   * Get paginated data
   */
  static async getPaginated<T>(
    url: string,
    page: number = 1,
    pageSize: number = 20,
    config?: ApiRequestConfig
  ): Promise<PaginatedApiResponse<T>> {
    try {
      const axiosConfig: AxiosRequestConfig = {
        ...config,
        params: {
          ...config?.params,
          page,
          pageSize
        }
      }
      
      const response: AxiosResponse<PaginatedApiResponse<T>> = await api.get(url, axiosConfig)
      return response.data
    } catch (error) {
      throw this.handleError(error)
    }
  }

  /**
   * Perform batch operations
   */
  static async batch<T, D = unknown>(
    url: string,
    items: D[],
    config?: ApiRequestConfig
  ): Promise<BatchOperationResult<T>> {
    try {
      const response: AxiosResponse<BatchOperationResult<T>> = await api.post(url, { items }, config)
      return response.data
    } catch (error) {
      throw this.handleError(error)
    }
  }

  /**
   * Upload file with progress tracking
   */
  static async uploadFile(
    url: string,
    file: File,
    onProgress?: (progress: number) => void,
    config?: ApiRequestConfig
  ): Promise<ApiResponse<{ url: string; id: string }>> {
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const axiosConfig: AxiosRequestConfig = {
        ...config,
        headers: {
          'Content-Type': 'multipart/form-data',
          ...config?.headers
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && onProgress) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
            onProgress(progress)
          }
          config?.onUploadProgress?.(progressEvent)
        }
      }
      
      const response: AxiosResponse<ApiResponse<{ url: string; id: string }>> = 
        await api.post(url, formData, axiosConfig)
      return response.data
    } catch (error) {
      throw this.handleError(error)
    }
  }

  /**
   * Download file
   */
  static async downloadFile(
    url: string,
    filename?: string,
    config?: ApiRequestConfig
  ): Promise<void> {
    try {
      const axiosConfig: AxiosRequestConfig = {
        ...config,
        responseType: 'blob',
        onDownloadProgress: config?.onDownloadProgress
      }
      
      const response = await api.get(url, axiosConfig)
      
      // Create download link
      const blob = new Blob([response.data])
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = filename || 'download'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)
    } catch (error) {
      throw this.handleError(error)
    }
  }

  /**
   * Handle API errors consistently
   */
  private static handleError(error: unknown): Error {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.message || error.message || 'An error occurred'
      const apiError = new Error(message)
      
      // Attach additional error info
      Object.assign(apiError, {
        code: error.response?.data?.code || error.code,
        status: error.response?.status,
        details: error.response?.data?.details,
        validationErrors: error.response?.data?.validationErrors
      })
      
      return apiError
    }
    
    if (error instanceof Error) {
      return error
    }
    
    return new Error('An unknown error occurred')
  }
}

// Export axios instance for direct use if needed
export { api }
