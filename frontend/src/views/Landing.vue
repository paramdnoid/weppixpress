<template>
  <div class="page">
    <!-- Navigation -->
    <header
      id="navbar"
      class="navbar navbar-expand-md navbar-transparent d-print-none"
    >
      <div class="container-xl">
        <div class="navbar-brand navbar-brand-autodark d-none-navbar-horizontal pe-0 pe-md-3 py-0">
          <router-link
            to="/"
            class="logo d-flex align-items-center text-decoration-none"
          >
            <img
              :src="logo"
              alt=""
              class="logo-img"
            >
            <div>
              <div class="logo-text ms-2">
                <div class="brand-highlight">
                  weppi
                </div>
                <div class="logo-subtext">
                  xpress
                </div>
              </div>
              <div class="brand-sub-highlight">
                technologies
              </div>
            </div>
          </router-link>
        </div>
        <div class="navbar-nav flex-row order-md-last">
          <router-link
            :to="loginTarget"
            class="nav-link px-3 text-secondary"
          >
            {{ user ? 'Dashboard' : 'Login' }}
          </router-link>
        </div>
        <div
          id="navbar-menu"
          class="collapse navbar-collapse justify-content-end"
        >
          <div class="navbar-nav">
            <a
              href="#hero"
              class="nav-item nav-link"
            >Home</a>
            <a
              href="#preise"
              class="nav-item nav-link"
            >Preise</a>
            <a
              href="#kontakt"
              class="nav-item nav-link"
            >Kontakt</a>
          </div>
        </div>
      </div>
    </header>

    <div class="page-wrapper">
      <div class="page-body">
        <section
          id="hero"
          class="hero-section"
        >
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
import HeroShowcase from '@/components/base/HeroShowcase.vue'
import logo from '@/assets/images/logo-dark.svg'
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const user = computed(() => authStore.user)
const loginTarget = computed(() => user.value ? '/files' : '/login')
</script>

<style scoped>
.logo {
  letter-spacing: -0.4px;
  font-weight: 400;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);

  .logo-img {
    height: 38px;
    filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.5));
  }

  .logo-text {
    font-size: 1.2rem;
    display: flex;

    .brand-highlight {
      color: var(--tblr-gray-500);
    }

    .logo-subtext {
      font-size: 1.2rem;
      color: var(--tblr-primary);
      font-weight: 400;
    }
  }

  .brand-sub-highlight {
    font-size: .8rem;
    color: var(--tblr-gray-500);
    margin-left: .6rem;
    font-weight: 300;
  }
}
</style>