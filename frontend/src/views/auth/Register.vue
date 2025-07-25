<template>
  <AuthLayout>
    <template #auth-text>
      <div class="logo-lg">
        <span class="logo-txt">Willkommen bei {{ $appName }}</span>
      </div>
      <p class="text-muted font-size-15 w-75 mx-auto mt-1 mb-0">
        Registriere dich kostenlos und starte direkt durch.
      </p>
    </template>
    <div class="card border-0">
      <div class="card-body p-0">
        <div class="px-3 py-3">
          <div class="text-center">
            <h2 class="mb-0">Erstelle dein Konto</h2>
            <p class="text-muted mt-2">Schnell, sicher und kostenlos registrieren.</p>
          </div>
          <form @submit.prevent="register">
            <div class="row gx-2">
              <div class="col-md-5">
                <div class="form-floating mb-3">
                  <input v-model="firstName" type="text" class="form-control" id="floatingFirstName" placeholder="Max"
                    required>
                  <label for="floatingFirstName">Vorname</label>
                </div>
              </div>
              <div class="col-md-7">
                <div class="form-floating mb-3">
                  <input v-model="lastName" type="text" class="form-control" id="floatingLastName"
                    placeholder="Mustermann" required>
                  <label for="floatingLastName">Nachname</label>
                </div>
              </div>
            </div>
            <div class="form-floating mb-3">
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

const firstName = ref('')
const lastName = ref('')
const email = ref('')
const password = ref('')
const error = ref(null)
const loading = ref(false)

const router = useRouter()
const auth = useAuthStore()

async function register() {
  loading.value = true
  error.value = null
  try {
    await auth.register(firstName.value, lastName.value, email.value, password.value)
    router.push('/files')
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}
</script>