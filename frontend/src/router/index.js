import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/useAuthStore'

const routes = [
  { path: '/', name: 'Landing', component: () => import('@/views/Landing.vue') },
  { path: '/login', name: 'Login', component: () => import('@/views/auth/Login.vue') },
  { path: '/register', name: 'Register', component: () => import('@/views/auth/Register.vue') },
  { path: '/verify-email', name: 'VerifyEmail', component: () => import('@/views/auth/VerifyEmail.vue') },
  { path: '/forgot-password', name: 'ForgotPassword', component: () => import('@/views/auth/ForgotPassword.vue') },
  { path: '/reset-password', name: 'ResetPassword', component: () => import('@/views/auth/ResetPassword.vue') },
  { path: '/files', name: 'Files', component: () => import('@/views/Files.vue'), meta: { requiresAuth: true } },
  { path: '/flows', name: 'Flows', component: () => import('@/views/Flows.vue'), meta: { requiresAuth: true } },
  { path: '/mails', name: 'Mails', component: () => import('@/views/Mails.vue'), meta: { requiresAuth: true } },
  { path: '/meetings', name: 'Meetings', component: () => import('@/views/Meetings.vue'), meta: { requiresAuth: true } },
  { path: '/profile', name: 'Profile', component: () => import('@/views/Profile.vue'), meta: { requiresAuth: true } }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Auth Guard
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  if ((to.name === 'Login' || to.name === 'Register') && authStore.isAuthenticated) {
    return next({ name: 'Files' })
  }

  // Wenn accessToken da, aber user fehlt → /api/auth/me aufrufen
  if (authStore.accessToken && !authStore.user) {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${authStore.accessToken}` }
      })
      const data = await res.json()
      if (res.ok) {
        authStore.setAuth({ user: data, accessToken: authStore.accessToken })
      }
    } catch (err) {
      console.warn('Fehler beim Laden von /me:', err)
    }
  }

  if (to.meta.requiresAuth) {
    if (!authStore.isAuthenticated) {
      return next({ name: 'Login' })
    }
    if (!authStore.user.email_verified) {
      return next({ name: 'VerifyEmail' })
    }
  }

  next()
})

export default router
