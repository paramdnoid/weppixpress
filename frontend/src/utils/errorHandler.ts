import type { ApiError } from '@/types/files'

export class AppError extends Error {
  public code?: string
  public status?: number

  constructor(message: string, code?: string, status?: number) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.status = status
  }
}

export function handleApiError(error: unknown): ApiError {
  if (error instanceof AppError) {
    return {
      message: error.message,
      code: error.code,
      status: error.status
    }
  }

  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as any
    return {
      message: axiosError.response?.data?.message || axiosError.message || 'An error occurred',
      code: axiosError.response?.data?.code,
      status: axiosError.response?.status
    }
  }

  if (error instanceof Error) {
    return {
      message: error.message
    }
  }

  return {
    message: 'An unknown error occurred'
  }
}

export function getErrorMessage(error: unknown): string {
  const apiError = handleApiError(error)
  return apiError.message
}

export function isNetworkError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'code' in error) {
    const err = error as any
    return err.code === 'NETWORK_ERROR' || err.code === 'ECONNABORTED'
  }
  return false
}

export function isAuthError(error: unknown): boolean {
  const apiError = handleApiError(error)
  return apiError.status === 401 || apiError.status === 403
}

export function createNotificationFromError(error: unknown): {
  title: string
  message: string
  type: 'error' | 'warning'
} {
  const apiError = handleApiError(error)
  
  if (isNetworkError(error)) {
    return {
      title: 'Connection Error',
      message: 'Please check your internet connection and try again.',
      type: 'error'
    }
  }

  if (isAuthError(error)) {
    return {
      title: 'Authentication Error',
      message: 'Please log in again to continue.',
      type: 'warning'
    }
  }

  return {
    title: 'Error',
    message: apiError.message,
    type: 'error'
  }
}