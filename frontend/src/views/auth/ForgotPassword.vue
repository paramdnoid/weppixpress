<template>
  <AuthLayout>
    <template #auth-text>
      <div class="logo-lg">
        <span class="logo-txt">Willkommen bei {{ $appName }}</span>
      </div>
      <p class="text-muted font-size-15 w-75 mx-auto mt-1 mb-0">
        Du hast dein Passwort vergessen? Kein Problem.
      </p>
    </template>
    <div class="card border-0">
      <div class="card-body p-0">
        <div class="px-3 py-3">
          <div class="text-center">
            <h2 class="mb-0">Passwort vergessen</h2>
            <p class="text-muted mt-2">Gib deine E-Mail-Adresse ein. Wir senden dir einen Link zum Zurücksetzen.</p>
          </div>
        </div>
        <form @submit.prevent="submitForgotPassword">
          <div class="form-floating mb-3">
            <input v-model="email" type="email" id="email" class="form-control" placeholder="Deine E-Mail-Adresse"
              required />
            <label for="email">E-Mail-Adresse</label>
          </div>
          <div class="text-center">
            <button type="submit" class="btn btn-primary w-100">Passwort zurücksetzen</button>
          </div>
          <div v-if="message" class="alert alert-success mt-3 text-center">{{ message }}</div>
          <div v-if="error" class="alert alert-danger mt-3 text-center">{{ error }}</div>
        </form>
      </div>
    </div>
  </AuthLayout>
</template>

<script setup>
import AuthLayout from '@/layouts/AuthLayout.vue';
import { useAuthStore } from '@/store'
import { ref } from 'vue'

const email = ref('')
const message = ref('')
const error = ref('')
const auth = useAuthStore()

async function submitForgotPassword() {
  message.value = ''
  error.value = ''
  try {
    message.value = await auth.forgotPassword(email.value)
  } catch (err) {
    error.value = err.message
  }
}
</script>
