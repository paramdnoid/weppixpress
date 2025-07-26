import { useAuthStore } from '@/store';
import router from '@/router';

export default async function fetchWithAuth(input, init = {}) {
  const auth = useAuthStore();
  init.headers = init.headers || {};

  if (auth.token) {
    init.headers['Authorization'] = `Bearer ${auth.token}`;
  }
  init.credentials = 'include';

  let res = await fetch(input, init);
  if (res.status === 401) {
    const refreshRes = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
    if (refreshRes.ok) {
      const { token: newToken } = await refreshRes.json();
      auth.login(newToken);
      init.headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(input, init);
    } else {
      auth.logout();
      router.push({ name: 'Login' });
      throw new Error('Nicht authentifiziert');
    }
  }
  return res;
}