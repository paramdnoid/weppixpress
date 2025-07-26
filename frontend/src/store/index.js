import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useStorage } from '@vueuse/core'

export const useAuthStore = defineStore('auth', () => {
  const rawUser = useStorage('user', null)
  const user = computed(() => {
    try {
      return rawUser.value ? JSON.parse(rawUser.value) : null
    } catch (e) {
      console.warn('Invalid user JSON:', e)
      return null
    }
  })

  const accessToken = useStorage('accessToken', null)
  const token = computed(() => accessToken.value)
  const expiresAt = computed(() => {
    if (!accessToken.value) return 0
    const parts = accessToken.value.split('.')
    if (parts.length !== 3) return 0
    const payload = parts[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/')
    try {
      const json = atob(payload)
      // Optionally handle URI-encoding
      const obj = JSON.parse(decodeURIComponent(escape(json)))
      return obj.exp ? obj.exp * 1000 : 0
    } catch {
      return 0
    }
  })
  const isAuthenticated = computed(() => !!user.value && !!accessToken.value)

  function setAuth(data) {
    // Accept either { accessToken, user } or { token }
    if (data.user) {
      rawUser.value = JSON.stringify(data.user)
    }
    // accessToken may be under data.accessToken or data.token
    const tok = data.accessToken || data.token
    accessToken.value = tok
  }

  function logout() {
    rawUser.value = null
    accessToken.value = null
  }

  async function login(email, password) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': import.meta.env.VITE_CSRF_SECRET
      },
      body: JSON.stringify({ email, password })
    })

    if (!res.ok) {
      const { error } = await res.json()
      throw new Error(error || 'Login fehlgeschlagen')
    }

    const data = await res.json()
    setAuth(data)
    return data
  }

  async function register(first_name, last_name, email, password) {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': import.meta.env.VITE_CSRF_SECRET
      },
      body: JSON.stringify({ first_name, last_name, email, password })
    })

    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error || 'Registrierung fehlgeschlagen')
    }

    setAuth(data)
    return data
  }

  async function forgotPassword(email) {
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': import.meta.env.VITE_CSRF_SECRET
      },
      body: JSON.stringify({ email })
    })

    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error || 'Fehler beim Zurücksetzen des Passworts')
    }

    return data.message || 'E-Mail zum Zurücksetzen gesendet'
  }

  async function resetPassword(tokenParam, password) {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': import.meta.env.VITE_CSRF_SECRET
      },
      body: JSON.stringify({ token: tokenParam, password })
    })

    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error || 'Fehler beim Zurücksetzen des Passworts')
    }

    return data.message || 'Passwort erfolgreich zurückgesetzt.'
  }

  async function resendVerification(fallbackEmail) {
    const emailVal = user.value?.email || fallbackEmail
    if (!emailVal) {
      throw new Error('Kein Benutzer angemeldet oder E-Mail fehlt.')
    }

    const res = await fetch('/api/auth/resend-verification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': import.meta.env.VITE_CSRF_SECRET
      },
      body: JSON.stringify({ email: emailVal })
    })

    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error || 'Fehler beim erneuten Senden')
    }

    return data.message || 'Verifizierungslink gesendet'
  }

  function initFromStorage() {
    // useStorage sorgt bereits für Persistenz. Hier können Side-Effects ausgeführt werden.
  }

  return {
    rawUser,
    user,
    accessToken,
    token,
    expiresAt,
    isAuthenticated,
    setAuth,
    logout,
    login,
    register,
    forgotPassword,
    resetPassword,
    resendVerification,
    initFromStorage
  }
})