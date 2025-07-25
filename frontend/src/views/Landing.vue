<template>
  <div class="page">
    <!-- Navigation -->
    <header class="navbar navbar-expand-md navbar-transparent d-print-none" id="navbar">
      <div class="container-xl">
        <a href="/" class="navbar-brand d-flex align-items-center">
          <span class="navbar-brand-image">
            <img src="@/assets/favicons/favicon-64x64.png" width="32" height="32" alt="weppiXPRESS Logo">
          </span>
          <span class="ms-2 font-stretch-extra-condensed text-xl fw-bold text-primary">
            weppi<span class="text-muted fw-black">Xpress</span>
          </span>
        </a>
        <div class="navbar-nav flex-row order-md-last">
          <router-link :to="loginTarget" class="nav-link px-3 text-secondary">
            {{ user ? 'Dashboard' : 'Login' }}
          </router-link>
        </div>
        <div class="collapse navbar-collapse justify-content-end" id="navbar-menu">
          <div class="navbar-nav">
            <a href="#hero" class="nav-item nav-link">Home</a>
            <a href="#preise" class="nav-item nav-link">Preise</a>
            <a href="#kontakt" class="nav-item nav-link">Kontakt</a>
          </div>
        </div>
      </div>
    </header>

    <div class="page-wrapper">
      <div class="page-body">
        <section id="hero" class="hero-section">
          <div class="container-xl hero-content">
            <div class="row align-items-center py-5">
              <HeroShowcase />
            </div>
          </div>
        </section>
      </div>
    </div>
    <!-- Hero Section -->

  </div>
</template>

<script setup>
import { computed } from 'vue'
import HeroShowcase from '@/components/HeroShowcase.vue'
import { useAuthStore } from '@/stores/useAuthStore'

const authStore = useAuthStore()
const user = computed(() => authStore.user)
const loginTarget = computed(() => user.value ? '/files' : '/login')

</script>

<style scoped>

</style>