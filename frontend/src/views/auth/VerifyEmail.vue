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
    <div class="card border-0">
      <div class="card-body p-0">
        <div class="px-3 py-3">
          <div class="text-center">
            <h2 class="mb-0">Erstelle dein Konto</h2>
            <p class="text-muted mt-2">Schnell, sicher und kostenlos registrieren.</p>
            <div v-if="verified">E-Mail bestätigt! Du wirst weitergeleitet...</div>
            <div v-else>Lade...</div>
          </div>
        </div>
      </div>
    </div>
  </AuthLayout>
</template>

<script setup>
import AuthLayout from '@/layouts/AuthLayout.vue';

import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';

const verified = ref(false);
const router = useRouter();

onMounted(async () => {
  try {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      await axios.get(`/api/auth/verify-email?token=${token}`);
      verified.value = true;
      window.$toast && window.$toast('E-Mail bestätigt!', { type: 'success' });
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    }
  } catch (err) {
    console.error('VerifyEmail error:', err);
    window.$toast && window.$toast('Fehler bei E-Mail-Verifizierung', { type: 'danger' });
  }
});
</script>