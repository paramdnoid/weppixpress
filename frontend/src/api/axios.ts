import axios from 'axios'
import SecureTokenStorage from '@/utils/tokenStorage'

// Configure base URL correctly - use proxy in development
const API_BASE_URL = '/api'

// Auth handlers will be injected by auth store to avoid circular dependency
let authHandlers: {
  refresh: () => Promise<void>
  logout: () => Promise<void>
  getAccessToken: () => string | null
} | null = null

export const setAuthHandlers = (handlers: typeof authHandlers) => {
  authHandlers = handlers
}

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 30000 // 30 second timeout
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = SecureTokenStorage.getAccessToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor for token refresh and rate limiting
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    
    // Handle rate limiting (429) with exponential backoff
    if (error.response?.status === 429) {
      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1
      
      if (originalRequest._retryCount <= 3) {
        const delay = Math.pow(2, originalRequest._retryCount - 1) * 1000 // 1s, 2s, 4s
        console.warn(`Rate limited. Retrying in ${delay}ms (attempt ${originalRequest._retryCount}/3)`)
        
        await new Promise(resolve => setTimeout(resolve, delay))
        return api(originalRequest)
      }
    }
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        // Use injected auth handlers
        if (!authHandlers) {
          throw new Error('Auth handlers not initialized')
        }

        await authHandlers.refresh()

        // Retry original request with new token
        const token = authHandlers.getAccessToken()
        if (token) {
          originalRequest.headers.Authorization = `Bearer ${token}`
        }
        return api(originalRequest)
      } catch (refreshError: unknown) {
        // Refresh failed, logout through auth store
        const hasResponse = (e: unknown): e is { response?: { data?: { message?: string } }, message?: string } =>
          typeof e === 'object' && e !== null
        const message = hasResponse(refreshError)
          ? (refreshError.response?.data?.message || refreshError.message)
          : String(refreshError)
        console.warn('Token refresh failed:', message)

        if (authHandlers) {
          await authHandlers.logout()
        }

        // If we're not already on login page, redirect
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login'
        }

        return Promise.reject(refreshError)
      }
    }
    
    return Promise.reject(error)
  }
)

export default api
