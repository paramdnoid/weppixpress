import logger from '../utils/logger.js';
import { AppError } from '../utils/errors.js';

/**
 * Service for tracking, analyzing, and alerting on application errors
 */
export class ErrorMetricsService {
  constructor() {
    this.errorCounts = new Map();
    this.errorHistory = [];
    this.maxHistorySize = 1000;
    this.alertThresholds = {
      errorRate: 0.1, // 10% error rate
      errorCount: 50, // 50 errors in time window
      timeWindow: 5 * 60 * 1000, // 5 minutes
      criticalErrors: 5 // 5 critical errors
    };
    
    // Start cleanup interval
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000); // 1 minute
    
    logger.info('Error metrics service initialized');
  }

  /**
   * Record an error occurrence
   * @param {Error} error - The error that occurred
   * @param {Object} context - Additional context about the error
   */
  recordError(error, context = {}) {
    const errorMetric = {
      timestamp: Date.now(),
      type: error.constructor.name,
      message: error.message,
      code: error.code || 'UNKNOWN',
      statusCode: error.statusCode || 500,
      isOperational: error.isOperational !== false,
      stack: error.stack,
      context: {
        userId: context.userId,
        requestId: context.requestId,
        ip: context.ip,
        userAgent: context.userAgent,
        url: context.url,
        method: context.method,
        ...context
      }
    };

    // Add to history
    this.errorHistory.push(errorMetric);
    
    // Maintain history size limit
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.shift();
    }

    // Update error counts
    const errorKey = `${error.constructor.name}:${error.code || 'UNKNOWN'}`;
    const currentCount = this.errorCounts.get(errorKey) || 0;
    this.errorCounts.set(errorKey, currentCount + 1);

    // Check for alert conditions
    this.checkAlertConditions(errorMetric);

    logger.debug('Error metric recorded', {
      type: errorMetric.type,
      code: errorMetric.code,
      contextKeys: Object.keys(errorMetric.context)
    });
  }

  /**
   * Check if error conditions warrant an alert
   */
  checkAlertConditions(errorMetric) {
    const now = Date.now();
    const timeWindow = this.alertThresholds.timeWindow;
    
    // Get recent errors within time window
    const recentErrors = this.errorHistory.filter(
      e => now - e.timestamp < timeWindow
    );

    // Check error rate (if we have request metrics)
    if (this.requestCount > 0) {
      const errorRate = recentErrors.length / this.requestCount;
      if (errorRate > this.alertThresholds.errorRate) {
        this.triggerAlert('HIGH_ERROR_RATE', {
          errorRate,
          threshold: this.alertThresholds.errorRate,
          recentErrors: recentErrors.length,
          timeWindow: timeWindow / 1000 / 60 // minutes
        });
      }
    }

    // Check error count
    if (recentErrors.length > this.alertThresholds.errorCount) {
      this.triggerAlert('HIGH_ERROR_COUNT', {
        errorCount: recentErrors.length,
        threshold: this.alertThresholds.errorCount,
        timeWindow: timeWindow / 1000 / 60 // minutes
      });
    }

    // Check for critical errors
    const criticalErrors = recentErrors.filter(
      e => !e.isOperational || e.statusCode >= 500
    );
    
    if (criticalErrors.length > this.alertThresholds.criticalErrors) {
      this.triggerAlert('CRITICAL_ERRORS', {
        criticalErrorCount: criticalErrors.length,
        threshold: this.alertThresholds.criticalErrors,
        timeWindow: timeWindow / 1000 / 60 // minutes
      });
    }
  }

  /**
   * Trigger an alert for critical error conditions
   */
  triggerAlert(alertType, details) {
    const alert = {
      type: alertType,
      timestamp: Date.now(),
      details,
      severity: this.getAlertSeverity(alertType)
    };

    logger.error('Error metrics alert triggered', alert);

    // Here you could integrate with external alerting systems
    // like Slack, PagerDuty, email, etc.
    this.sendAlert(alert);
  }

  /**
   * Get alert severity level
   */
  getAlertSeverity(alertType) {
    switch (alertType) {
      case 'CRITICAL_ERRORS':
        return 'CRITICAL';
      case 'HIGH_ERROR_RATE':
        return 'HIGH';
      case 'HIGH_ERROR_COUNT':
        return 'MEDIUM';
      default:
        return 'LOW';
    }
  }

  /**
   * Send alert to configured channels
   */
  async sendAlert(alert) {
    // Placeholder for alert integrations
    // This would integrate with your alerting infrastructure
    
    if (process.env.NODE_ENV === 'development') {
      console.warn('🚨 ERROR ALERT:', alert);
    }

    // Example integrations you might add:
    // - await this.sendSlackAlert(alert);
    // - await this.sendEmailAlert(alert);
    // - await this.sendPagerDutyAlert(alert);
  }

  /**
   * Get error metrics summary
   */
  getMetrics(timeWindow = 3600000) { // Default 1 hour
    const now = Date.now();
    const recentErrors = this.errorHistory.filter(
      e => now - e.timestamp < timeWindow
    );

    // Group errors by type
    const errorsByType = {};
    const errorsByCode = {};
    
    recentErrors.forEach(error => {
      // By type
      errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;
      
      // By code
      const code = error.code || 'UNKNOWN';
      errorsByCode[code] = (errorsByCode[code] || 0) + 1;
    });

    // Calculate rates
    const totalErrors = recentErrors.length;
    const operationalErrors = recentErrors.filter(e => e.isOperational).length;
    const criticalErrors = recentErrors.filter(e => !e.isOperational || e.statusCode >= 500).length;

    return {
      summary: {
        totalErrors,
        operationalErrors,
        criticalErrors,
        timeWindow: timeWindow / 1000 / 60, // minutes
        timestamp: now
      },
      breakdown: {
        byType: errorsByType,
        byCode: errorsByCode
      },
      topErrors: this.getTopErrors(recentErrors, 10),
      trends: this.calculateTrends(recentErrors)
    };
  }

  /**
   * Get most frequent errors
   */
  getTopErrors(errors, limit = 10) {
    const errorGroups = {};
    
    errors.forEach(error => {
      const key = `${error.type}:${error.code}:${error.message}`;
      if (!errorGroups[key]) {
        errorGroups[key] = {
          type: error.type,
          code: error.code,
          message: error.message,
          count: 0,
          lastOccurrence: error.timestamp
        };
      }
      errorGroups[key].count++;
      errorGroups[key].lastOccurrence = Math.max(
        errorGroups[key].lastOccurrence,
        error.timestamp
      );
    });

    return Object.values(errorGroups)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Calculate error trends
   */
  calculateTrends(errors) {
    const now = Date.now();
    const hourAgo = now - 3600000;
    const dayAgo = now - 86400000;

    const lastHour = errors.filter(e => e.timestamp > hourAgo).length;
    const lastDay = errors.filter(e => e.timestamp > dayAgo).length;

    return {
      lastHour,
      lastDay,
      hourlyRate: lastHour,
      dailyRate: lastDay / 24
    };
  }

  /**
   * Update request count for error rate calculation
   */
  updateRequestCount(count) {
    this.requestCount = count;
  }

  /**
   * Cleanup old error history
   */
  cleanup() {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
    const initialLength = this.errorHistory.length;
    
    this.errorHistory = this.errorHistory.filter(e => e.timestamp > cutoff);
    
    const removed = initialLength - this.errorHistory.length;
    if (removed > 0) {
      logger.debug(`Cleaned up ${removed} old error metrics`);
    }
  }

  /**
   * Get health status based on error metrics
   */
  getHealthStatus() {
    const metrics = this.getMetrics(300000); // Last 5 minutes
    const totalErrors = metrics.summary.totalErrors;
    const criticalErrors = metrics.summary.criticalErrors;

    let status = 'healthy';
    let issues = [];

    if (criticalErrors > 0) {
      status = 'degraded';
      issues.push(`${criticalErrors} critical errors in last 5 minutes`);
    }

    if (totalErrors > 20) {
      status = status === 'degraded' ? 'unhealthy' : 'degraded';
      issues.push(`High error count: ${totalErrors} errors in last 5 minutes`);
    }

    return {
      status,
      issues,
      metrics: metrics.summary
    };
  }

  /**
   * Stop the service and cleanup resources
   */
  stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    logger.info('Error metrics service stopped');
  }
}

export default new ErrorMetricsService();