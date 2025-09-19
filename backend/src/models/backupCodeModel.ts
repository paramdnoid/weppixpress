import { Database } from 'sqlite3'
import crypto from 'crypto'

export interface BackupCode {
  id: number
  user_id: number
  code: string
  used: boolean
  used_at: string | null
  created_at: string
}

export class BackupCodeModel {
  constructor(private db: Database) {}

  /**
   * Generate and store backup codes for a user
   */
  async generateBackupCodes(userId: number, count: number = 10): Promise<string[]> {
    return new Promise((resolve, reject) => {
      // First, invalidate all existing backup codes for this user
      this.db.run(
        'DELETE FROM backup_codes WHERE user_id = ?',
        [userId],
        (err) => {
          if (err) {
            reject(err)
            return
          }

          // Generate new backup codes
          const codes: string[] = []
          for (let i = 0; i < count; i++) {
            const code = this.generateCode()
            codes.push(code)
          }

          // Insert new codes
          const stmt = this.db.prepare(
            'INSERT INTO backup_codes (user_id, code) VALUES (?, ?)'
          )

          let completed = 0
          let hasError = false

          codes.forEach((code) => {
            stmt.run([userId, code], (err) => {
              if (err && !hasError) {
                hasError = true
                reject(err)
                return
              }

              completed++
              if (completed === codes.length && !hasError) {
                stmt.finalize()
                resolve(codes)
              }
            })
          })
        }
      )
    })
  }

  /**
   * Get unused backup codes for a user
   */
  async getBackupCodes(userId: number): Promise<BackupCode[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM backup_codes WHERE user_id = ? AND used = FALSE ORDER BY created_at ASC',
        [userId],
        (err, rows: BackupCode[]) => {
          if (err) {
            reject(err)
          } else {
            resolve(rows || [])
          }
        }
      )
    })
  }

  /**
   * Verify and mark a backup code as used
   */
  async useBackupCode(userId: number, code: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      // First check if the code exists and is unused
      this.db.get(
        'SELECT id FROM backup_codes WHERE user_id = ? AND code = ? AND used = FALSE',
        [userId, code],
        (err, row) => {
          if (err) {
            reject(err)
            return
          }

          if (!row) {
            resolve(false) // Code doesn't exist or already used
            return
          }

          // Mark the code as used
          this.db.run(
            'UPDATE backup_codes SET used = TRUE, used_at = CURRENT_TIMESTAMP WHERE id = ?',
            [(row as any).id],
            (err) => {
              if (err) {
                reject(err)
              } else {
                resolve(true)
              }
            }
          )
        }
      )
    })
  }

  /**
   * Check if user has any backup codes
   */
  async hasBackupCodes(userId: number): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT COUNT(*) as count FROM backup_codes WHERE user_id = ? AND used = FALSE',
        [userId],
        (err, row: any) => {
          if (err) {
            reject(err)
          } else {
            resolve(row.count > 0)
          }
        }
      )
    })
  }

  /**
   * Delete all backup codes for a user (used when disabling 2FA)
   */
  async deleteUserBackupCodes(userId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        'DELETE FROM backup_codes WHERE user_id = ?',
        [userId],
        (err) => {
          if (err) {
            reject(err)
          } else {
            resolve()
          }
        }
      )
    })
  }

  /**
   * Generate a secure backup code
   */
  private generateCode(): string {
    // Generate 8-character alphanumeric code (excluding confusing characters)
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let result = ''

    for (let i = 0; i < 8; i++) {
      const randomIndex = crypto.randomInt(0, chars.length)
      result += chars[randomIndex]
    }

    // Format as XXXX-XXXX for better readability
    return `${result.slice(0, 4)}-${result.slice(4)}`
  }
}

export default BackupCodeModel