/**
 * Shared Form Validation Composable
 * Provides consistent validation patterns across all forms
 */

import { computed, reactive } from 'vue'

export interface ValidationRule {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  email?: boolean
  password?: boolean
  passwordConfirm?: string // field name to compare with
  custom?: (value: any) => string | null
  message?: string
}

export interface FieldValidation {
  rules: ValidationRule[]
  error: string
  touched: boolean
  valid: boolean
}

export interface FormValidationOptions {
  validateOnInput?: boolean
  validateOnBlur?: boolean
  showErrorsImmediately?: boolean
}

/**
 * Built-in validation functions
 */
const validators = {
  required: (value: any, rule: ValidationRule) => {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return rule.message || 'Dieses Feld ist erforderlich'
    }
    return null
  },

  minLength: (value: string, rule: ValidationRule) => {
    if (value && rule.minLength && value.length < rule.minLength) {
      return rule.message || `Mindestens ${rule.minLength} Zeichen erforderlich`
    }
    return null
  },

  maxLength: (value: string, rule: ValidationRule) => {
    if (value && rule.maxLength && value.length > rule.maxLength) {
      return rule.message || `Maximal ${rule.maxLength} Zeichen erlaubt`
    }
    return null
  },

  pattern: (value: string, rule: ValidationRule) => {
    if (value && rule.pattern && !rule.pattern.test(value)) {
      return rule.message || 'Ungültiges Format'
    }
    return null
  },

  email: (value: string, rule: ValidationRule) => {
    if (value && rule.email) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailPattern.test(value)) {
        return rule.message || 'Ungültige E-Mail-Adresse'
      }
    }
    return null
  },

  password: (value: string, rule: ValidationRule) => {
    if (value && rule.password) {
      // Basic password requirements: min 8 chars, at least one letter and one number
      const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/
      if (!passwordPattern.test(value)) {
        return rule.message || 'Passwort muss mindestens 8 Zeichen lang sein und Buchstaben sowie Zahlen enthalten'
      }
    }
    return null
  }
}

/**
 * Validate a single field
 */
function validateField(value: any, rules: ValidationRule[], formData?: Record<string, any>): string {
  for (const rule of rules) {
    // Required validation
    if (rule.required) {
      const error = validators.required(value, rule)
      if (error) return error
    }

    // Skip other validations if value is empty and not required
    if (!value && !rule.required) continue

    // Built-in validations
    if (rule.minLength) {
      const error = validators.minLength(value, rule)
      if (error) return error
    }

    if (rule.maxLength) {
      const error = validators.maxLength(value, rule)
      if (error) return error
    }

    if (rule.pattern) {
      const error = validators.pattern(value, rule)
      if (error) return error
    }

    if (rule.email) {
      const error = validators.email(value, rule)
      if (error) return error
    }

    if (rule.password) {
      const error = validators.password(value, rule)
      if (error) return error
    }

    // Password confirmation validation
    if (rule.passwordConfirm && formData) {
      const passwordValue = formData[rule.passwordConfirm]
      if (value !== passwordValue) {
        return rule.message || 'Passwörter stimmen nicht überein'
      }
    }

    // Custom validation
    if (rule.custom) {
      const error = rule.custom(value)
      if (error) return error
    }
  }

  return ''
}

/**
 * Form validation composable
 */
