/**
 * Production-safe logging service
 * Automatically filters logs based on environment
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogConfig {
  level: LogLevel
  enableInProduction: boolean
  prefix?: string
}

class Logger {
  private config: LogConfig
  private isProduction: boolean

  constructor(config: Partial<LogConfig> = {}) {
    this.isProduction = process.env.NODE_ENV === 'production'
    this.config = {
      level: 'info',
      enableInProduction: false,
      prefix: '[App]',
      ...config
    }
  }

  private shouldLog(level: LogLevel): boolean {
    if (this.isProduction && !this.config.enableInProduction) {
      // In production, only allow error and warn by default
      return level === 'error' || level === 'warn'
    }

    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    }

    return levels[level] >= levels[this.config.level]
  }

  private formatMessage(message: string, context?: any): [string, ...any[]] {
    const timestamp = new Date().toISOString()
    const prefix = this.config.prefix || '[App]'
    const formattedMessage = `${prefix} ${timestamp} - ${message}`

    return context !== undefined
      ? [formattedMessage, context]
      : [formattedMessage]
  }

  debug(message: string, context?: any): void {
    if (this.shouldLog('debug')) {
      console.debug(...this.formatMessage(message, context))
    }
  }

  info(message: string, context?: any): void {
    if (this.shouldLog('info')) {
      console.info(...this.formatMessage(message, context))
    }
  }

  warn(message: string, context?: any): void {
    if (this.shouldLog('warn')) {
      console.warn(...this.formatMessage(message, context))
    }
  }

  error(message: string, context?: any): void {
    if (this.shouldLog('error')) {
      console.error(...this.formatMessage(message, context))
    }
  }

  /**
   * Log performance timing
   */
  time(label: string): void {
    if (!this.isProduction) {
      console.time(`${this.config.prefix} ${label}`)
    }
  }

  timeEnd(label: string): void {
    if (!this.isProduction) {
      console.timeEnd(`${this.config.prefix} ${label}`)
    }
  }

  /**
   * Create a child logger with a specific context
   */
  createChild(prefix: string): Logger {
    return new Logger({
      ...this.config,
      prefix: `${this.config.prefix}:${prefix}`
    })
  }
}

// Default logger instance
export const logger = new Logger({
  level: 'debug',
  enableInProduction: false,
  prefix: '[WeppixPress]'
})

// Specialized loggers
export const fileLogger = logger.createChild('Files')
export const authLogger = logger.createChild('Auth')
export const uploadLogger = logger.createChild('Upload')
export const apiLogger = logger.createChild('API')

export default logger