<template>
  <AuthLayout>
    <template #auth-text>
      <div class="logo-lg">
        <span class="logo-txt">Willkommen bei weppixpress</span>
      </div>
      <p class="text-muted font-size-15 w-75 mx-auto mt-1 mb-0">
        Registriere dich kostenlos und starte direkt durch.
      </p>
    </template>
    <div class="px-3 py-3">
      <div class="text-center">
        <h2 class="mb-0">Erstelle dein Konto</h2>
        <p class="text-muted mt-2">Schnell, sicher und kostenlos registrieren.</p>
      </div>
      <form @submit.prevent="onRegister" :class="{ 'form-disabled': loading }">
        <div class="row gx-2">
          <div class="col-md-5">
            <div class="form-floating mb-2">
              <input v-model="firstName" type="text" class="form-control" id="floatingFirstName" placeholder="Max"
                required>
              <label for="floatingFirstName">Vorname</label>
            </div>
          </div>
          <div class="col-md-7">
            <div class="form-floating mb-2">
              <input v-model="lastName" type="text" class="form-control" id="floatingLastName" placeholder="Mustermann"
                required>
              <label for="floatingLastName">Nachname</label>
            </div>
          </div>
        </div>
        <div class="form-floating mb-2">
          <input v-model="email" type="email" class="form-control" id="floatingEmail" placeholder="name@example.com"
            required>
          <label for="floatingEmail">E-Mail</label>
        </div>
        <PasswordInput v-model="password" id="floatingPassword" label="Passwort" placeholder="Passwort" />
        <div v-if="error" class="alert alert-danger">{{ error }}</div>
        <div class="mt-3 pt-1 text-center">
          <p class="mb-0 small">
            Mit deiner Registrierung akzeptierst du unsere <span data-bs-toggle="modal" role="button"
              data-bs-target="#condition-modal" class="text-primary">AGB</span>.
          </p>
        </div>
        <div class="d-grid mt-3">
          <button class="btn btn-primary" type="submit" :disabled="loading">
            <span v-if="loading">Registriere...</span>
            <span v-else>Registrieren</span>
          </button>
        </div>
        <div class="mt-4 pt-3 text-center">
          <p class="text-muted mb-0">Schon registriert?
            <router-link to="/login" class="fw-semibold text-decoration-underline">Jetzt einloggen</router-link>
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
import { useAuthStore } from '@/stores/auth';
const loading = ref(false);
const store = useAuthStore();
const email = ref('');
const password = ref('');
const firstName = ref('');
const lastName = ref('');
const error = ref('');
const info = ref('');

async function onRegister() {
  loading.value = true;
  try {
    await store.register(firstName.value, lastName.value, email.value, password.value);
    info.value = 'Bitte E-Mail bestätigen (Link gesendet)!';
    window.$toast('Bitte bestätige deine E-Mail-Adresse.', { type: 'info' });
    email.value = '';
    password.value = '';
    firstName.value = '';
    lastName.value = '';
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