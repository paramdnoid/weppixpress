<template>
  <AuthLayout>
    <template #auth-text>
      <div class="logo-lg">
        <span class="logo-txt">Complete signup</span>
      </div>
      <p class="text-muted font-size-15 w-75 mx-auto mt-1 mb-0">
        Confirm email to activate account.
      </p>
    </template>
    <div class="card border-0">
      <div class="card-body p-0">
        <div class="px-3 py-3">
          <div class="text-center">
            <h2 class="mb-0">Verifizierung</h2>
            <p class="text-muted mt-2">Email wird verifiziert...</p>
          </div>
        </div>
        <div class="text-center mt-2">
          <button @click="resend" class="btn btn-primary btn-sm" :disabled="loading">
            <span v-if="loading">Sende erneut...</span>
            <span v-else>Verifizierungslink erneut senden</span>
          </button>
          <p v-if="info" class="text-success mt-2">{{ info }}</p>
          <p v-if="error" class="text-danger">{{ error }}</p>
          <p v-else-if="success" class="text-success">Verifizierung erfolgreich!</p>
        </div>
      </div>
    </div>
  </AuthLayout>
</template>

<script setup>
import AuthLayout from '@/layouts/AuthLayout.vue';
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/store'

const route = useRoute()
const router = useRouter()
const error = ref(null)
const success = ref(false)

const auth = useAuthStore()
const loading = ref(false)
const info = ref('')

async function resend() {
  loading.value = true
  info.value = ''
  try {
    info.value = await auth.resendVerification(route.query.email)
  } catch (err) {
    info.value = err.message
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  const token = route.query.token
  if (!token) {
    info.value = 'überprüfe deine E-Mails.'
    return
  }

  try {
    const res = await fetch(`/api/auth/verify-email?token=${token}`)
    if (!res.ok) throw new Error('Token ungültig oder abgelaufen')
    success.value = true

    // Option: automatische Weiterleitung nach 3 Sekunden
    setTimeout(() => router.push('/login'), 3000)
  } catch (err) {
    error.value = err.message
  }
})
</script>