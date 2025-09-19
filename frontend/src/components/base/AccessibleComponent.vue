<template>
  <component
    :is="tag"
    ref="elementRef"
    :class="[
      'accessible-component',
      {
        'high-contrast': isHighContrast,
        'reduced-motion': prefersReducedMotion
      }
    ]"
    :tabindex="computedTabIndex"
    :role="role"
    :aria-label="ariaLabel"
    :aria-labelledby="ariaLabelledby"
    :aria-describedby="ariaDescribedby"
    :aria-expanded="ariaExpanded"
    :aria-selected="ariaSelected"
    :aria-checked="ariaChecked"
    :aria-disabled="disabled"
    :aria-hidden="ariaHidden"
    @keydown="handleKeydown"
    @focus="handleFocus"
    @blur="handleBlur"
  >
    <!-- Skip links for keyboard navigation -->
    <div
      v-if="showSkipLinks && skipLinks.length > 0"
      class="skip-links"
      aria-label="Skip navigation"
    >
      <a
        v-for="link in skipLinks"
        :key="link.href"
        :href="link.href"
        class="skip-link"
        @click="handleSkipLinkClick"
      >
        {{ link.label }}
      </a>
    </div>

    <!-- Main content -->
    <div
      v-if="loading"
      class="loading-state"
      role="status"
      aria-live="polite"
      :aria-label="loadingMessage"
    >
      <slot name="loading">
        <div class="spinner" aria-hidden="true" />
        <span class="sr-only">{{ loadingMessage }}</span>
      </slot>
    </div>

    <div
      v-else-if="error"
      class="error-state"
      role="alert"
      aria-live="assertive"
    >
      <slot name="error" :error="error" :retry="retry">
        <div class="error-message">
          <h3>{{ errorTitle }}</h3>
          <p>{{ error.message || error }}</p>
          <button
            v-if="retry"
            type="button"
            class="retry-button"
            @click="retry"
          >
            Retry
          </button>
        </div>
      </slot>
    </div>

    <div
      v-else
      class="content"
      :aria-busy="loading"
    >
      <slot />
    </div>

    <!-- Screen reader announcements -->
    <div
      v-if="announcements.length > 0"
      class="sr-only"
      aria-live="polite"
      aria-atomic="true"
    >
      {{ announcements[announcements.length - 1] }}
    </div>
  </component>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import {
  useFocusManagement,
  useKeyboardNavigation,
  useScreenReader,
  useSkipLinks,
  useHighContrast,
  useReducedMotion
} from '@/composables/useAccessibility'

interface Props {
  tag?: string
  role?: string
  tabindex?: number | null
  disabled?: boolean
  loading?: boolean
  error?: Error | string | null

  // ARIA attributes
  ariaLabel?: string
  ariaLabelledby?: string
  ariaDescribedby?: string
  ariaExpanded?: boolean
  ariaSelected?: boolean
  ariaChecked?: boolean | 'mixed'
  ariaHidden?: boolean

  // Skip links
  showSkipLinks?: boolean

  // Messages
  loadingMessage?: string
  errorTitle?: string

  // Keyboard navigation
  enableKeyboardNav?: boolean
  trapFocus?: boolean

  // Retry functionality
  retry?: () => void
}

const props = withDefaults(defineProps<Props>(), {
  tag: 'div',
  tabindex: null,
  disabled: false,
  loading: false,
  error: null,
  showSkipLinks: false,
  loadingMessage: 'Loading...',
  errorTitle: 'Error',
  enableKeyboardNav: true,
  trapFocus: false
})

const elementRef = ref<HTMLElement>()

// Accessibility composables
const { isHighContrast } = useHighContrast()
const { prefersReducedMotion } = useReducedMotion()
const { announcements, announce } = useScreenReader()
const { skipLinks } = useSkipLinks()
const { focusFirst, focusLast, trapFocus } = useFocusManagement()

