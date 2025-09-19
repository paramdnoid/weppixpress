<template>
  <div class="lazy-component">
    <!-- Loading state -->
    <div
      v-if="isLoading"
      class="lazy-component__loading"
      :class="loadingClass"
    >
      <slot name="loading">
        <div class="lazy-component__spinner">
          <div
            class="spinner-border"
            role="status"
          >
            <span class="visually-hidden">Loading...</span>
          </div>
        </div>
      </slot>
    </div>

    <!-- Error state -->
    <div
      v-else-if="error"
      class="lazy-component__error"
      :class="errorClass"
    >
      <slot
        name="error"
        :error="error"
        :retry="retry"
      >
        <div class="alert alert-danger">
          <h6>Failed to load component</h6>
          <p>{{ error.message }}</p>
          <button
            class="btn btn-outline-danger btn-sm"
            @click="retry"
          >
            Retry
          </button>
        </div>
      </slot>
    </div>

    <!-- Loaded component -->
    <component
      :is="resolvedComponent"
      v-else-if="resolvedComponent"
      v-bind="componentProps"
      v-on="componentEvents"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, type Component } from 'vue'
import { useIntersectionObserver } from '@vueuse/core'
import { logger } from '@/utils/logger'

interface Props {
  // Component loader function
  loader: () => Promise<Component>
  // Intersection observer options
  threshold?: number
  rootMargin?: string
  // Loading behavior
  eager?: boolean
  // Retry options
  maxRetries?: number
  retryDelay?: number
  // Styling
  loadingClass?: string
  errorClass?: string
  // Component props to pass through
  componentProps?: Record<string, any>
  // Component events to pass through
  componentEvents?: Record<string, any>
}

const props = withDefaults(defineProps<Props>(), {
  threshold: 0.1,
  rootMargin: '50px',
  eager: false,
  maxRetries: 3,
  retryDelay: 1000,
  loadingClass: '',
  errorClass: '',
  componentProps: () => ({}),
  componentEvents: () => ({})
})

// State
const target = ref<HTMLElement>()
const resolvedComponent = ref<Component | null>(null)
const isLoading = ref(false)
const error = ref<Error | null>(null)
const retryCount = ref(0)

// Intersection observer for lazy loading
const { stop } = useIntersectionObserver(
  target,
  ([{ isIntersecting }]) => {
    if (isIntersecting && !resolvedComponent.value && !isLoading.value) {
      loadComponent()
    }
  },
  {
    threshold: props.threshold,
    rootMargin: props.rootMargin
  }
)

// Load component with retry logic
const loadComponent = async () => {
  if (isLoading.value) return

  isLoading.value = true
  error.value = null

  try {
    logger.debug('Loading lazy component')

    const component = await props.loader()
    resolvedComponent.value = component

    // Stop observing once loaded
    stop()

    logger.debug('Lazy component loaded successfully')
  } catch (err) {
    const errorInstance = err instanceof Error ? err : new Error(String(err))
    error.value = errorInstance

    logger.error('Failed to load lazy component', errorInstance)

    // Auto-retry if under limit
    if (retryCount.value < props.maxRetries) {
      setTimeout(() => {
        retryCount.value++
        loadComponent()
      }, props.retryDelay)
    }
  } finally {
    isLoading.value = false
  }
}

// Manual retry function
const retry = () => {
  retryCount.value = 0
  loadComponent()
}

// Load immediately if eager
onMounted(() => {
  if (props.eager) {
    loadComponent()
  }
})

// Watch for loader changes
watch(() => props.loader, () => {
  resolvedComponent.value = null
  if (props.eager) {
    loadComponent()
  }
})
</script>

<style scoped>
.lazy-component {
  min-height: 60px;
}

.lazy-component__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60px;
  padding: 1rem;
}

.lazy-component__error {
  padding: 1rem;
}

.lazy-component__spinner {
  display: flex;
  align-items: center;
  justify-content: center;
}

.spinner-border {
  width: 2rem;
  height: 2rem;
  border: 0.25em solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: spinner-border 0.75s linear infinite;
}

@keyframes spinner-border {
  to {
    transform: rotate(360deg);
  }
}
</style>