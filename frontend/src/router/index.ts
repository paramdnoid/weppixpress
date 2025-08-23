import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import Landing from '@/views/Landing.vue';
import Login from '@/views/auth/Login.vue';
import { useAuthStore } from '@/stores/auth';

const routes: RouteRecordRaw[] = [
  { path: '/', component: Landing },
  { path: '/login', component: Login },
  { path: '/register', name: 'Register', component: () => import('@/views/auth/Register.vue') },
  { path: '/verify-email', name: 'VerifyEmail', component: () => import('@/views/auth/VerifyEmail.vue') },
  { path: '/forgot-password', name: 'ForgotPassword', component: () => import('@/views/auth/ForgotPassword.vue') },
  { path: '/reset-password', name: 'ResetPassword', component: () => import('@/views/auth/ResetPassword.vue') },
  
  { path: '/files', name: 'Files', component: () => import('@/views/Files.vue'), meta: { requiresAuth: true } },
  { path: '/flows', name: 'Flows', component: () => import('@/views/Flows.vue'), meta: { requiresAuth: true } },
  { path: '/mails', name: 'Mails', component: () => import('@/views/Mails.vue'), meta: { requiresAuth: true } },
  { path: '/meetings', name: 'Meetings', component: () => import('@/views/Meetings.vue'), meta: { requiresAuth: true } },
  { path: '/profile', name: 'Profile', component: () => import('@/views/Profile.vue'), meta: { requiresAuth: true } },
  { path: '/dashboard', name: 'Dashboard', component: () => import('@/views/Dashboard.vue'), meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/error-analytics', name: 'ErrorAnalytics', component: () => import('@/views/ErrorAnalytics.vue'), meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/admin/users', name: 'UserManagement', component: () => import('@/views/UserManagement.vue'), meta: { requiresAuth: true, requiresAdmin: true } }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, _from, next) => {
  try {
    const auth = useAuthStore();
    
    // Check authentication first
    if (to.meta.requiresAuth && !auth.user) {
      return next('/login');
    }
    
    // Check admin role if required
    if (to.meta.requiresAdmin) {
      if (!auth.user) {
        return next('/login');
      }
      if (auth.user.role !== 'admin') {
        return next('/'); // Redirect non-admin users to home
      }
    }
    
    next();
  } catch (err) {
    console.error('Navigation guard error:', err);
    next(err instanceof Error ? err : new Error(String(err)));
  }
});

export default router;
