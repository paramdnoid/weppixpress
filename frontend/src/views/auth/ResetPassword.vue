<template>
  <AuthLayout>
    <template #auth-text>
      <div class="logo-lg">
        <span class="logo-txt">Willkommen bei {{ $appName }}</span>
      </div>
      <p class="text-muted font-size-15 w-75 mx-auto mt-1 mb-0">
        Vergib ein neues Passwort für dein Konto.
      </p>
    </template>
    <div class="card border-0">
      <div class="card-body p-0">
        <div class="px-3 py-3">
          <div class="text-center">
            <h2 class="mb-0">Neues Passwort setzen</h2>
            <p class="text-muted mt-2">Gib dein neues Passwort ein und bestätige es.</p>
          </div>
          <form @submit.prevent="submitResetPassword" class="mt-3">
            <div class="form-group mb-3">
              <PasswordInput
                v-model="password"
                id="password"
                label="Neues Passwort"
                placeholder="Neues Passwort eingeben"
                required
              />
            </div>
            <div class="form-group mb-3">
              <PasswordInput
                v-model="confirmPassword"
                id="confirmPassword"
                label="Passwort bestätigen"
                placeholder="Passwort erneut eingeben"
                required
              />
            </div>
            <div class="text-center">
              <button type="submit" class="btn btn-primary w-100">Passwort zurücksetzen</button>
            </div>
            <div v-if="message" class="alert alert-success mt-3 text-center">{{ message }}</div>
            <div v-if="error" class="alert alert-danger mt-3 text-center">{{ error }}</div>
          </form>
        </div>
      </div>
    </div>
  </AuthLayout>
</template>

<script setup>
import AuthLayout from '@/layouts/AuthLayout.vue';
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import PasswordInput from '@/components/form/PasswordInput.vue';
import { useAuthStore } from '@/stores/useAuthStore.js'

const password = ref('');
const confirmPassword = ref('');

const route = useRoute()
const router = useRouter()
const token = ref(route.query.token || '')
const error = ref('')
const message = ref('')

const auth = useAuthStore()

async function submitResetPassword() {
  error.value = ''
  message.value = ''
  if (password.value !== confirmPassword.value) {
    error.value = 'Passwörter stimmen nicht überein.'
    return
  }
  if (!token.value) {
    error.value = 'Kein Token übergeben.'
    return
  }

  try {
    const result = await auth.resetPassword(token.value, password.value)
    message.value = result
    setTimeout(() => router.push('/login'), 3000)
  } catch (err) {
    error.value = err.message
  }
}
</script>
