import { activityService } from '../services/ActivityService';
import { useAuthStore } from '../store';
import router from '../router';

export function setupIdleLogout() {
  const auth = useAuthStore();
  activityService.on('idle', () => {
    auth.logout();
    router.push({ name: 'Login' });
  });
}