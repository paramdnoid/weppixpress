/**
 * Type-Safe Form Management Composable
 */

import { ref, computed, watch, type Ref, type ComputedRef } from 'vue'
import type { DeepPartial } from '@/utils/typeGuards'

// Validation Rule Types
export type ValidationRule<T> = (value: T) => string | true
export type AsyncValidationRule<T> = (value: T) => Promise<string | true>

// Form Field Configuration
export interface FieldConfig<T> {
  initialValue: T
  validators?: ValidationRule<T>[]
  asyncValidators?: AsyncValidationRule<T>[]
  transform?: (value: T) => T
  dependsOn?: string[]
}

// Form Configuration
export type FormConfig<T> = {
  [K in keyof T]: FieldConfig<T[K]>
}

// Form Field
export interface FormField<T> {
  value: Ref<T>
  error: Ref<string | null>
  touched: Ref<boolean>
  dirty: Ref<boolean>
  validating: Ref<boolean>
  isValid: ComputedRef<boolean>
  isDirty: ComputedRef<boolean>
  setValue: (value: T) => void
  setError: (error: string | null) => void
  touch: () => void
  reset: () => void
  validate: () => Promise<boolean>
}

// Form Instance
export interface FormInstance<T> {
  fields: {
    [K in keyof T]: FormField<T[K]>
  }
  values: ComputedRef<T>
  errors: ComputedRef<Partial<Record<keyof T, string | null>>>
  isValid: ComputedRef<boolean>
  isDirty: ComputedRef<boolean>
  isValidating: ComputedRef<boolean>
  isTouched: ComputedRef<boolean>
  submit: (onSubmit: (values: T) => Promise<void> | void) => Promise<void>
  reset: () => void
  resetField: (field: keyof T) => void
  setFieldValue: <K extends keyof T>(field: K, value: T[K]) => void
  setFieldError: (field: keyof T, error: string | null) => void
  setValues: (values: DeepPartial<T>) => void
  setErrors: (errors: Partial<Record<keyof T, string | null>>) => void
  touchField: (field: keyof T) => void
  touchAll: () => void
  validate: () => Promise<boolean>
  validateField: (field: keyof T) => Promise<boolean>
  clearErrors: () => void
  watch: <K extends keyof T>(
    field: K,
    callback: (newValue: T[K], oldValue: T[K]) => void
  ) => void
}

/**
 * Create a type-safe form
 */
export function useTypedForm<T extends Record<string, any>>(
  config: FormConfig<T>
): FormInstance<T> {
  // Create form fields
  const fields = {} as {
    [K in keyof T]: FormField<T[K]>
  }

  // Track field dependencies
  const fieldDependencies = new Map<keyof T, Set<keyof T>>()

  // Initialize each field
  for (const key in config) {
    const fieldConfig = config[key]
    const value = ref(fieldConfig.initialValue) as Ref<T[typeof key]>
    const error = ref<string | null>(null)
    const touched = ref(false)
    const dirty = ref(false)
    const validating = ref(false)

    // Computed properties
    const isValid = computed(() => error.value === null)
    const isDirty = computed(() => dirty.value)

    // Validate field
    const validateField = async (): Promise<boolean> => {
      validating.value = true
      error.value = null

      try {
        // Apply transform if provided
        if (fieldConfig.transform) {
          value.value = fieldConfig.transform(value.value)
        }

        // Run synchronous validators
        if (fieldConfig.validators) {
          for (const validator of fieldConfig.validators) {
            const result = validator(value.value)
            if (result !== true) {
              error.value = result
              return false
            }
          }
        }

        // Run async validators
        if (fieldConfig.asyncValidators) {
          for (const validator of fieldConfig.asyncValidators) {
            const result = await validator(value.value)
            if (result !== true) {
              error.value = result
              return false
            }
          }
        }

        return true
      } finally {
        validating.value = false
      }
    }

    // Set field value
    const setValue = (newValue: T[typeof key]) => {
      // const oldValue = value.value
      value.value = newValue
      dirty.value = value.value !== fieldConfig.initialValue
      
      // Auto-validate on change if touched
      if (touched.value) {
        validateField()
      }

      // Validate dependent fields
      const dependents = Array.from(fieldDependencies.entries())
        .filter(([_, deps]) => deps.has(key))
        .map(([field]) => field)
      
      for (const dependent of dependents) {
        fields[dependent].validate()
      }
    }

    // Set field error
    const setError = (errorMessage: string | null) => {
      error.value = errorMessage
    }

    // Touch field
    const touch = () => {
      touched.value = true
    }

    // Reset field
    const reset = () => {
      value.value = fieldConfig.initialValue
      error.value = null
      touched.value = false
      dirty.value = false
      validating.value = false
    }

    // Create field object
    fields[key] = {
      value,
      error,
      touched,
      dirty,
      validating,
      isValid,
      isDirty,
      setValue,
      setError,
      touch,
      reset,
      validate: validateField
    }

    // Setup dependencies
    if (fieldConfig.dependsOn) {
      for (const dep of fieldConfig.dependsOn) {
        if (!fieldDependencies.has(dep as keyof T)) {
          fieldDependencies.set(dep as keyof T, new Set())
        }
        fieldDependencies.get(dep as keyof T)!.add(key)
      }
    }
  }

  // Computed form state
  const values = computed(() => {
    const result = {} as T
    for (const key in fields) {
      result[key] = fields[key].value.value
    }
    return result
  })

  const errors = computed(() => {
    const result = {} as Partial<Record<keyof T, string | null>>
    for (const key in fields) {
      if (fields[key].error.value) {
        result[key] = fields[key].error.value
      }
    }
    return result
  })

  const isValid = computed(() => {
    return Object.keys(fields).every(key => fields[key]?.isValid.value)
  })

  const isDirty = computed(() => {
    return Object.keys(fields).some(key => fields[key]?.isDirty.value)
  })

  const isValidating = computed(() => {
    return Object.keys(fields).some(key => fields[key]?.validating.value)
  })

  const isTouched = computed(() => {
    return Object.keys(fields).some(key => fields[key]?.touched.value)
  })

  // Form methods
  const submit = async (onSubmit: (values: T) => Promise<void> | void) => {
    // Touch all fields
    touchAll()

    // Validate all fields
    const isFormValid = await validate()

    if (isFormValid) {
      await onSubmit(values.value)
    }
  }

  const reset = () => {
    for (const key in fields) {
      fields[key].reset()
    }
  }

  const resetField = (field: keyof T) => {
    fields[field].reset()
  }

  const setFieldValue = <K extends keyof T>(field: K, value: T[K]) => {
    fields[field].setValue(value)
  }

  const setFieldError = (field: keyof T, error: string | null) => {
    fields[field].setError(error)
  }

  const setValues = (newValues: DeepPartial<T>) => {
    for (const key in newValues) {
      if (key in fields && newValues[key] !== undefined) {
        fields[key].setValue(newValues[key] as T[typeof key])
      }
    }
  }

  const setErrors = (newErrors: Partial<Record<keyof T, string | null>>) => {
    for (const key in newErrors) {
      if (key in fields) {
        fields[key].setError(newErrors[key] ?? null)
      }
    }
  }

  const touchField = (field: keyof T) => {
    fields[field].touch()
  }

  const touchAll = () => {
    for (const key in fields) {
      fields[key].touch()
    }
  }

  const validate = async (): Promise<boolean> => {
    const results = await Promise.all(
      Object.keys(fields).map(key => fields[key]?.validate())
    )
    return results.every(result => result)
  }

  const validateField = async (field: keyof T): Promise<boolean> => {
    return fields[field].validate()
  }

  const clearErrors = () => {
    for (const key in fields) {
      fields[key].setError(null)
    }
  }

  const watchField = <K extends keyof T>(
    field: K,
    callback: (newValue: T[K], oldValue: T[K]) => void
  ) => {
    watch(fields[field].value, callback)
  }

  return {
    fields,
    values,
    errors,
    isValid,
    isDirty,
    isValidating,
    isTouched,
    submit,
    reset,
    resetField,
    setFieldValue,
    setFieldError,
    setValues,
    setErrors,
    touchField,
    touchAll,
    validate,
    validateField,
    clearErrors,
    watch: watchField
  }
}

