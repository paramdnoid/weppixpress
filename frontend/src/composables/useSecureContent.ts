/**
 * Composable for secure content handling and HTML sanitization
 * Provides utilities to prevent XSS attacks when handling user-generated content
 */

import { computed, type Ref } from 'vue'

export interface SecureContentOptions {
  /**
   * Allow basic formatting tags like <b>, <i>, <u>, <strong>, <em>
   */
  allowBasicFormatting?: boolean
  
  /**
   * Allow links with href attributes
   */
  allowLinks?: boolean
  
  /**
   * Maximum length for content before truncation
   */
  maxLength?: number
  
  /**
   * Whether to strip all HTML tags completely
   */
  stripAllTags?: boolean
}

const defaultOptions: SecureContentOptions = {
  allowBasicFormatting: false,
  allowLinks: false,
  maxLength: undefined,
  stripAllTags: true
}

/**
 * Sanitizes HTML content by removing potentially dangerous tags and attributes
 */
function sanitizeHtml(content: string, options: SecureContentOptions = {}): string {
  const opts = { ...defaultOptions, ...options }
  
  if (!content || typeof content !== 'string') {
    return ''
  }
  
  let sanitized = content
  
  // If stripAllTags is true, remove all HTML tags
  if (opts.stripAllTags) {
    sanitized = content.replace(/<[^>]*>/g, '')
  } else {
    // Remove dangerous tags and their content
    const dangerousTags = [
      'script', 'style', 'iframe', 'object', 'embed', 
      'form', 'input', 'button', 'textarea', 'select',
      'meta', 'link', 'base', 'title'
    ]
    
    dangerousTags.forEach(tag => {
      const regex = new RegExp(`<${tag}[^>]*>.*?<\/${tag}>`, 'gis')
      sanitized = sanitized.replace(regex, '')
    })
    
    // Remove any remaining script or style tags (self-closing or malformed)
    sanitized = sanitized.replace(/<(script|style)[^>]*\/?>/gi, '')
    
    // Remove dangerous attributes
    const dangerousAttrs = [
      'on\\w+', // All event handlers (onclick, onload, etc.)
      'javascript:', 
      'data:',
      'vbscript:',
      'expression'
    ]
    
    dangerousAttrs.forEach(attr => {
      const regex = new RegExp(`${attr}[^\\s>]*`, 'gi')
      sanitized = sanitized.replace(regex, '')
    })
    
    // If basic formatting is not allowed, remove formatting tags
    if (!opts.allowBasicFormatting) {
      const formatTags = ['b', 'i', 'u', 'strong', 'em', 'small', 'mark', 'del', 'ins', 'sub', 'sup']
      formatTags.forEach(tag => {
        const regex = new RegExp(`</?${tag}[^>]*>`, 'gi')
        sanitized = sanitized.replace(regex, '')
      })
    }
    
    // If links are not allowed, remove anchor tags but keep content
    if (!opts.allowLinks) {
      sanitized = sanitized.replace(/<\/?a[^>]*>/gi, '')
    } else {
      // Sanitize href attributes in allowed links
      sanitized = sanitized.replace(/<a\s+[^>]*href\s*=\s*["']?([^"'>\s]+)["']?[^>]*>/gi, (match, href) => {
        // Only allow http, https, and relative URLs
        if (href.match(/^(https?:\/\/|\/|\.\/|#)/i)) {
          return `<a href="${href}" target="_blank" rel="noopener noreferrer">`
        }
        return '<a>'
      })
    }
  }
  
  // Truncate if maxLength is specified
  if (opts.maxLength && sanitized.length > opts.maxLength) {
    sanitized = sanitized.substring(0, opts.maxLength).trim() + '...'
  }
  
  // Decode HTML entities for safety
  sanitized = sanitized
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
  
  return sanitized.trim()
}

/**
 * Escapes HTML special characters to prevent XSS
 */
function escapeHtml(content: string): string {
  if (!content || typeof content !== 'string') {
    return ''
  }
  
  return content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Validates and sanitizes file names to prevent path traversal and XSS
 */
function sanitizeFileName(fileName: string): string {
  if (!fileName || typeof fileName !== 'string') {
    return ''
  }
  
  return fileName
    // Remove path traversal attempts
    .replace(/\.\.+/g, '')
    .replace(/[/\\]/g, '')
    // Remove potentially dangerous characters
    .replace(/[<>:"|?*\x00-\x1f]/g, '')
    // Trim whitespace and dots from start/end
    .replace(/^[\s.]+|[\s.]+$/g, '')
    // Limit length
    .substring(0, 255)
    .trim()
}

/**
 * Validates and sanitizes file paths
 */
function sanitizePath(path: string): string {
  if (!path || typeof path !== 'string') {
    return ''
  }
  
  return path
    // Normalize path separators
    .replace(/\\/g, '/')
    // Remove dangerous path components
    .replace(/\.\.+/g, '')
    // Remove multiple consecutive slashes
    .replace(/\/+/g, '/')
    // Remove dangerous characters
    .replace(/[<>:"|?*\x00-\x1f]/g, '')
    // Ensure it starts with / if it's an absolute path
    .replace(/^(?!\/)(.+)/, '/$1')
    .trim()
}

export function useSecureContent() {
  /**
   * Reactive sanitized content
   */
  function createSecureContent(
    source: Ref<string> | string, 
    options?: SecureContentOptions
  ) {
    if (typeof source === 'string') {
      return computed(() => sanitizeHtml(source, options))
    }
    
    return computed(() => sanitizeHtml(source.value, options))
  }
  
  /**
   * Reactive escaped content (for plain text display)
   */
  function createEscapedContent(source: Ref<string> | string) {
    if (typeof source === 'string') {
      return computed(() => escapeHtml(source))
    }
    
    return computed(() => escapeHtml(source.value))
  }
  
  /**
   * Check if content contains potentially dangerous elements
   */
  function isDangerous(content: string): boolean {
    if (!content || typeof content !== 'string') {
      return false
    }
    
    const dangerousPatterns = [
      /<script[^>]*>/i,
      /<iframe[^>]*>/i,
      /javascript:/i,
      /data:text\/html/i,
      /vbscript:/i,
      /on\w+\s*=/i, // Event handlers
      /<form[^>]*>/i,
      /<input[^>]*>/i
    ]
    
    return dangerousPatterns.some(pattern => pattern.test(content))
  }
  
  return {
    // Core sanitization functions
    sanitizeHtml,
    escapeHtml,
    sanitizeFileName,
    sanitizePath,
    
    // Reactive utilities
    createSecureContent,
    createEscapedContent,
    
    // Security checks
    isDangerous
  }
}

export default useSecureContent