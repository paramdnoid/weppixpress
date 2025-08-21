import { defineStore } from 'pinia';
import api from '@/api/axios'

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  verified?: boolean;
  has2FA?: boolean;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  pending2FA: string | null;
  verifiedEmail: boolean;
}

// API configuration is handled in @/api/axios.ts

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: (() => {
      try {
        const item = localStorage.getItem('user')
        return item ? JSON.parse(item) : null
      } catch {
        return null
      }
    })(),
    accessToken: localStorage.getItem('accessToken') || null,
    pending2FA: null,
    verifiedEmail: false,
  }),

  actions: {
    async login(email: string, password: string) {
      try {
        const { data } = await api.post('/auth/login', { email, password })
        
        if (data.requires2FA) {
          this.pending2FA = data.userId
          this.accessToken = null
          this.user = null
        } else {
          this.accessToken = data.accessToken
          this.user = data.user
          localStorage.setItem('accessToken', data.accessToken)
          localStorage.setItem('user', JSON.stringify(data.user))
          api.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`
          this.pending2FA = null
        }
      } catch (err) {
        console.error('login error:', err)
        throw err
      }
    },

    async logout() {
      try {
        await api.post('/auth/logout')
      } catch (err) {
        console.error('logout error:', err)
      } finally {
        this.user = null
        this.accessToken = null
        this.pending2FA = null
        localStorage.removeItem('accessToken')
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
        localStorage.setItem('accessToken', data.accessToken)
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
        localStorage.setItem('accessToken', data.accessToken);
        
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
        localStorage.removeItem('accessToken');
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


// Initialize auth headers and validate existing token
if (localStorage.getItem('accessToken')) {
  const token = localStorage.getItem('accessToken');
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  
  // Validate token by making a test request
  api.get('/auth/me').catch((error) => {
    if (error.response?.status === 401) {
      console.warn('Stored token is invalid, clearing...');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      delete api.defaults.headers.common['Authorization'];
    }
  });
}