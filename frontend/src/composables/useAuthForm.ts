import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { extractErrorMessage } from '@/utils/errorHandler'

export interface AuthFormState {
  loading: boolean
  error: string
  info: string
}

export interface AuthFormOptions {
  successMessage?: string
  redirectTo?: string
  clearFields?: () => void
  showToast?: boolean
  skipSuccessOnCondition?: () => boolean
}

/**
 * Shared composable for auth form handling
 * Eliminates duplication across Login, Register, ForgotPassword, etc.
 */
export function useAuthForm(options: AuthFormOptions = {}) {
  const router = useRouter()

  // Shared reactive state
  const loading = ref(false)
  const error = ref('')
  const info = ref('')

  // extractErrorMessage is now imported from utils/errorHandler

  /**
   * Handle form submission with loading states and error handling
   */
  async function handleSubmit(submitFn: () => Promise<void>): Promise<void> {
    loading.value = true
    error.value = ''
    info.value = ''

    try {
      await submitFn()

      // Clear error on success
      error.value = ''

      // Check if we should skip success actions (e.g., for 2FA)
      if (options.skipSuccessOnCondition && options.skipSuccessOnCondition()) {
        return
      }

      // Clear form fields if provided
      if (options.clearFields) {
        options.clearFields()
      }

      // Show success toast if enabled
      if (options.showToast !== false && options.successMessage && window.$toast) {
        window.$toast(options.successMessage, { type: 'success' })
      }

      // Redirect if specified
      if (options.redirectTo) {
        router.push(options.redirectTo)
      }

    } catch (e) {
      error.value = extractErrorMessage(e)
      info.value = ''
    } finally {
      loading.value = false
    }
  }

  /**
   * Set info message (for success states that don't redirect)
   */
  function setInfo(message: string) {
    info.value = message
    error.value = ''

    if (options.showToast !== false && window.$toast) {
      window.$toast(message, { type: 'info' })
    }
  }

  /**
   * Clear all messages
   */
  function clearMessages() {
    error.value = ''
    info.value = ''
  }

  /**
   * Computed state object
   */
  const state = {
    loading: loading.value,
    error: error.value,
    info: info.value
  }

  return {
    // Reactive state
    loading,
    error,
    info,
    state,

    // Methods
    handleSubmit,
    setInfo,
    clearMessages,
    extractErrorMessage
  }
}