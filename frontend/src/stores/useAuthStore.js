import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useStorage } from '@vueuse/core'

export const useAuthStore = defineStore('auth', () => {
  const rawUser = useStorage('user', null)
  const user = computed(() => rawUser.value ? JSON.parse(rawUser.value) : null)
  const accessToken = useStorage('accessToken', null)
  const isAuthenticated = computed(() => !!user.value && !!accessToken.value)

  function setAuth(data) {
    rawUser.value = JSON.stringify(data.user)
    accessToken.value = data.accessToken
  }

  function logout() {
    rawUser.value = null
    accessToken.value = null
  }

  async function login(email, password) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

  async function register(firstName, lastName, email, password) {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName, lastName, email, password })
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    })

    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error || 'Fehler beim Zurücksetzen des Passworts')
    }

    return data.message || 'E-Mail zum Zurücksetzen gesendet'
  }

  async function resetPassword(token, password) {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password })
    })

    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error || 'Fehler beim Zurücksetzen des Passworts')
    }

    return data.message || 'Passwort erfolgreich zurückgesetzt.'
  }

  return { rawUser, user, accessToken, isAuthenticated, setAuth, logout, login, register, forgotPassword, resetPassword }
})
