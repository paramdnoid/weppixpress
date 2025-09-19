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
              alt="weppiXPRESS Logo"
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
              @click="scrollToSection"
            >Home</a>
            <a
              href="#preise"
              class="nav-item nav-link"
              @click="scrollToSection"
            >Preise</a>
            <a
              href="#kontakt"
              class="nav-item nav-link"
              @click="scrollToSection"
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

<script setup lang="ts">
import { computed, type ComputedRef } from 'vue'
import { useAuthStore } from '@/stores/auth'
import type { User } from '@/types/auth'
import HeroShowcase from '@/components/base/HeroShowcase.vue'
import logo from '@/assets/images/logo-dark.svg'

// Store initialization
const authStore = useAuthStore()

// Computed properties with proper typing
const user: ComputedRef<User | null> = computed(() => authStore.user)
const loginTarget: ComputedRef<string> = computed(() => user.value ? '/files' : '/login')

// Methods
const scrollToSection = (event: MouseEvent): void => {
  event.preventDefault()
  const target = event.currentTarget as HTMLAnchorElement
  const href = target.getAttribute('href')
  
  if (href && href.startsWith('#')) {
    const element = document.querySelector(href)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }
}
</script>

<style scoped lang="scss">
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

.hero-section {
  min-height: 100vh;
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.navbar {
  backdrop-filter: blur(10px);
  background-color: rgba(255, 255, 255, 0.95);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  
  &.navbar-transparent {
    background-color: transparent;
    backdrop-filter: none;
    box-shadow: none;
    
    &:hover {
      background-color: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      transition: all 0.3s ease;
    }
  }
}
</style>