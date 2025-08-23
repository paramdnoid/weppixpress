import dotenv from 'dotenv';
import logger from '../utils/logger.js';

// Load environment variables
dotenv.config();

/**
 * Centralized configuration service
 */
export class ConfigService {
  constructor() {
    this.config = this.loadConfiguration();
    this.validateConfiguration();
    
    logger.info('Configuration service initialized', {
      environment: this.config.app.environment,
      logLevel: this.config.app.logLevel
    });
  }

  /**
   * Load configuration from environment variables with defaults
   */
  loadConfiguration() {
    return {
      app: {
        name: process.env.APP_NAME || 'WeppixPress',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        port: parseInt(process.env.PORT) || 3001,
        host: process.env.HOST || '0.0.0.0',
        logLevel: process.env.LOG_LEVEL || 'info',
        instanceId: process.env.INSTANCE_ID || 'default'
      },

      security: {
        cors: {
          origins: process.env.ALLOWED_ORIGINS?.split(',') || [
            'http://localhost:3000',
            'http://localhost:5173'
          ],
          credentials: true,
          maxAge: 86400 // 24 hours
        },
        rateLimit: {
          general: {
            windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000, // 1 minute
            max: parseInt(process.env.RATE_LIMIT_GENERAL_MAX) || 100
          },
          auth: {
            windowMs: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS) || 900000, // 15 minutes
            max: parseInt(process.env.RATE_LIMIT_AUTH_MAX) || 5
          },
          upload: {
            windowMs: parseInt(process.env.RATE_LIMIT_UPLOAD_WINDOW_MS) || 900000, // 15 minutes
            max: parseInt(process.env.RATE_LIMIT_UPLOAD_MAX) || 20
          }
        },
        helmet: {
          contentSecurityPolicy: {
            useDefaults: true,
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'", "'unsafe-inline'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", 'data:', 'https:'],
              objectSrc: ["'none'"]
            }
          }
        }
      },

