import { api } from '@/api/service'

export interface TwoFactorSetup {
  secret: string
  qrCode: string
  backupCodes?: string[]
  manualEntryKey: string
}

export interface TwoFactorVerification {
  userId: string
  code: string
}

export interface BackupCodesResponse {
  codes: string[]
  generated: boolean
}

export class TwoFactorService {
  /**
   * Start 2FA setup process - generates secret and QR code
   */
  static async setup(): Promise<TwoFactorSetup> {
    const response = await api.post('/auth/setup-2fa')
    return response.data
  }

  /**
   * Enable 2FA by verifying the setup code
   */
  static async enable(code: string, secret: string): Promise<{ success: boolean; backupCodes?: string[] }> {
    const response = await api.post('/auth/enable-2fa', {
      code,
      secret
    })
    return response.data
  }

  /**
   * Disable 2FA for the current user
   */
  static async disable(): Promise<{ success: boolean }> {
    const response = await api.post('/auth/disable-2fa')
    return response.data
  }

  /**
   * Verify 2FA code during login
   */
  static async verify(verification: TwoFactorVerification): Promise<{ success: boolean; token?: string }> {
    const response = await api.post('/auth/verify-2fa', verification)
    return response.data
  }

  /**
   * Generate new backup codes (invalidates old ones)
   */
  static async generateBackupCodes(): Promise<BackupCodesResponse> {
    const response = await api.post('/auth/generate-backup-codes')
    return response.data
  }

  /**
   * Get existing backup codes (if any)
   */
  static async getBackupCodes(): Promise<BackupCodesResponse> {
    const response = await api.get('/auth/backup-codes')
    return response.data
  }

  /**
   * Verify backup code during login
   */
  static async verifyBackupCode(userId: string, code: string): Promise<{ success: boolean; token?: string }> {
    const response = await api.post('/auth/verify-backup-code', {
      userId,
      code
    })
    return response.data
  }

  /**
   * Get current 2FA status for user
   */
  static async getStatus(): Promise<{ enabled: boolean; hasBackupCodes: boolean }> {
    const response = await api.get('/auth/2fa-status')
    return response.data
  }
}

export default TwoFactorService