/**
 * Common validators
 */
export const validators = {
  required: <T>(message = 'This field is required'): ValidationRule<T> => {
    return (value: T) => {
      if (value === null || value === undefined) return message
      if (typeof value === 'string' && value.trim() === '') return message
      if (Array.isArray(value) && value.length === 0) return message
      return true
    }
  },

  minLength: (min: number, message?: string): ValidationRule<string> => {
    return (value: string) => {
      if (value.length < min) {
        return message || `Minimum length is ${min}`
      }
      return true
    }
  },

  maxLength: (max: number, message?: string): ValidationRule<string> => {
    return (value: string) => {
      if (value.length > max) {
        return message || `Maximum length is ${max}`
      }
      return true
    }
  },

  email: (message = 'Invalid email address'): ValidationRule<string> => {
    return (value: string) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(value)) {
        return message
      }
      return true
    }
  },

  pattern: (regex: RegExp, message = 'Invalid format'): ValidationRule<string> => {
    return (value: string) => {
      if (!regex.test(value)) {
        return message
      }
      return true
    }
  },

  min: (min: number, message?: string): ValidationRule<number> => {
    return (value: number) => {
      if (value < min) {
        return message || `Minimum value is ${min}`
      }
      return true
    }
  },

  max: (max: number, message?: string): ValidationRule<number> => {
    return (value: number) => {
      if (value > max) {
        return message || `Maximum value is ${max}`
      }
      return true
    }
  },

  between: (min: number, max: number, message?: string): ValidationRule<number> => {
    return (value: number) => {
      if (value < min || value > max) {
        return message || `Value must be between ${min} and ${max}`
      }
      return true
    }
  },

  url: (message = 'Invalid URL'): ValidationRule<string> => {
    return (value: string) => {
      try {
        new URL(value)
        return true
      } catch {
        return message
      }
    }
  },

  custom: <T>(
    fn: (value: T) => boolean,
    message = 'Validation failed'
  ): ValidationRule<T> => {
    return (value: T) => fn(value) ? true : message
  },

  asyncCustom: <T>(
    fn: (value: T) => Promise<boolean>,
    message = 'Validation failed'
  ): AsyncValidationRule<T> => {
    return async (value: T) => {
      const isValid = await fn(value)
      return isValid ? true : message
    }
  }
}

/**
 * Form field transformers
 */
export const transformers = {
  trim: (value: string) => value.trim(),
  lowercase: (value: string) => value.toLowerCase(),
  uppercase: (value: string) => value.toUpperCase(),
  number: (value: string) => Number(value),
  boolean: (value: any) => Boolean(value),
  date: (value: string) => new Date(value),
  json: (value: string) => {
    try {
      return JSON.parse(value)
    } catch {
      return value
    }
  }
}