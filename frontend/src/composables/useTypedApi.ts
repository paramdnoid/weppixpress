/**
 * Typed API Composable with full TypeScript support
 */

import { ref, readonly, type Ref, type DeepReadonly } from 'vue'
import { AxiosError, type AxiosRequestConfig } from 'axios'
import api from '@/api/axios'
import type { 
  ApiResponse, 
  ApiError, 
  PaginatedApiResponse,
  ApiRequestConfig as CustomApiConfig 
} from '@/types'
import { isApiSuccess, Ok, Err, type Result, isOk } from '@/utils/typeGuards'

// Enhanced Request State
/*
interface RequestState<T> {
  data: Ref<T | null>
  error: Ref<ApiError | null>
  isLoading: Ref<boolean>
  isError: Ref<boolean>
  isSuccess: Ref<boolean>
}
*/

// Request Options
interface RequestOptions extends Partial<CustomApiConfig> {
  immediate?: boolean
  retry?: number
  retryDelay?: number
  onSuccess?: <T>(data: T) => void
  onError?: (error: ApiError) => void
  onFinally?: () => void
}

// Typed API Method Signatures
/*
interface TypedApiMethods {
  get: <T = unknown>(
    url: string,
    config?: AxiosRequestConfig
  ) => Promise<Result<T, ApiError>>

  post: <T = unknown, D = unknown>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig
  ) => Promise<Result<T, ApiError>>

  put: <T = unknown, D = unknown>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig
  ) => Promise<Result<T, ApiError>>

  patch: <T = unknown, D = unknown>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig
  ) => Promise<Result<T, ApiError>>

  delete: <T = unknown>(
    url: string,
    config?: AxiosRequestConfig
  ) => Promise<Result<T, ApiError>>
}
*/

/**
 * Create a typed API composable
 */
export function useTypedApi<T = unknown>() {
  // State
  const data = ref<T | null>(null)
  const error = ref<ApiError | null>(null)
  const isLoading = ref(false)
  const isError = ref(false)
  const isSuccess = ref(false)
  const abortController = ref<AbortController | null>(null)

  // Reset state
  const resetState = () => {
    data.value = null
    error.value = null
    isLoading.value = false
    isError.value = false
    isSuccess.value = false
  }

  // Convert Axios error to ApiError
  const toApiError = (err: unknown): ApiError => {
    if (err instanceof AxiosError) {
      const response = err.response?.data as ApiResponse | undefined
      
      if (response?.error) {
        return response.error
      }
      
      return {
        code: err.code || 'UNKNOWN_ERROR',
        message: err.message || 'An unknown error occurred',
        details: {
          status: err.response?.status,
          statusText: err.response?.statusText,
          data: err.response?.data
        }
      }
    }
    
    if (err instanceof Error) {
      return {
        code: 'CLIENT_ERROR',
        message: err.message,
        stack: err.stack
      }
    }
    
    return {
      code: 'UNKNOWN_ERROR',
      message: 'An unknown error occurred',
      details: { error: err }
    }
  }

  // Execute request with retry logic
  const executeRequest = async <R = T>(
    requestFn: () => Promise<R>,
    options: RequestOptions = {}
  ): Promise<Result<R, ApiError>> => {
    const {
      retry = 0,
      retryDelay = 1000,
      onSuccess,
      onError,
      onFinally
    } = options

    resetState()
    isLoading.value = true

    // Create abort controller
    abortController.value = new AbortController()

    let attempts = 0
    let lastError: ApiError | null = null

    try {
      while (attempts <= retry) {
        try {
          const result = await requestFn()
          
          data.value = result as T
          isSuccess.value = true
          
          onSuccess?.(result)
          
          return Ok(result)
        } catch (err) {
          lastError = toApiError(err)
          attempts++

          if (attempts <= retry) {
            await new Promise(resolve => setTimeout(resolve, retryDelay * attempts))
          }
        }
      }

      // All retries failed
      error.value = lastError
      isError.value = true
      
      if (lastError) {
        onError?.(lastError)
      }
      
      return Err(lastError!)
    } finally {
      isLoading.value = false
      abortController.value = null
      onFinally?.()
    }
  }

  // Abort current request
  const abort = () => {
    abortController.value?.abort()
    abortController.value = null
    isLoading.value = false
  }

  // Typed HTTP methods
  const get = async <R = T>(
    url: string,
    config?: AxiosRequestConfig,
    options?: RequestOptions
  ): Promise<Result<R, ApiError>> => {
    return executeRequest(
      () => api.get<ApiResponse<R>>(url, {
        ...config,
        signal: abortController.value?.signal
      }).then(res => {
        if (isApiSuccess(res.data)) {
          return res.data.data
        }
        throw toApiError(res.data.error)
      }),
      options
    )
  }

  const post = async <R = T, D = unknown>(
    url: string,
    payload?: D,
    config?: AxiosRequestConfig,
    options?: RequestOptions
  ): Promise<Result<R, ApiError>> => {
    return executeRequest(
      () => api.post<ApiResponse<R>>(url, payload, {
        ...config,
        signal: abortController.value?.signal
      }).then(res => {
        if (isApiSuccess(res.data)) {
          return res.data.data
        }
        throw toApiError(res.data.error)
      }),
      options
    )
  }

  const put = async <R = T, D = unknown>(
    url: string,
    payload?: D,
    config?: AxiosRequestConfig,
    options?: RequestOptions
  ): Promise<Result<R, ApiError>> => {
    return executeRequest(
      () => api.put<ApiResponse<R>>(url, payload, {
        ...config,
        signal: abortController.value?.signal
      }).then(res => {
        if (isApiSuccess(res.data)) {
          return res.data.data
        }
        throw toApiError(res.data.error)
      }),
      options
    )
  }

  const patch = async <R = T, D = unknown>(
    url: string,
    payload?: D,
    config?: AxiosRequestConfig,
    options?: RequestOptions
  ): Promise<Result<R, ApiError>> => {
    return executeRequest(
      () => api.patch<ApiResponse<R>>(url, payload, {
        ...config,
        signal: abortController.value?.signal
      }).then(res => {
        if (isApiSuccess(res.data)) {
          return res.data.data
        }
        throw toApiError(res.data.error)
      }),
      options
    )
  }

  const del = async <R = T>(
    url: string,
    config?: AxiosRequestConfig,
    options?: RequestOptions
  ): Promise<Result<R, ApiError>> => {
    return executeRequest(
      () => api.delete<ApiResponse<R>>(url, {
        ...config,
        signal: abortController.value?.signal
      }).then(res => {
        if (isApiSuccess(res.data)) {
          return res.data.data
        }
        throw toApiError(res.data.error)
      }),
      options
    )
  }

  return {
    // State (readonly to prevent external mutations)
    data: readonly(data) as DeepReadonly<Ref<T | null>>,
    error: readonly(error) as DeepReadonly<Ref<ApiError | null>>,
    isLoading: readonly(isLoading) as DeepReadonly<Ref<boolean>>,
    isError: readonly(isError) as DeepReadonly<Ref<boolean>>,
    isSuccess: readonly(isSuccess) as DeepReadonly<Ref<boolean>>,
    
    // Methods
    get,
    post,
    put,
    patch,
    delete: del,
    abort,
    resetState
  }
}

