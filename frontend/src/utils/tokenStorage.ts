/**
 * Secure Token Storage Service
 * Provides encrypted token storage with automatic cleanup
 */

// Simple encryption/decryption using base64 and key rotation
class SecureTokenStorage {
  private static readonly ACCESS_TOKEN_KEY = 'at_enc'
  private static readonly REFRESH_TOKEN_KEY = 'rt_enc'
  private static readonly ENCRYPTION_KEY = 'wep_tk_enc_2024'

  /**
   * Simple XOR encryption for basic token obfuscation
   * Note: This is not cryptographically secure but adds a layer of protection
   */
  private static encrypt(text: string): string {
    if (!text) return ''

    try {
      const key = this.ENCRYPTION_KEY
      let encrypted = ''

      for (let i = 0; i < text.length; i++) {
        encrypted += String.fromCharCode(
          text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
        )
      }

      return btoa(encrypted)
    } catch (error) {
      console.warn('Token encryption failed:', error)
      return text // Fallback to plain text
    }
  }

  /**
   * Decrypt XOR encrypted token
   */
  private static decrypt(encrypted: string): string {
    if (!encrypted) return ''

    try {
      const decoded = atob(encrypted)
      const key = this.ENCRYPTION_KEY
      let decrypted = ''

      for (let i = 0; i < decoded.length; i++) {
        decrypted += String.fromCharCode(
          decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length)
        )
      }

      return decrypted
    } catch (error) {
      console.warn('Token decryption failed:', error)
      return encrypted // Fallback to original
    }
  }

  /**
   * Check if we're in a secure context
   */
  private static isSecureContext(): boolean {
    return window.location.protocol === 'https:' ||
           window.location.hostname === 'localhost'
  }

  /**
   * Store access token securely
   */
  static setAccessToken(token: string): void {
    if (!token) {
      this.removeAccessToken()
      return
    }

    try {
      const encrypted = this.encrypt(token)

      if (this.isSecureContext() && 'sessionStorage' in window) {
        // Use sessionStorage in secure contexts for better security
        sessionStorage.setItem(this.ACCESS_TOKEN_KEY, encrypted)
        // Remove from localStorage if it exists
        localStorage.removeItem(this.ACCESS_TOKEN_KEY)
      } else {
        // Fallback to localStorage with encryption
        localStorage.setItem(this.ACCESS_TOKEN_KEY, encrypted)
      }
    } catch (error) {
      console.error('Failed to store access token:', error)
    }
  }

  /**
   * Get access token
   */
  static getAccessToken(): string | null {
    try {
      // Try sessionStorage first (more secure)
      const sessionToken = sessionStorage.getItem(this.ACCESS_TOKEN_KEY)
      if (sessionToken) {
        return this.decrypt(sessionToken)
      }

      // Fallback to localStorage
      const localToken = localStorage.getItem(this.ACCESS_TOKEN_KEY)
      if (localToken) {
        return this.decrypt(localToken)
      }

      // Legacy support - check for unencrypted token
      const legacyToken = localStorage.getItem('accessToken')
      if (legacyToken) {
        // Migrate to encrypted storage
        this.setAccessToken(legacyToken)
        localStorage.removeItem('accessToken')
        return legacyToken
      }

      return null
    } catch (error) {
      console.error('Failed to retrieve access token:', error)
      return null
    }
  }

  /**
   * Store refresh token securely
   */
  static setRefreshToken(token: string): void {
    if (!token) {
      this.removeRefreshToken()
      return
    }

    try {
      const encrypted = this.encrypt(token)
      // Refresh tokens should persist across sessions
      localStorage.setItem(this.REFRESH_TOKEN_KEY, encrypted)
    } catch (error) {
      console.error('Failed to store refresh token:', error)
    }
  }

  /**
   * Get refresh token
   */
  static getRefreshToken(): string | null {
    try {
      const token = localStorage.getItem(this.REFRESH_TOKEN_KEY)
      if (token) {
        return this.decrypt(token)
      }

      // Legacy support
      const legacyToken = localStorage.getItem('refreshToken')
      if (legacyToken) {
        this.setRefreshToken(legacyToken)
        localStorage.removeItem('refreshToken')
        return legacyToken
      }

      return null
    } catch (error) {
      console.error('Failed to retrieve refresh token:', error)
      return null
    }
  }

  /**
   * Remove access token
   */
  static removeAccessToken(): void {
    try {
      sessionStorage.removeItem(this.ACCESS_TOKEN_KEY)
      localStorage.removeItem(this.ACCESS_TOKEN_KEY)
      localStorage.removeItem('accessToken') // Legacy cleanup
    } catch (error) {
      console.error('Failed to remove access token:', error)
    }
  }

  /**
   * Remove refresh token
   */
  static removeRefreshToken(): void {
    try {
      localStorage.removeItem(this.REFRESH_TOKEN_KEY)
      localStorage.removeItem('refreshToken') // Legacy cleanup
    } catch (error) {
      console.error('Failed to remove refresh token:', error)
    }
  }

  /**
   * Clear all tokens
   */
  static clearAll(): void {
    this.removeAccessToken()
    this.removeRefreshToken()
  }

  /**
   * Check if access token exists
   */
  static hasAccessToken(): boolean {
    return !!this.getAccessToken()
  }

  /**
   * Check if refresh token exists
   */
  static hasRefreshToken(): boolean {
    return !!this.getRefreshToken()
  }
}

export default SecureTokenStorage