// Computed properties
const computedTabIndex = computed(() => {
  if (props.disabled) return -1
  if (props.tabindex !== null) return props.tabindex
  return undefined
})

// Keyboard navigation
const { handleKeydown: baseHandleKeydown } = useKeyboardNavigation({
  onEnter: () => {
    if (elementRef.value) {
      elementRef.value.click()
    }
  },
  onEscape: () => {
    if (elementRef.value) {
      elementRef.value.blur()
    }
  },
  onHome: () => {
    if (props.trapFocus) {
      focusFirst()
    }
  },
  onEnd: () => {
    if (props.trapFocus) {
      focusLast()
    }
  }
})

const handleKeydown = (event: KeyboardEvent) => {
  if (!props.enableKeyboardNav || props.disabled) return
  baseHandleKeydown(event)
}

// Focus management
const handleFocus = (event: FocusEvent) => {
  if (props.disabled) {
    event.preventDefault()
    return
  }

  announce('Focused')
}

const handleBlur = () => {
  // Handle blur logic if needed
}

// Skip link handling
const handleSkipLinkClick = (event: Event) => {
  event.preventDefault()
  const link = event.target as HTMLAnchorElement
  const targetId = link.getAttribute('href')?.substring(1)

  if (targetId) {
    const targetElement = document.getElementById(targetId)
    if (targetElement) {
      targetElement.focus()
      targetElement.scrollIntoView({ behavior: 'smooth' })
    }
  }
}

// Watch for loading/error state changes
watch(() => props.loading, (newLoading) => {
  if (newLoading) {
    announce(props.loadingMessage)
  }
})

watch(() => props.error, (newError) => {
  if (newError) {
    const message = typeof newError === 'string' ? newError : newError.message
    announce(`Error: ${message}`, 'assertive')
  }
})

// Focus trap setup
onMounted(() => {
  if (props.trapFocus && elementRef.value) {
    const cleanup = trapFocus(elementRef.value)

    // Cleanup on unmount
    return cleanup
  }
})
</script>

<style scoped>
.accessible-component {
  position: relative;
}

/* Skip links */
.skip-links {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1000;
}

.skip-link {
  position: absolute;
  top: -40px;
  left: 6px;
  background: var(--color-primary, #007bff);
  color: white;
  padding: 8px;
  text-decoration: none;
  border-radius: 4px;
  font-size: 14px;
  transition: top 0.3s;
}

.skip-link:focus {
  top: 6px;
}

/* Loading state */
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60px;
  padding: 1rem;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid var(--color-primary, #007bff);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: 8px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Error state */
.error-state {
  padding: 1rem;
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
  color: #721c24;
}

.error-message h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.1rem;
}

.error-message p {
  margin: 0 0 1rem 0;
}

.retry-button {
  background: var(--color-danger, #dc3545);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
}

.retry-button:hover:not(:disabled) {
  background: var(--color-danger-dark, #c82333);
}

.retry-button:focus {
  outline: 2px solid var(--color-focus, #007bff);
  outline-offset: 2px;
}

/* Screen reader only content */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* High contrast mode */
.high-contrast {
  --color-primary: #0000ff;
  --color-danger: #ff0000;
  --color-focus: #ffff00;
}

.high-contrast .skip-link,
.high-contrast .retry-button {
  border: 2px solid;
}

/* Reduced motion */
.reduced-motion * {
  animation-duration: 0.01ms !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0.01ms !important;
}

.reduced-motion .skip-link {
  transition: none;
}

/* Focus styles */
.accessible-component:focus-visible {
  outline: 2px solid var(--color-focus, #007bff);
  outline-offset: 2px;
}

/* Disabled state */
.accessible-component[aria-disabled="true"] {
  opacity: 0.6;
  pointer-events: none;
}

/* Content area */
.content {
  position: relative;
}

.content[aria-busy="true"] {
  pointer-events: none;
}
</style>