/**
 * Composable for paginated API requests
 */
export function usePaginatedApi<T = unknown>() {
  const page = ref(1)
  const pageSize = ref(20)
  const totalPages = ref(0)
  const totalItems = ref(0)
  const hasNext = ref(false)
  const hasPrevious = ref(false)
  const items = ref<T[]>([])
  
  const { 
    error, 
    isLoading, 
    isError, 
    isSuccess,
    get: apiGet,
    resetState: apiResetState 
  } = useTypedApi<PaginatedApiResponse<T>>()

  const fetchPage = async (
    url: string,
    params: Record<string, unknown> = {}
  ) => {
    const result = await apiGet(url, {
      params: {
        page: page.value,
        pageSize: pageSize.value,
        ...params
      }
    })

    if (isOk(result) && result.value?.data) {
      const paginatedData = result.value.data
      items.value = paginatedData.items
      totalPages.value = paginatedData.pagination.totalPages
      totalItems.value = paginatedData.pagination.totalItems
      hasNext.value = paginatedData.pagination.hasNext
      hasPrevious.value = paginatedData.pagination.hasPrevious
    }

    return result
  }

  const nextPage = async (url: string, params?: Record<string, unknown>) => {
    if (hasNext.value) {
      page.value++
      return fetchPage(url, params)
    }
    return Err({ code: 'NO_NEXT_PAGE', message: 'No next page available' })
  }

  const previousPage = async (url: string, params?: Record<string, unknown>) => {
    if (hasPrevious.value) {
      page.value--
      return fetchPage(url, params)
    }
    return Err({ code: 'NO_PREVIOUS_PAGE', message: 'No previous page available' })
  }

  const goToPage = async (
    pageNumber: number,
    url: string,
    params?: Record<string, unknown>
  ) => {
    if (pageNumber > 0 && pageNumber <= totalPages.value) {
      page.value = pageNumber
      return fetchPage(url, params)
    }
    return Err({ code: 'INVALID_PAGE', message: 'Invalid page number' })
  }

  const resetPagination = () => {
    page.value = 1
    pageSize.value = 20
    totalPages.value = 0
    totalItems.value = 0
    hasNext.value = false
    hasPrevious.value = false
    items.value = []
    apiResetState()
  }

  return {
    // State
    items: readonly(items) as DeepReadonly<Ref<T[]>>,
    page: readonly(page),
    pageSize,
    totalPages: readonly(totalPages),
    totalItems: readonly(totalItems),
    hasNext: readonly(hasNext),
    hasPrevious: readonly(hasPrevious),
    error,
    isLoading,
    isError,
    isSuccess,
    
    // Methods
    fetchPage,
    nextPage,
    previousPage,
    goToPage,
    resetPagination
  }
}