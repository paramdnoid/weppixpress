<template>
  <AuthLayout>
    <template #auth-text>
      <div class="logo-lg">
        <span class="logo-txt">Willkommen bei weppixpress</span>
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
        <form @submit.prevent="onForgot" :class="{ 'form-disabled': loading }">
          <div class="form-floating mb-3">
            <input v-model="email" type="email" id="email" class="form-control" placeholder="Deine E-Mail-Adresse"
              required />
            <label for="email">E-Mail-Adresse</label>
          </div>
          <div class="text-center">
            <button type="submit" class="btn btn-primary w-100" :disabled="loading">
              <span v-if="loading">Wird gesendet...</span>
              <span v-else>Passwort zurücksetzen</span>
            </button>
            <div v-if="info">{{ info }}</div>
            <div v-if="error">{{ error }}</div>
          </div>
        </form>
      </div>
    </div>
  </AuthLayout>
</template>

<script setup>
import AuthLayout from '@/layouts/AuthLayout.vue';
import { ref } from 'vue';
import { useAuthStore } from '@/stores/auth';
const loading = ref(false);
const store = useAuthStore();
const email = ref(''); const info = ref(''); const error = ref('');
async function onForgot() {
  loading.value = true;
  try {
    await store.forgotPassword(email.value);
    info.value = 'Bitte Postfach prüfen!';
    window.$toast('E-Mail zum Zurücksetzen wurde verschickt.', { type: 'info' });
    email.value = '';
    error.value = '';
  } catch (e) {
    error.value = e.response?.data?.message || 'Fehler';
    info.value = '';
  } finally {
    loading.value = false;
  }
}
</script>

<style>
.form-disabled {
  pointer-events: none;
  opacity: 0.6;
}
</style>