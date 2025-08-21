import axios from 'axios'

// Configure base URL correctly
const API_BASE_URL = 'http://localhost:3000/api'

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 30000
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      
      try {
        // Use auth store for proper refresh handling
        const { useAuthStore } = await import('@/stores/auth')
        const authStore = useAuthStore()
        
        await authStore.refresh()
        
        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${authStore.accessToken}`
        return api(originalRequest)
      } catch (refreshError) {
        // Refresh failed, logout through auth store
        console.warn('Token refresh failed:', refreshError.response?.data?.message || refreshError.message)
        
        const { useAuthStore } = await import('@/stores/auth')
        const authStore = useAuthStore()
        await authStore.logout()
        
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