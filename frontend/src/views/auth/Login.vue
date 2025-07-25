<template>
  <AuthLayout>
    <template #auth-text>
      <div class="logo-lg">
        <span class="logo-txt">Willkommen bei {{ $appName }}</span>
      </div>
      <p class="text-muted font-size-15 w-75 mx-auto mt-1 mb-0">
        Melde dich an und verwalte deine Dateien sicher und schnell.
      </p>
    </template>
    <div class="card border-0">
      <div class="card-body p-0">
        <div class="px-3 py-3">
          <div class="text-center">
            <h2 class="mb-0">Login</h2>
            <p class="text-muted mt-2">Gib deine Zugangsdaten ein, um fortzufahren.</p>
          </div>
          <form @submit.prevent="login">
            <div class="form-floating mb-3">
              <input v-model="email" type="email" class="form-control" id="floatingEmail" placeholder="name@example.com"
                required>
              <label for="floatingEmail">E-Mail</label>
            </div>

            <PasswordInput v-model="password" id="floatingPassword" label="Passwort" placeholder="Passwort" />
            <div v-if="error" class="alert alert-danger">{{ error }}</div>
            <div class="form-check form-check-primary d-flex justify-content-between">
              <div class="d-flex align-items-center">
                <input class="form-check-input" type="checkbox" id="remember-check" name="remember_me">
                <label class="form-check-label font-size-12 ms-1" for="remember-check" style="margin-top: 4px;">
                  Angemeldet bleiben
                </label>
              </div>
              <div class="d-flex align-items-center">
                <a href="/forgot-password" class="text-muted text-decoration-underline font-size-12"
                  style="margin-top: 5px;">
                  Passwort vergessen?
                </a>
              </div>
            </div>
            <div class="d-grid mt-3">
              <button class="btn btn-primary" type="submit" :disabled="loading">
                <span v-if="loading">Wird geladen...</span>
                <span v-else>Login</span>
              </button>
            </div>
            <div class="mt-4 pt-3 text-center">
              <p class="text-muted mb-0">Noch kein Konto?
                <router-link to="/register" class="fw-semibold text-decoration-underline">Jetzt
                  registrieren</router-link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  </AuthLayout>
</template>

<script setup>
import AuthLayout from '@/layouts/AuthLayout.vue';
import PasswordInput from '@/components/form/PasswordInput.vue';

import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/useAuthStore'

const email = ref('')
const password = ref('')
const error = ref(null)
const loading = ref(false)

const router = useRouter()
const auth = useAuthStore()

async function login() {
  loading.value = true
  error.value = null
  try {
    const data = await auth.login(email.value, password.value)

    if (data?.user?.email_verified) {
      router.replace({ name: 'Files' })
    } else {
      router.replace({ name: 'VerifyEmail' })
    }
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}
</script>