export function useFormValidation(
  initialData: Record<string, any> = {},
  validationRules: Record<string, ValidationRule[]> = {},
  options: FormValidationOptions = {}
) {
  const {
    validateOnInput = true,
    validateOnBlur = true,
    showErrorsImmediately = false
  } = options

  // Form data
  const formData = reactive({ ...initialData })

  // Validation state for each field
  const fields = reactive<Record<string, FieldValidation>>({})

  // Initialize validation state for each field
  Object.keys(validationRules).forEach(fieldName => {
    fields[fieldName] = {
      rules: validationRules[fieldName] || [],
      error: '',
      touched: false,
      valid: true
    }
  })

  // Computed properties
  const isValid = computed(() => {
    return Object.values(fields).every(field => field.valid)
  })

  const hasErrors = computed(() => {
    return Object.values(fields).some(field => field.error)
  })

  const touchedFields = computed(() => {
    return Object.values(fields).filter(field => field.touched)
  })

  const errors = computed(() => {
    const errorMap: Record<string, string> = {}
    Object.entries(fields).forEach(([fieldName, field]) => {
      if (field.error) {
        errorMap[fieldName] = field.error
      }
    })
    return errorMap
  })

  /**
   * Validate a specific field
   */
  function validateSingleField(fieldName: string): boolean {
    const field = fields[fieldName]
    if (!field) return true

    const value = formData[fieldName]
    const error = validateField(value, field.rules, formData)

    field.error = error
    field.valid = !error

    return field.valid
  }

  /**
   * Validate all fields
   */
  function validateAll(): boolean {
    let allValid = true

    Object.keys(fields).forEach(fieldName => {
      const isFieldValid = validateSingleField(fieldName)
      if (!isFieldValid) allValid = false
    })

    return allValid
  }

  /**
   * Touch a field (mark as interacted with)
   */
  function touchField(fieldName: string) {
    if (fields[fieldName]) {
      fields[fieldName].touched = true
    }
  }

  /**
   * Touch all fields
   */
  function touchAll() {
    Object.keys(fields).forEach(touchField)
  }

  /**
   * Clear validation state for a field
   */
  function clearFieldError(fieldName: string) {
    if (fields[fieldName]) {
      fields[fieldName].error = ''
      fields[fieldName].valid = true
    }
  }

  /**
   * Clear all validation errors
   */
  function clearErrors() {
    Object.keys(fields).forEach(clearFieldError)
  }

  /**
   * Reset form to initial state
   */
  function reset() {
    // Reset form data
    Object.keys(formData).forEach(key => {
      formData[key] = initialData[key] || ''
    })

    // Reset validation state
    Object.keys(fields).forEach(fieldName => {
      if (fields[fieldName]) {
        fields[fieldName].error = ''
        fields[fieldName].touched = false
        fields[fieldName].valid = true
      }
    })
  }

  /**
   * Set form data
   */
  function setData(data: Record<string, any>) {
    Object.keys(data).forEach(key => {
      if (key in formData) {
        formData[key] = data[key]
      }
    })
  }

  /**
   * Set field error manually
   */
  function setFieldError(fieldName: string, error: string) {
    if (fields[fieldName]) {
      fields[fieldName].error = error
      fields[fieldName].valid = !error
      fields[fieldName].touched = true
    }
  }

  /**
   * Set multiple field errors (useful for server validation)
   */
  function setErrors(errorMap: Record<string, string>) {
    Object.entries(errorMap).forEach(([fieldName, error]) => {
      setFieldError(fieldName, error)
    })
  }

  /**
   * Get field props for easy integration with input components
   */
  function getFieldProps(fieldName: string) {
    const field = fields[fieldName]
    if (!field) return {}

    return {
      modelValue: formData[fieldName],
      error: field.touched || showErrorsImmediately ? field.error : '',
      'onUpdate:modelValue': (value: any) => {
        formData[fieldName] = value
        if (validateOnInput && field.touched) {
          validateSingleField(fieldName)
        }
      },
      onBlur: () => {
        touchField(fieldName)
        if (validateOnBlur) {
          validateSingleField(fieldName)
        }
      }
    }
  }

  return {
    // Form data
    formData,

    // Validation state
    fields,
    isValid,
    hasErrors,
    touchedFields,
    errors,

    // Methods
    validateSingleField,
    validateAll,
    touchField,
    touchAll,
    clearFieldError,
    clearErrors,
    reset,
    setData,
    setFieldError,
    setErrors,
    getFieldProps
  }
}

/**
 * Common validation rule presets
 */
export const validationPresets = {
  email: { email: true, required: true },
  password: { password: true, required: true },
  passwordConfirm: (passwordField: string) => ({
    passwordConfirm: passwordField,
    required: true
  }),
  required: { required: true },
  optionalEmail: { email: true },
  name: { required: true, minLength: 2, maxLength: 50 },
  phone: {
    pattern: /^[\+]?[0-9\s\-\(\)]{10,}$/,
    message: 'Ungültige Telefonnummer'
  }
}