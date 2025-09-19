import { defineStore } from 'pinia';
import api, { setAuthHandlers } from '@/api/axios'
import SecureTokenStorage from '@/utils/tokenStorage'
import type { User, LoginCredentials } from '@/types'


// API configuration is handled in @/api/axios.ts

interface AuthStoreState {
  user: User | null
  accessToken: string | null
  pending2FA: string | null
  verifiedEmail: boolean
  isLoading: boolean
  error: string | null
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthStoreState => ({
    user: (() => {
      try {
        const item = localStorage.getItem('user')
        return item ? JSON.parse(item) : null
      } catch {
        return null
      }
    })(),
    accessToken: SecureTokenStorage.getAccessToken() || null,
    pending2FA: null,
    verifiedEmail: false,
    isLoading: false,
    error: null,
  }),

  actions: {
    async login(credentials: LoginCredentials): Promise<void> {
      this.isLoading = true
      this.error = null
      
      try {
        const { data } = await api.post<{
          requires2FA?: boolean
          userId?: string
          accessToken?: string
          refreshToken?: string
          user?: User
        }>('/auth/login', credentials)
        
        if (data.requires2FA) {
          this.pending2FA = data.userId || null
          this.accessToken = null
          this.user = null
        } else if (data.accessToken && data.user) {
          this.accessToken = data.accessToken
          this.user = data.user
          SecureTokenStorage.setAccessToken(data.accessToken)
          localStorage.setItem('user', JSON.stringify(data.user))
          api.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`
          this.pending2FA = null
        }
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Login failed'
        console.error('login error:', err)
        throw err
      } finally {
        this.isLoading = false
      }
    },

    async logout(): Promise<void> {
      try {
        await api.post('/auth/logout')
      } catch (err) {
        console.error('logout error:', err)
      } finally {
        this.user = null
        this.accessToken = null
        this.pending2FA = null
        this.error = null
        SecureTokenStorage.clearAll()
        localStorage.removeItem('user')
        delete api.defaults.headers.common['Authorization']
      }
    },

    async fetchUser() {
      const response = await api.get('/auth/me')
      return response
    },

    async register(first_name: string, last_name: string, email: string, password: string) {
      try {
        await api.post('/auth/register', { first_name, last_name, email, password });
      } catch (err) {
        console.error('register error:', err);
        throw err;
      }
    },

    async verify2FA(code: string) {
      try {
        const { data } = await api.post('/auth/verify-2fa', {
          userId: this.pending2FA, code
        });
        this.accessToken = data.accessToken;
        this.user = data.user;
        SecureTokenStorage.setAccessToken(data.accessToken)
        localStorage.setItem('user', JSON.stringify(data.user))
        api.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;
        this.pending2FA = null;
      } catch (err) {
        console.error('verify2FA error:', err);
        throw err;
      }
    },

    async refresh() {
      try {
        const { data } = await api.post('/auth/refresh');
        this.accessToken = data.accessToken;
        SecureTokenStorage.setAccessToken(data.accessToken);
        
        // Update user if provided
        if (data.user) {
          this.user = data.user;
          localStorage.setItem('user', JSON.stringify(data.user));
        }
        
        // Set authorization header for future requests
        api.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;
      } catch (err) {
        console.error('refresh error:', err);
        // Clear invalid tokens
        this.accessToken = null;
        this.user = null;
        SecureTokenStorage.clearAll();
        localStorage.removeItem('user');
        delete api.defaults.headers.common['Authorization'];
        throw err;
      }
    },
    async forgotPassword(email: string) {
      try {
        await api.post('/auth/forgot-password', { email });
      } catch (err) {
        console.error('forgotPassword error:', err);
        throw err;
      }
    },
    async resetPassword(token: string, password: string) {
      try {
        await api.post('/auth/reset-password', { token, password });
      } catch (err) {
        console.error('resetPassword error:', err);
        throw err;
      }
    },
    async setup2FA() {
      try {
        const { data } = await api.post('/auth/setup-2fa');
        return data; // { secret, qr }
      } catch (err) {
        console.error('setup2FA error:', err);
        throw err;
      }
    },
    async enable2FA(secret: string, code: string) {
      try {
        await api.post('/auth/enable-2fa', { secret, code });
      } catch (err) {
        console.error('enable2FA error:', err);
        throw err;
      }
    },
    async disable2FA() {
      try {
        await api.post('/auth/disable-2fa');
      } catch (err) {
        console.error('disable2FA error:', err);
        throw err;
      }
    }
  },
});

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
      console.warn('Stored token is invalid, clearing...');
      SecureTokenStorage.clearAll();
      localStorage.removeItem('user');
      delete api.defaults.headers.common['Authorization'];
    }
  });
}