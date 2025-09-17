<template>
  <AuthFormTemplate
    :error="error"
    :info="info"
  >
    <template #subtitle>
      Melde dich an und verwalte deine Dateien sicher und schnell.
    </template>
    <template #title>
      Login
    </template>
    <template #description>
      Gib deine Zugangsdaten ein, um fortzufahren.
    </template>

    <form
      :class="{ 'form-disabled': loading }"
      @submit.prevent="onLogin"
    >
      <div class="form-floating mb-2">
        <input
          id="floatingEmail"
          v-model="email"
          type="email"
          class="form-control"
          placeholder="name@example.com"
          required
          autocomplete="username"
        >
        <label for="floatingEmail">E-Mail</label>
      </div>

      <PasswordInput
        id="floatingPassword"
        v-model="password"
        label="Passwort"
        placeholder="Passwort"
      />
      <div
        v-if="error"
        class="alert alert-danger"
      >
        {{ error }}
      </div>
      <div class="form-check form-check-primary d-flex justify-content-between">
        <div class="d-flex align-items-center">
          <input
            id="remember-check"
            class="form-check-input"
            type="checkbox"
            name="remember_me"
          >
          <label
            class="form-check-label font-size-12 ms-1"
            for="remember-check"
            style="margin-top: 4px;"
          >
            Angemeldet bleiben
          </label>
        </div>
        <div class="d-flex align-items-center">
          <a
            href="/forgot-password"
            class="text-muted text-decoration-underline font-size-12"
            style="margin-top: 5px;"
          >
            Passwort vergessen?
          </a>
        </div>
      </div>
      <div class="d-grid mt-3">
        <button
          class="btn btn-primary"
          type="submit"
          :disabled="loading"
        >
          <span v-if="loading">Wird geladen...</span>
          <span v-else>Login</span>
        </button>
        <div v-if="auth.pending2FA">
          <input
            v-model="code"
            maxlength="6"
            placeholder="2FA Code"
            @keyup.enter="on2FA"
          >
          <button @click.prevent="on2FA">
            2FA bestätigen
          </button>
        </div>
      </div>
    </form>

    <template #footer>
      <p class="text-muted mb-0">
        Noch kein Konto?
        <router-link
          to="/register"
          class="fw-semibold text-decoration-underline"
        >
          Jetzt registrieren
        </router-link>
      </p>
    </template>
  </AuthFormTemplate>
</template>

<script setup>
import AuthFormTemplate from '@/components/auth/AuthFormTemplate.vue';
import PasswordInput from '@/components/forms/PasswordInput.vue';
import { useAuthForm } from '@/composables/useAuthForm';

import { ref } from 'vue';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const email = ref('');
const password = ref('');
const code = ref('');

// Use shared auth form composable
const { loading, error, info, handleSubmit } = useAuthForm({
  successMessage: 'Login erfolgreich!',
  redirectTo: '/files',
  skipSuccessOnCondition: () => auth.pending2FA
});

// Separate instance for 2FA with different message
const { handleSubmit: handle2FASubmit } = useAuthForm({
  successMessage: 'Login mit 2FA erfolgreich!',
  redirectTo: '/files'
});

async function onLogin() {
  await handleSubmit(async () => {
    await auth.login(email.value, password.value);
  });
}

async function on2FA() {
  await handle2FASubmit(async () => {
    await auth.verify2FA(code.value);
  });
}
</script>