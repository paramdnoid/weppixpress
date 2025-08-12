export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

export function validateFileName(name: string): ValidationResult {
  const errors: string[] = []

  if (!name || name.trim().length === 0) {
    errors.push('File name cannot be empty')
  }

  if (name.length > 255) {
    errors.push('File name cannot exceed 255 characters')
  }

  // Check for invalid characters
  const invalidChars = /[<>:"/\\|?*]/
  if (invalidChars.test(name)) {
    errors.push('File name contains invalid characters: < > : " / \\ | ? *')
  }

  // Check for reserved names (Windows)
  const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9']
  if (reservedNames.includes(name.toUpperCase())) {
    errors.push('File name cannot be a reserved system name')
  }

  // Check for names that start or end with spaces or dots
  if (name.startsWith(' ') || name.endsWith(' ')) {
    errors.push('File name cannot start or end with spaces')
  }

  if (name.endsWith('.')) {
    errors.push('File name cannot end with a dot')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

export function validateEmail(email: string): ValidationResult {
  const errors: string[] = []

  if (!email || email.trim().length === 0) {
    errors.push('Email is required')
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (email && !emailRegex.test(email)) {
    errors.push('Please enter a valid email address')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

export function validatePassword(password: string): ValidationResult {
  const errors: string[] = []

  if (!password || password.length === 0) {
    errors.push('Password is required')
  }

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }

  if (!/(?=.*[a-z])/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }

  if (!/(?=.*[A-Z])/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }

  if (!/(?=.*\d)/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

export function validateFileSize(size: number, maxSize: number = 100 * 1024 * 1024): ValidationResult {
  const errors: string[] = []

  if (size <= 0) {
    errors.push('File size must be greater than 0')
  }

  if (size > maxSize) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024))
    errors.push(`File size cannot exceed ${maxSizeMB}MB`)
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

export function validateFileType(fileName: string, allowedTypes: string[] = []): ValidationResult {
  const errors: string[] = []

  if (allowedTypes.length === 0) {
    return { isValid: true, errors: [] }
  }

  const extension = fileName.split('.').pop()?.toLowerCase() || ''
  
  if (!allowedTypes.includes(extension)) {
    errors.push(`File type "${extension}" is not allowed. Allowed types: ${allowedTypes.join(', ')}`)
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}