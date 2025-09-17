<template>
  <AuthLayout>
    <template #auth-text>
      <div class="logo-lg">
        <span class="logo-txt">Willkommen bei weppixpress</span>
      </div>
      <p class="text-muted font-size-15 w-75 mx-auto mt-1 mb-0">
        Vergib ein neues Passwort für dein Konto.
      </p>
    </template>
    <div class="card border-0">
      <div class="card-body p-0">
        <div class="px-3 py-3">
          <div class="text-center">
            <h2 class="mb-0">
              Neues Passwort setzen
            </h2>
            <p class="text-muted mt-2">
              Gib dein neues Passwort ein und bestätige es.
            </p>
          </div>
          <form
            :class="{ 'form-disabled': loading }"
            class="mt-3"
            @submit.prevent="onReset"
          >
            <div class="form-group mb-3">
              <PasswordInput
                id="password"
                v-model="password"
                label="Neues Passwort"
                placeholder="Neues Passwort eingeben"
                required
              />
            </div>
            <div class="form-group mb-3">
              <PasswordInput
                id="confirmPassword"
                v-model="confirmPassword"
                label="Passwort bestätigen"
                placeholder="Passwort erneut eingeben"
                required
              />
            </div>
            <div class="text-center">
              <button
                type="submit"
                class="btn btn-primary w-100"
                :disabled="loading"
              >
                <span v-if="loading">Wird gespeichert...</span>
                <span v-else>Passwort zurücksetzen</span>
              </button>
              <div v-if="info">
                {{ info }} Du wirst weitergeleitet...
              </div>
              <div v-if="error">
                {{ error }}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  </AuthLayout>
</template>

<script setup>
import AuthLayout from '@/layouts/AuthLayout.vue';
import PasswordInput from '@/components/forms/PasswordInput.vue';
import { useAuthForm } from '@/composables/useAuthForm';
import { ref } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'vue-router';

const password = ref('');
const confirmPassword = ref('');
const store = useAuthStore();
const router = useRouter();

const params = new URLSearchParams(window.location.search);
const token = params.get('token');

// Clear form fields after successful reset
const clearFields = () => {
  password.value = '';
  confirmPassword.value = '';
};

// Use shared auth form composable
const { loading, error, info, handleSubmit, setInfo } = useAuthForm({
  clearFields,
  successMessage: 'Passwort erfolgreich geändert!'
});

async function onReset() {
  // Client-side validation first
  if (password.value !== confirmPassword.value) {
    error.value = "Passwörter stimmen nicht überein!";
    return;
  }

  await handleSubmit(async () => {
    await store.resetPassword(token, password.value);
  });

  // Set info message and redirect after successful reset
  if (!error.value) {
    setInfo('Passwort geändert. Du kannst dich einloggen.');
    setTimeout(() => {
      router.push('/login');
    }, 2000);
  }
}
</script>

