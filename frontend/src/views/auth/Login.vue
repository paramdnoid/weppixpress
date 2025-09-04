<template>
  <AuthLayout>
    <template #auth-text>
      <div class="logo-lg">
        <span class="logo-txt">Willkommen bei weppixpress</span>
      </div>
      <p class="text-muted font-size-15 w-75 mx-auto mt-1 mb-0">
        Melde dich an und verwalte deine Dateien sicher und schnell.
      </p>
    </template>
    <div class="px-3 py-3">
      <div class="text-center">
        <h2 class="mb-0">Login</h2>
        <p class="text-muted mt-2">Gib deine Zugangsdaten ein, um fortzufahren.</p>
      </div>
      <form @submit.prevent="onLogin">
        <div class="form-floating mb-2">
          <input v-model="email" type="email" class="form-control" id="floatingEmail" placeholder="name@example.com"
            required autocomplete="username">
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
          <div v-if="auth.pending2FA">
            <input v-model="code" maxlength="6" placeholder="2FA Code" @keyup.enter="on2FA">
            <button @click.prevent="on2FA">2FA bestätigen</button>
          </div>
        </div>
        <div class="mt-3 text-center">
          <p class="text-muted mb-0">Noch kein Konto?
            <router-link to="/register" class="fw-semibold text-decoration-underline">Jetzt
              registrieren</router-link>
          </p>
        </div>
      </form>
    </div>
  </AuthLayout>
</template>

<script setup>
import AuthLayout from '@/layouts/AuthLayout.vue';
import PasswordInput from '@/components/forms/PasswordInput.vue';

import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
const auth = useAuthStore();
const router = useRouter();
const email = ref('');
const password = ref('');
const error = ref('');
const code = ref('');
const loading = ref(false);

async function onLogin() {
  loading.value = true;
  try {
    await auth.login(email.value, password.value);
    if (!auth.pending2FA) {
      router.push('/files'); // Hier redirect
      window.$toast('Login erfolgreich!', { type: 'success' });
    }
    error.value = '';
  } catch (e) {
    error.value = e.response?.data?.message || 'Fehler';
  } finally {
    loading.value = false;
  }
}

async function on2FA() {
  try {
    await auth.verify2FA(code.value);
    error.value = '';
    router.push('/files');
    window.$toast('Login mit 2FA erfolgreich!', { type: 'success' });
  } catch (e) { error.value = e.response?.data?.message || 'Fehler'; }
}
</script>