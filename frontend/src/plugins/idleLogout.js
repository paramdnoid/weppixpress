import { activityService } from '@/services/ActivityService';
import { useAuthStore } from '@/store';
import router from '@/router'

export function setupIdleLogout() {
  const auth = useAuthStore();

  activityService.on('idle', () => {
    auth.logout();
    // Only redirect if not already on the landing page (‘/’)
    if (router.currentRoute.value.path !== '/') {
      router.push({ name: 'Login' });
    }
  });
}