      database: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || '',
        name: process.env.DB_NAME || 'weppixpress',
        connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 20,
        acquireTimeout: parseInt(process.env.DB_ACQUIRE_TIMEOUT) || 60000,
        timeout: parseInt(process.env.DB_TIMEOUT) || 60000,
        minimumIdle: parseInt(process.env.DB_MINIMUM_IDLE) || 5,
        idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT) || 300000,
        ssl: process.env.DB_SSL === 'true'
      },

      redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        keyPrefix: process.env.REDIS_KEY_PREFIX || 'weppix',
        maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES) || 3,
        retryDelayOnFailover: parseInt(process.env.REDIS_RETRY_DELAY) || 100
      },

      jwt: {
        secret: process.env.JWT_SECRET,
        refreshSecret: process.env.JWT_REFRESH_SECRET,
        accessTokenExpiry: process.env.JWT_EXPIRES_IN || '15m',
        refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
        issuer: process.env.JWT_ISSUER || 'weppixpress',
        audience: process.env.JWT_AUDIENCE || 'weppixpress-api'
      },

      upload: {
        maxFiles: parseInt(process.env.UPLOAD_MAX_FILES) || 50,
        allowedMimeTypes: process.env.UPLOAD_ALLOWED_MIME_TYPES?.split(',') || [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'text/plain',
          'application/pdf',
          'application/zip'
        ],
        baseDir: process.env.UPLOAD_DIR || './uploads'
      },

      mail: {
        smtp: {
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT) || 587,
          secure: process.env.SMTP_SECURE === 'true',
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        from: {
          name: process.env.MAIL_FROM_NAME || 'WeppixPress',
          address: process.env.MAIL_FROM_ADDRESS
        }
      },

      monitoring: {
        enabled: process.env.MONITORING_ENABLED !== 'false',
        interval: parseInt(process.env.MONITORING_INTERVAL) || 30000, // 30 seconds
        metricsRetention: parseInt(process.env.MONITORING_RETENTION) || 100, // Keep last 100 entries
        thresholds: {
          memory: {
            warning: parseFloat(process.env.MEMORY_WARNING_THRESHOLD) || 0.7,
            critical: parseFloat(process.env.MEMORY_CRITICAL_THRESHOLD) || 0.9
          },
          cpu: {
            warning: parseFloat(process.env.CPU_WARNING_THRESHOLD) || 0.7,
            critical: parseFloat(process.env.CPU_CRITICAL_THRESHOLD) || 0.9
          },
          responseTime: {
            warning: parseInt(process.env.RESPONSE_TIME_WARNING) || 1000,
            critical: parseInt(process.env.RESPONSE_TIME_CRITICAL) || 5000
          },
          errorRate: {
            warning: parseFloat(process.env.ERROR_RATE_WARNING) || 0.05,
            critical: parseFloat(process.env.ERROR_RATE_CRITICAL) || 0.1
          }
        }
      },

      websocket: {
        path: process.env.WS_PATH || '/ws',
        pingInterval: parseInt(process.env.WS_PING_INTERVAL) || 30000,
        pingTimeout: parseInt(process.env.WS_PING_TIMEOUT) || 5000
      },

      cache: {
        defaultTtl: parseInt(process.env.CACHE_DEFAULT_TTL) || 3600, // 1 hour
        fileListTtl: parseInt(process.env.CACHE_FILE_LIST_TTL) || 300, // 5 minutes
        userDataTtl: parseInt(process.env.CACHE_USER_DATA_TTL) || 1800 // 30 minutes
      },

      logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: process.env.LOG_FORMAT || 'combined',
        maxFiles: process.env.LOG_MAX_FILES || '30d',
        maxSize: process.env.LOG_MAX_SIZE || '100m'
      }
    };
  }

  /**
   * Validate required configuration values
   */
  validateConfiguration() {
    const required = [
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'DB_HOST',
      'DB_USER',
      'DB_NAME'
    ];

    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      const error = `Missing required environment variables: ${missing.join(', ')}`;
      logger.error(error);
      throw new Error(error);
    }

    // Validate JWT secrets are different
    if (this.config.jwt.secret === this.config.jwt.refreshSecret) {
      const error = 'JWT_SECRET and JWT_REFRESH_SECRET must be different';
      logger.error(error);
      throw new Error(error);
    }

    // Validate numeric values
    if (this.config.app.port <= 0 || this.config.app.port > 65535) {
      throw new Error('PORT must be between 1 and 65535');
    }

    // Log warnings for development environment
    if (this.config.app.environment === 'development') {
      logger.warn('Running in development mode - ensure production settings for deployment');
    }

    logger.debug('Configuration validation passed');
  }

  /**
   * Get configuration value by path
   * @param {string} path - Dot notation path (e.g., 'database.host')
   * @param {*} defaultValue - Default value if not found
   */
  get(path, defaultValue = undefined) {
    return path.split('.').reduce((obj, key) => {
      return obj && obj[key] !== undefined ? obj[key] : defaultValue;
    }, this.config);
  }

  /**
   * Check if configuration value exists
   * @param {string} path - Dot notation path
   */
  has(path) {
    return this.get(path) !== undefined;
  }

  /**
   * Get environment-specific configuration
   */
  getEnvironmentConfig() {
    const env = this.config.app.environment;
    
    const environmentDefaults = {
      development: {
        logging: { level: 'debug' },
        security: { 
          rateLimit: { 
            general: { max: 1000 },
            auth: { max: 50 } 
          }
        }
      },
      test: {
        logging: { level: 'error' },
        monitoring: { enabled: false }
      },
      production: {
        logging: { level: 'warn' },
        security: {
          rateLimit: {
            general: { max: 100 },
            auth: { max: 5 }
          }
        }
      }
    };

    return environmentDefaults[env] || {};
  }

  /**
   * Get sanitized configuration (without sensitive data)
   */
  getSanitizedConfig() {
    const sanitized = JSON.parse(JSON.stringify(this.config));
    
    // Remove sensitive data
    delete sanitized.jwt.secret;
    delete sanitized.jwt.refreshSecret;
    delete sanitized.database.password;
    delete sanitized.mail.smtp.pass;
    
    return sanitized;
  }

  /**
   * Reload configuration (useful for runtime updates)
   */
  reload() {
    logger.info('Reloading configuration...');
    
    // Clear require cache for environment variables
    delete require.cache[require.resolve('dotenv')];
    dotenv.config();
    
    this.config = this.loadConfiguration();
    this.validateConfiguration();
    
    logger.info('Configuration reloaded successfully');
  }

  /**
   * Get configuration health status
   */
  getHealthStatus() {
    try {
      this.validateConfiguration();
      
      return {
        status: 'healthy',
        environment: this.config.app.environment,
        version: this.config.app.version,
        checks: {
          required_vars: 'passed',
          jwt_secrets: 'passed',
          port_range: 'passed'
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        environment: this.config.app.environment
      };
    }
  }

  /**
   * Export configuration as environment file format
   */
  exportAsEnvFormat() {
    const flatten = (obj, prefix = '') => {
      return Object.keys(obj).reduce((acc, key) => {
        const value = obj[key];
        const newKey = prefix ? `${prefix}_${key.toUpperCase()}` : key.toUpperCase();
        
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          Object.assign(acc, flatten(value, newKey));
        } else {
          acc[newKey] = Array.isArray(value) ? value.join(',') : value;
        }
        
        return acc;
      }, {});
    };

    const flattened = flatten(this.getSanitizedConfig());
    
    return Object.entries(flattened)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
  }
}

// Export singleton instance
export default new ConfigService();