import { defineStore } from 'pinia';
import axios from 'axios';

axios.defaults.baseURL = 'http://localhost:3001/api';
axios.defaults.withCredentials = true;

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: (() => {
      try {
        const item = localStorage.getItem('user');
        return item ? JSON.parse(item) : null;
      } catch {
        return null;
      }
    })(),
    accessToken: localStorage.getItem('accessToken') || null,
    pending2FA: null, // Falls 2FA nach Login nötig
    verifiedEmail: false,
  }),
  actions: {
    async register(first_name, last_name, email, password) {
      try {
        await axios.post('/auth/register', { first_name, last_name, email, password });
      } catch (err) {
        console.error('register error:', err);
        throw err;
      }
    },
    async login(email, password) {
      try {
        const { data } = await axios.post('/auth/login', { email, password });
        if (data.requires2FA) {
          this.pending2FA = data.userId;
          this.accessToken = null;
          this.user = null;
        } else {
          this.accessToken = data.accessToken;
          localStorage.setItem('accessToken', data.accessToken);
          localStorage.setItem('user', JSON.stringify(data.user));
          this.user = data.user;
          this.pending2FA = null;
          axios.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;
        }
      } catch (err) {
        console.error('login error:', err);
        throw err;
      }
    },
    async verify2FA(code) {
      try {
        const { data } = await axios.post('/auth/verify-2fa', {
          userId: this.pending2FA, code
        });
        this.accessToken = data.accessToken;
        this.user = data.user;
        axios.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;
        this.pending2FA = null;
      } catch (err) {
        console.error('verify2FA error:', err);
        throw err;
      }
    },
    async logout() {
      try {
        await axios.post('/auth/logout');
        this.user = null;
        this.accessToken = null;
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        this.pending2FA = null;
        delete axios.defaults.headers.common['Authorization'];
      } catch (err) {
        console.error('logout error:', err);
        throw err;
      }
    },
    async refresh() {
      try {
        const { data } = await axios.post('/auth/refresh');
        this.accessToken = data.accessToken;
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('user', JSON.stringify(data.user));
        axios.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;
      } catch (err) {
        console.error('refresh error:', err);
        throw err;
      }
    },
    async forgotPassword(email) {
      try {
        await axios.post('/auth/forgot-password', { email });
      } catch (err) {
        console.error('forgotPassword error:', err);
        throw err;
      }
    },
    async resetPassword(token, password) {
      try {
        await axios.post('/auth/reset-password', { token, password });
      } catch (err) {
        console.error('resetPassword error:', err);
        throw err;
      }
    },
    async setup2FA() {
      try {
        const { data } = await axios.post('/auth/setup-2fa');
        return data; // { secret, qr }
      } catch (err) {
        console.error('setup2FA error:', err);
        throw err;
      }
    },
    async enable2FA(secret, code) {
      try {
        await axios.post('/auth/enable-2fa', { secret, code });
      } catch (err) {
        console.error('enable2FA error:', err);
        throw err;
      }
    },
    async disable2FA() {
      try {
        await axios.post('/auth/disable-2fa');
      } catch (err) {
        console.error('disable2FA error:', err);
        throw err;
      }
    },
    async fetchUser() {
      try {
        return await axios.get('/auth/me', {
          headers: {
            Authorization: `Bearer ${this.accessToken}`
          }
        });
      } catch (err) {
        console.error('fetchProtected error:', err);
        throw err;
      }
    },
  },
});

// ---- AXIOS INTERCEPTOR: 401 → AUTOMATISCHER REFRESH ----
axios.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    // Nur bei 401 und wenn noch kein Retry-Versuch
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        // Pinia Store dynamisch holen (sonst kein this!)
        const { useAuthStore } = await import('./auth');
        const auth = useAuthStore();
        await auth.refresh();
        // Authorization-Header mit neuem AccessToken setzen
        originalRequest.headers['Authorization'] = `Bearer ${auth.accessToken}`;
        return axios(originalRequest);
      } catch (refreshError) {
        // Refresh fehlgeschlagen → ausloggen!
        const { useAuthStore } = await import('./auth');
        const auth = useAuthStore();
        auth.logout();
      }
    }
    return Promise.reject(error);
  }
);

if (localStorage.getItem('accessToken')) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${localStorage.getItem('accessToken')}`;
}