/**
 * Shared validation functions
 */

import type { User, FileItem, Email } from './types'

// Email validation
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Password validation
export const isValidPassword = (password: string, options?: {
  minLength?: number
  requireUppercase?: boolean
  requireLowercase?: boolean
  requireNumbers?: boolean
  requireSpecial?: boolean
}): { valid: boolean; errors: string[] } => {
  const errors: string[] = []
  const opts = {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecial: true,
    ...options
  }

  if (password.length < opts.minLength) {
    errors.push(`Password must be at least ${opts.minLength} characters long`)
  }

  if (opts.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }

  if (opts.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }

  if (opts.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  if (opts.requireSpecial && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

// Phone validation
export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/
  return phoneRegex.test(phone.replace(/\s/g, ''))
}

// URL validation
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

// UUID validation
export const isValidUuid = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

// File size validation
export const isValidFileSize = (size: number, maxSizeInMB: number): boolean => {
  return size <= maxSizeInMB * 1024 * 1024
}

// File extension validation
export const isValidFileExtension = (filename: string, allowedExtensions: string[]): boolean => {
  const extension = filename.split('.').pop()?.toLowerCase()
  if (!extension) return false
  return allowedExtensions.map(ext => ext.toLowerCase()).includes(extension)
}

// MIME type validation
export const isValidMimeType = (mimeType: string, allowedTypes: string[]): boolean => {
  return allowedTypes.some(type => {
    if (type.includes('*')) {
      const [category] = type.split('/')
      return mimeType.startsWith(`${category}/`)
    }
    return mimeType === type
  })
}

// Date validation
export const isValidDate = (date: string | Date): boolean => {
  const d = date instanceof Date ? date : new Date(date)
  return d instanceof Date && !isNaN(d.getTime())
}

// Date range validation
export const isValidDateRange = (startDate: string | Date, endDate: string | Date): boolean => {
  if (!isValidDate(startDate) || !isValidDate(endDate)) return false
  const start = startDate instanceof Date ? startDate : new Date(startDate)
  const end = endDate instanceof Date ? endDate : new Date(endDate)
  return start <= end
}

// Credit card validation (Luhn algorithm)
export const isValidCreditCard = (cardNumber: string): boolean => {
  const cleaned = cardNumber.replace(/\s/g, '')
  if (!/^\d+$/.test(cleaned)) return false

  let sum = 0
  let isEven = false

  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i], 10)

    if (isEven) {
      digit *= 2
      if (digit > 9) {
        digit -= 9
      }
    }

    sum += digit
    isEven = !isEven
  }

  return sum % 10 === 0
}

// IPv4 validation
export const isValidIPv4 = (ip: string): boolean => {
  const ipv4Regex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
  return ipv4Regex.test(ip)
}

// IPv6 validation
export const isValidIPv6 = (ip: string): boolean => {
  const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/
  return ipv6Regex.test(ip)
}

// MAC address validation
export const isValidMacAddress = (mac: string): boolean => {
  const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/
  return macRegex.test(mac)
}

// Hex color validation
export const isValidHexColor = (color: string): boolean => {
  const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
  return hexColorRegex.test(color)
}

// RGB color validation
export const isValidRgbColor = (color: string): boolean => {
  const rgbRegex = /^rgb\(\s*([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])\s*,\s*([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])\s*,\s*([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])\s*\)$/
  return rgbRegex.test(color)
}

// Username validation
export const isValidUsername = (username: string, options?: {
  minLength?: number
  maxLength?: number
  allowSpecialChars?: boolean
}): boolean => {
  const opts = {
    minLength: 3,
    maxLength: 20,
    allowSpecialChars: false,
    ...options
  }

  if (username.length < opts.minLength || username.length > opts.maxLength) {
    return false
  }

  const regex = opts.allowSpecialChars
    ? /^[a-zA-Z0-9_.-]+$/
    : /^[a-zA-Z0-9]+$/

  return regex.test(username)
}

// JSON validation
export const isValidJson = (str: string): boolean => {
  try {
    JSON.parse(str)
    return true
  } catch {
    return false
  }
}

// Base64 validation
export const isValidBase64 = (str: string): boolean => {
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/
  return base64Regex.test(str) && str.length % 4 === 0
}

// JWT validation
export const isValidJwt = (token: string): boolean => {
  const parts = token.split('.')
  if (parts.length !== 3) return false

  try {
    parts.forEach(part => {
      if (!isValidBase64(part.replace(/-/g, '+').replace(/_/g, '/'))) {
        throw new Error('Invalid base64')
      }
    })
    return true
  } catch {
    return false
  }
}

// Semantic version validation
export const isValidSemver = (version: string): boolean => {
  const semverRegex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/
  return semverRegex.test(version)
}

// Postal code validation (US)
export const isValidUsPostalCode = (code: string): boolean => {
  const usPostalRegex = /^\d{5}(-\d{4})?$/
  return usPostalRegex.test(code)
}

// Strong password generator
export const generateStrongPassword = (length: number = 16): string => {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const numbers = '0123456789'
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?'
  const all = uppercase + lowercase + numbers + special

  let password = ''
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += special[Math.floor(Math.random() * special.length)]

  for (let i = password.length; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)]
  }

  return password.split('').sort(() => Math.random() - 0.5).join('')
}

// Export validation schemas for complex objects
export const userValidationSchema = {
  email: (email: string) => isValidEmail(email),
  password: (password: string) => isValidPassword(password).valid,
  first_name: (name: string) => name.length >= 1 && name.length <= 50,
  last_name: (name: string) => name.length >= 1 && name.length <= 50,
}

export const fileValidationSchema = {
  name: (name: string) => name.length >= 1 && name.length <= 255,
  size: (size: number) => size > 0 && size <= 100 * 1024 * 1024, // Max 100MB
  mime_type: (type: string) => type.length > 0,
}
