/**
 * Shared Error Handling Utility
 * Eliminates duplication of error response handling across components
 */

export interface ErrorResponse {
  message: string
  code?: string | number
  details?: string
  field?: string
}

/**
 * Extract error message from various error formats
 */
export function extractErrorMessage(error: any): string {
  // Handle null/undefined
  if (!error) {
    return 'Ein unbekannter Fehler ist aufgetreten'
  }

  // Direct string message
  if (typeof error === 'string') {
    return error
  }

  // Axios/HTTP error response
  if (error.response?.data?.message) {
    return error.response.data.message
  }

  // Axios error with status text
  if (error.response?.statusText) {
    return error.response.statusText
  }

  // Standard Error object
  if (error.message) {
    return error.message
  }

  // API error object format
  if (error.data?.message) {
    return error.data.message
  }

  // Custom error format
  if (error.error && typeof error.error === 'string') {
    return error.error
  }

  // Fallback
  return 'Ein Fehler ist aufgetreten'
}

/**
 * Extract detailed error information
 */
export function extractErrorDetails(error: any): ErrorResponse {
  const message = extractErrorMessage(error)

  return {
    message,
    code: error.response?.status || error.code || error.status,
    details: error.response?.data?.details || error.details,
    field: error.response?.data?.field || error.field
  }
}

/**
 * Handle common HTTP error status codes
 */
export function handleHttpError(error: any): string {
  const status = error.response?.status

  switch (status) {
    case 400:
      return 'Ungültige Anfrage. Bitte überprüfen Sie Ihre Eingaben.'
    case 401:
      return 'Sie sind nicht angemeldet. Bitte melden Sie sich an.'
    case 403:
      return 'Sie haben keine Berechtigung für diese Aktion.'
    case 404:
      return 'Die angeforderte Ressource wurde nicht gefunden.'
    case 409:
      return 'Konflikt: Die Ressource existiert bereits oder ist in Verwendung.'
    case 422:
      return 'Die übermittelten Daten sind ungültig.'
    case 429:
      return 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.'
    case 500:
      return 'Ein Serverfehler ist aufgetreten. Bitte versuchen Sie es später erneut.'
    case 502:
      return 'Der Server ist temporär nicht verfügbar.'
    case 503:
      return 'Der Service ist temporär nicht verfügbar.'
    default:
      return extractErrorMessage(error)
  }
}

/**
 * Check if error is a specific HTTP status
 */
export function isHttpStatus(error: any, status: number): boolean {
  return error.response?.status === status
}

/**
 * Check if error is authentication related
 */
export function isAuthError(error: any): boolean {
  return isHttpStatus(error, 401) || isHttpStatus(error, 403)
}

/**
 * Check if error is validation related
 */
export function isValidationError(error: any): boolean {
  return isHttpStatus(error, 400) || isHttpStatus(error, 422)
}

/**
 * Check if error is network related
 */
export function isNetworkError(error: any): boolean {
  return error.code === 'NETWORK_ERROR' ||
         error.message?.includes('Network Error') ||
         !error.response // No response usually means network issue
}

/**
 * Format error for display in UI
 */
export function formatErrorForDisplay(error: any): string {
  // Use HTTP status specific messages when available
  if (error.response?.status) {
    return handleHttpError(error)
  }

  // Use network specific message
  if (isNetworkError(error)) {
    return 'Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung.'
  }

  // Fallback to extracted message
  return extractErrorMessage(error)
}

/**
 * Error handler class for consistent error management
 */
export class ErrorHandler {
  /**
   * Handle error with optional toast notification
   */
  static handle(error: any, showToast = false): ErrorResponse {
    const errorDetails = extractErrorDetails(error)

    if (showToast && window.$toast) {
      window.$toast(errorDetails.message, { type: 'danger' })
    }

    // Log error for debugging
    console.error('Error handled:', error)

    return errorDetails
  }

  /**
   * Handle auth errors (redirect to login if needed)
   */
  static handleAuth(error: any, router?: any): ErrorResponse {
    const errorDetails = this.handle(error)

    if (isAuthError(error) && router) {
      router.push('/login')
    }

    return errorDetails
  }

  /**
   * Handle validation errors (extract field-specific errors)
   */
  static handleValidation(error: any): Record<string, string> {
    const errors: Record<string, string> = {}

    if (error.response?.data?.errors) {
      // Laravel-style validation errors
      Object.entries(error.response.data.errors).forEach(([field, messages]) => {
        errors[field] = Array.isArray(messages) ? messages[0] : messages as string
      })
    } else if (error.response?.data?.field) {
      // Single field error
      errors[error.response.data.field] = extractErrorMessage(error)
    } else {
      // Generic error
      errors.general = extractErrorMessage(error)
    }

    return errors
  }
}

/**
 * Legacy compatibility - export the main function
 */
export { extractErrorMessage as getErrorMessage }

/**
 * Composable for error handling in Vue components
 */
export function useErrorHandler() {
  return {
    extractErrorMessage,
    extractErrorDetails,
    handleHttpError,
    formatErrorForDisplay,
    isAuthError,
    isValidationError,
    isNetworkError,
    ErrorHandler
  }
}