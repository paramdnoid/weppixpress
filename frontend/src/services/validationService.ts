/**
 * Security-focused validation service
 * Provides input validation and sanitization functions
 */

export interface ValidationResult {
  isValid: boolean
  error?: string
}

export class ValidationService {
  /**
   * Validates filename for security and filesystem compatibility
   */
  static validateFileName(name: string): ValidationResult {
    if (!name || typeof name !== 'string') {
      return { isValid: false, error: 'Filename must be a non-empty string' }
    }

    const trimmed = name.trim()
    if (trimmed.length === 0) {
      return { isValid: false, error: 'Filename cannot be empty' }
    }

    // Check length limits
    if (trimmed.length > 255) {
      return { isValid: false, error: 'Filename too long (max 255 characters)' }
    }

    // Check for dangerous characters
    const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/
    if (dangerousChars.test(trimmed)) {
      return { isValid: false, error: 'Filename contains invalid characters' }
    }

    // Check for reserved names (Windows)
    const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i
    if (reservedNames.test(trimmed)) {
      return { isValid: false, error: 'Filename is reserved and cannot be used' }
    }

    // Check for leading/trailing dots or spaces
    if (trimmed.startsWith('.') && trimmed.length === 1) {
      return { isValid: false, error: 'Filename cannot be just a dot' }
    }

    if (trimmed === '..') {
      return { isValid: false, error: 'Filename cannot be ".."' }
    }

    if (trimmed.endsWith(' ') || trimmed.endsWith('.')) {
      return { isValid: false, error: 'Filename cannot end with space or dot' }
    }

    return { isValid: true }
  }

  /**
   * Validates folder name with additional restrictions
   */
  static validateFolderName(name: string): ValidationResult {
    const basicValidation = this.validateFileName(name)
    if (!basicValidation.isValid) {
      return basicValidation
    }

    // Additional folder-specific checks
    if (name.includes('.') && name.startsWith('.') && name.length > 1) {
      // Allow hidden folders like .git, but validate carefully
      const withoutDot = name.substring(1)
      if (withoutDot.includes('.')) {
        return { isValid: false, error: 'Folder names with multiple dots are not allowed' }
      }
    }

    return { isValid: true }
  }

  /**
   * Sanitizes file path to prevent path traversal attacks
   */
  static sanitizeFilePath(path: string): string {
    if (!path || typeof path !== 'string') {
      return '/'
    }

    return path
      // Remove null bytes
      .replace(/\x00/g, '')
      // Remove parent directory references
      .replace(/\.\./g, '')
      // Normalize slashes
      .replace(/[\\\/]+/g, '/')
      // Remove leading multiple slashes but keep single leading slash
      .replace(/^\/+/, '/')
      // Remove trailing slashes except for root
      .replace(/\/+$/, '') || '/'
  }

  /**
   * Validates search query for potential injection attacks
   */
  static validateSearchQuery(query: string): ValidationResult {
    if (!query || typeof query !== 'string') {
      return { isValid: true } // Empty search is valid
    }

    if (query.length > 1000) {
      return { isValid: false, error: 'Search query too long' }
    }

    // Check for potential script injection
    const scriptPattern = /<script|javascript:|vbscript:|on\w+=/i
    if (scriptPattern.test(query)) {
      return { isValid: false, error: 'Invalid characters in search query' }
    }

    return { isValid: true }
  }

  /**
   * Sanitizes HTML content to prevent XSS
   */
  static sanitizeHtml(html: string): string {
    if (!html || typeof html !== 'string') {
      return ''
    }

    // Basic HTML sanitization - remove script tags and event handlers
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/data:text\/html/gi, '')
  }

  /**
   * Validates file size
   */
  static validateFileSize(size: number, maxSize: number = 5 * 1024 * 1024 * 1024): ValidationResult { // 5GB default
    if (typeof size !== 'number' || size < 0) {
      return { isValid: false, error: 'Invalid file size' }
    }

    if (size === 0) {
      return { isValid: false, error: 'File is empty' }
    }

    if (size > maxSize) {
      const maxSizeFormatted = this.formatFileSize(maxSize)
      return { isValid: false, error: `File size exceeds limit of ${maxSizeFormatted}` }
    }

    return { isValid: true }
  }

  /**
   * Formats file size for display
   */
  private static formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    let size = bytes
    let unitIndex = 0

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`
  }

  /**
   * Validates file extension against allowed types
   */
  static validateFileExtension(filename: string, allowedExtensions?: string[]): ValidationResult {
    if (!filename || typeof filename !== 'string') {
      return { isValid: false, error: 'Invalid filename' }
    }

    const extension = filename.split('.').pop()?.toLowerCase()
    
    if (!extension) {
      return { isValid: true } // Files without extension are allowed
    }

    if (allowedExtensions && allowedExtensions.length > 0) {
      if (!allowedExtensions.includes(extension)) {
        return { 
          isValid: false, 
          error: `File type '.${extension}' is not allowed. Allowed types: ${allowedExtensions.join(', ')}` 
        }
      }
    }

    // Block potentially dangerous extensions
    const dangerousExtensions = [
      'exe', 'bat', 'cmd', 'com', 'pif', 'scr', 'vbs', 'js', 'jar',
      'msi', 'dll', 'scf', 'lnk', 'inf', 'reg', 'ps1', 'sh'
    ]

    if (dangerousExtensions.includes(extension)) {
      return { 
        isValid: false, 
        error: `File type '.${extension}' is not allowed for security reasons` 
      }
    }

    return { isValid: true }
  }

  /**
   * Comprehensive file validation
   */
  static validateFile(
    file: File,
    options: {
      maxSize?: number
      allowedExtensions?: string[]
    } = {}
  ): ValidationResult {
    // Validate file object
    if (!file || !(file instanceof File)) {
      return { isValid: false, error: 'Invalid file object' }
    }

    // Validate filename
    const nameValidation = this.validateFileName(file.name)
    if (!nameValidation.isValid) {
      return nameValidation
    }

    // Validate file size
    const sizeValidation = this.validateFileSize(file.size, options.maxSize)
    if (!sizeValidation.isValid) {
      return sizeValidation
    }

    // Validate file extension
    const extensionValidation = this.validateFileExtension(file.name, options.allowedExtensions)
    if (!extensionValidation.isValid) {
      return extensionValidation
    }

    return { isValid: true }
  }
}

// Export default instance for convenience
export const validator = ValidationService