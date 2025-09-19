import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import api, { setAuthHandlers } from '@/api/axios'
import SecureTokenStorage from '@/utils/tokenStorage'
import { authLogger } from '@/utils/logger'
import type { User, LoginCredentials } from '@/types'

interface AuthSession {
  user: User
  accessToken: string
  expiresAt: number
  lastActivity: number
}

export const useAuthStore = defineStore('auth', () => {
  // Reactive state
  const user = ref<User | null>(null)
  const accessToken = ref<string | null>(null)
  const pending2FA = ref<string | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const lastActivity = ref(Date.now())

  // Persistent session storage with custom serialization
  const persistedSession = useLocalStorage<AuthSession | null>('auth:session', null, {
    serializer: {
      read: (value: string): AuthSession | null => {
        try {
          if (!value || value === 'null' || value === '[object Object]') return null
          return JSON.parse(value) as AuthSession
        } catch {
          console.warn('Failed to parse session from localStorage, clearing')
          return null
        }
      },
      write: (value: AuthSession | null): string => {
        try {
          return JSON.stringify(value)
        } catch {
          console.warn('Failed to serialize session to localStorage')
          return 'null'
        }
      }
    }
  })

  // Computed properties
  const isAuthenticated = computed(() => !!user.value && !!accessToken.value)
  const isPending2FA = computed(() => !!pending2FA.value)
  const hasError = computed(() => !!error.value)

  // Session timeout (30 minutes of inactivity)
  const SESSION_TIMEOUT = 30 * 60 * 1000
  const isSessionExpired = computed(() => {
    if (!persistedSession.value || typeof persistedSession.value !== 'object') return false
    return Date.now() - persistedSession.value.lastActivity > SESSION_TIMEOUT
  })

  // Initialize from persisted session
  const initializeFromStorage = () => {
    const storedToken = SecureTokenStorage.getAccessToken()

    if (persistedSession.value && typeof persistedSession.value === 'object' && !isSessionExpired.value && storedToken) {
      user.value = persistedSession.value.user
      accessToken.value = persistedSession.value.accessToken
      lastActivity.value = persistedSession.value.lastActivity

      // Set auth header
      api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`

      // Authenticate with WebSocket for online status tracking
      authenticateWithWebSocket(persistedSession.value.user.id)

    } else {
      clearSession()
    }
  }

  // Update session data
  const updateSession = (sessionData: Partial<AuthSession>) => {
    if (!persistedSession.value) {
      persistedSession.value = {
        user: user.value!,
        accessToken: accessToken.value!,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
        lastActivity: Date.now()
      }
    }

    persistedSession.value = {
      ...persistedSession.value,
      ...sessionData,
      lastActivity: Date.now()
    }

    lastActivity.value = Date.now()
  }

  // Clear session
  const clearSession = () => {
    user.value = null
    accessToken.value = null
    pending2FA.value = null
    error.value = null
    persistedSession.value = null
    SecureTokenStorage.clearAll()
    delete api.defaults.headers.common['Authorization']
  }

  // Disconnect from WebSocket
  const disconnectFromWebSocket = () => {
    // Import the global WebSocket service dynamically to avoid circular dependencies
    import('@/services/globalWebSocketService').then((module) => {
      const globalWebSocketService = module.default

      // Send logout message before disconnecting if user is authenticated
      if (user.value?.id && globalWebSocketService.isConnected.value) {
        globalWebSocketService.send({
          type: 'logout',
          userId: user.value.id
        })

        // Wait a bit for message to be sent, then disconnect
        setTimeout(() => {
          globalWebSocketService.disconnect()
        }, 100)
      } else {
        globalWebSocketService.disconnect()
      }
    }).catch(error => {
      console.warn('Failed to import global WebSocket service for disconnect:', error)
    })
  }


  // Actions
  const login = async (credentials: LoginCredentials): Promise<void> => {
    isLoading.value = true
    error.value = null

    try {
      const { data } = await api.post<{
        requires2FA?: boolean
        userId?: string
        accessToken?: string
        refreshToken?: string
        user?: User
      }>('/auth/login', credentials)

      if (data.requires2FA) {
        pending2FA.value = data.userId || null
        accessToken.value = null
        user.value = null
      } else if (data.accessToken && data.user) {
        accessToken.value = data.accessToken
        user.value = data.user
        SecureTokenStorage.setAccessToken(data.accessToken)
        api.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`
        pending2FA.value = null

        // Update session
        updateSession({
          user: data.user,
          accessToken: data.accessToken
        })

        // Authenticate with WebSocket for online status tracking
        authenticateWithWebSocket(data.user.id)

      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Login failed'
      authLogger.error('Login failed', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const logout = async (): Promise<void> => {
    try {
      await api.post('/auth/logout')
    } catch (err) {
      authLogger.error('Logout failed', err)
    } finally {
      // Disconnect from WebSocket before clearing session
      disconnectFromWebSocket()
      clearSession()
    }
  }

  const fetchUser = async () => {
    const response = await api.get('/auth/me')
    if (response.data.user) {
      user.value = response.data.user
      updateSession({ user: response.data.user })
    }
    return response
  }

  const register = async (first_name: string, last_name: string, email: string, password: string) => {
    try {
      await api.post('/auth/register', { first_name, last_name, email, password })
    } catch (err) {
      authLogger.error('Registration failed', err)
      throw err
    }
  }

  const verify2FA = async (code: string) => {
    try {
      const { data } = await api.post('/auth/verify-2fa', {
        userId: pending2FA.value,
        code
      })

      accessToken.value = data.accessToken
      user.value = data.user
      SecureTokenStorage.setAccessToken(data.accessToken)
      api.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`
      pending2FA.value = null

      // Update session
      updateSession({
        user: data.user,
        accessToken: data.accessToken
      })

      // Authenticate with WebSocket for online status tracking
      authenticateWithWebSocket(data.user.id)

    } catch (err) {
      authLogger.error('2FA verification failed', err)
      throw err
    }
  }

  const refresh = async () => {
    try {
      const { data } = await api.post('/auth/refresh')
      accessToken.value = data.accessToken
      SecureTokenStorage.setAccessToken(data.accessToken)

      // Update user if provided
      if (data.user) {
        user.value = data.user
      }

      // Set authorization header for future requests
      api.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`

      // Update session
      updateSession({
        accessToken: data.accessToken,
        ...(data.user && { user: data.user })
      })

    } catch (err) {
      authLogger.error('Token refresh failed', err)
      disconnectFromWebSocket()
      clearSession()
      throw err
    }
  }

  const forgotPassword = async (email: string) => {
    try {
      await api.post('/auth/forgot-password', { email })
    } catch (err) {
      authLogger.error('Forgot password failed', err)
      throw err
    }
  }

  const resetPassword = async (token: string, password: string) => {
    try {
      await api.post('/auth/reset-password', { token, password })
    } catch (err) {
      authLogger.error('Reset password failed', err)
      throw err
    }
  }

  const setup2FA = async () => {
    try {
      const { data } = await api.post('/auth/setup-2fa')
      return data // { secret, qr }
    } catch (err) {
      authLogger.error('2FA setup failed', err)
      throw err
    }
  }

  const enable2FA = async (secret: string, code: string) => {
    try {
      await api.post('/auth/enable-2fa', { secret, code })
    } catch (err) {
      authLogger.error('2FA enable failed', err)
      throw err
    }
  }

  const disable2FA = async () => {
    try {
      await api.post('/auth/disable-2fa')
    } catch (err) {
      authLogger.error('2FA disable failed', err)
      throw err
    }
  }

  // Activity tracking
  const updateActivity = () => {
    if (isAuthenticated.value) {
      updateSession({})
    }
  }

  // WebSocket authentication helper
  const authenticateWithWebSocket = (userId: string) => {
    // Import the global WebSocket service dynamically to avoid circular dependencies
    import('@/services/globalWebSocketService').then((module) => {
      const globalWebSocketService = module.default

      // Connect if not already connected
      if (!globalWebSocketService.isConnected.value) {
        globalWebSocketService.connect().then(() => {
          // Send authentication after connection
          globalWebSocketService.authenticate(userId)
        }).catch(error => {
          console.warn('Failed to connect to global WebSocket for online status:', error)
        })
      } else {
        // Send authentication immediately if already connected
        globalWebSocketService.authenticate(userId)
      }
    }).catch(error => {
      console.warn('Failed to import global WebSocket service:', error)
    })
  }


  // Auto-refresh token before expiration
  const autoRefresh = ref<ReturnType<typeof setTimeout> | null>(null)

  const startAutoRefresh = () => {
    if (autoRefresh.value) {
      clearTimeout(autoRefresh.value)
    }

    // Refresh 5 minutes before expiration
    const refreshTime = (persistedSession.value?.expiresAt ?? 0) - Date.now() - (5 * 60 * 1000)

    if (refreshTime > 0) {
      autoRefresh.value = setTimeout(async () => {
        try {
          await refresh()
          startAutoRefresh() // Schedule next refresh
        } catch (err) {
          authLogger.error('Auto-refresh failed', err)
        }
      }, refreshTime)
    }
  }

  // Watch for session changes
  watch([user, accessToken], () => {
    if (isAuthenticated.value) {
      startAutoRefresh()
    } else if (autoRefresh.value) {
      clearTimeout(autoRefresh.value)
      autoRefresh.value = null
    }
  })

  // Initialize store - delay to avoid immediate validation on page load

  return {
    // State
    user: computed(() => user.value),
    accessToken: computed(() => accessToken.value),
    pending2FA: computed(() => pending2FA.value),
    isLoading: computed(() => isLoading.value),
    error: computed(() => error.value),

    // Computed
    isAuthenticated,
    isPending2FA,
    hasError,
    isSessionExpired,

    // Actions
    login,
    logout,
    fetchUser,
    register,
    verify2FA,
    refresh,
    forgotPassword,
    resetPassword,
    setup2FA,
    enable2FA,
    disable2FA,
    updateActivity,
    clearSession,
    initializeFromStorage
  }
})

// Initialize auth handlers for axios interceptor to avoid circular dependency
setAuthHandlers({
  refresh: async () => {
    const store = useAuthStore()
    await store.refresh()
  },
  logout: async () => {
    const store = useAuthStore()
    await store.logout()
  },
  getAccessToken: () => {
    const store = useAuthStore()
    return store.accessToken
  }
})

// Initialize auth headers and validate existing token
const existingToken = SecureTokenStorage.getAccessToken()
if (existingToken) {
  api.defaults.headers.common['Authorization'] = `Bearer ${existingToken}`;
  
  // Validate token by making a test request
  api.get('/auth/me').catch((error) => {
    if (error.response?.status === 401) {
      authLogger.warn('Stored token is invalid, clearing...');
      SecureTokenStorage.clearAll();
      localStorage.removeItem('user');
      delete api.defaults.headers.common['Authorization'];
    }
  });
}