import logger from '../utils/logger.js';
import cacheService from './cacheService.js';
import databaseService from './databaseService.js';
import os from 'os';
import process from 'process';

// Import admin WebSocket service for alerts
let adminWebSocketService: any = null;

// Lazy load to avoid circular dependencies
const getAdminWebSocketService = async () => {
  if (!adminWebSocketService) {
    try {
      const module = await import('./adminWebSocketService.js');
      adminWebSocketService = module.default;
    } catch (error) {
      logger.warn('Could not load admin WebSocket service for alerts:', error);
    }
  }
  return adminWebSocketService;
};

/**
 * System monitoring and health check service
 */
class MonitoringService {
  metrics: any;
  thresholds: any;
  alerts: any[];
  isMonitoring: boolean;
  monitoringInterval: NodeJS.Timeout | null;

  constructor() {
    this.metrics = {
      requests: { total: 0, errors: 0, lastReset: Date.now() },
      response_times: [],
      memory_usage: [],
      cpu_usage: [],
      active_connections: 0,
      database_queries: { total: 0, errors: 0, slow_queries: 0 },
      cache_operations: { hits: 0, misses: 0, errors: 0 }
    };

    this.thresholds = {
      memory_usage_critical: 0.95,
      memory_usage_warning: 0.85,
      cpu_usage_critical: 0.95,
      cpu_usage_warning: 0.80,
      response_time_critical: 10000,
      response_time_warning: 2000,
      error_rate_critical: 0.15,
      error_rate_warning: 0.08
    };

    this.alerts = [];
    this.isMonitoring = false;
    this.monitoringInterval = null;

    // Start monitoring on construct
    this.startMonitoring();
  }

  /**
   * Start system monitoring
   */
  startMonitoring() {
    if (this.isMonitoring) return;
    this.isMonitoring = true;

    // Collect system metrics every 30 seconds
    this.monitoringInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, 30_000);

    logger.info('Monitoring service started');
  }

  /**
   * Stop system monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.isMonitoring = false;
    logger.info('Monitoring service stopped');
  }

  /**
   * Collect system metrics
   */
  async collectSystemMetrics() {
    try {
      const memoryUsage = process.memoryUsage();
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;

      // Memory metrics
      const memoryUsagePercent = usedMemory / totalMemory;
      this.metrics.memory_usage.push({
        timestamp: Date.now(),
        used: usedMemory,
        free: freeMemory,
        total: totalMemory,
        percentage: memoryUsagePercent,
        heap_used: memoryUsage.heapUsed,
        heap_total: memoryUsage.heapTotal,
        rss: memoryUsage.rss
      });

      // Keep only last 100 entries
      if (this.metrics.memory_usage.length > 100) {
        this.metrics.memory_usage = this.metrics.memory_usage.slice(-100);
      }

      // CPU metrics
      const cpuUsage = os.loadavg()[0] / Math.max(os.cpus().length, 1);
      this.metrics.cpu_usage.push({
        timestamp: Date.now(),
        usage: cpuUsage,
        loadavg: os.loadavg(),
        cores: os.cpus().length
      });

      if (this.metrics.cpu_usage.length > 100) {
        this.metrics.cpu_usage = this.metrics.cpu_usage.slice(-100);
      }

      // Check for alerts
      this.checkAlerts(memoryUsagePercent, cpuUsage);

      // Log metrics every ~5 minutes (best-effort)
      const now = Date.now();
      if (now % 300_000 < 30_000) {
        logger.info('System metrics', {
          memory_usage: `${(memoryUsagePercent * 100).toFixed(1)}%`,
          cpu_usage: `${(cpuUsage * 100).toFixed(1)}%`,
          heap_used: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(1)}MB`,
          requests_per_minute: this.getRequestsPerMinute(),
          error_rate: this.getErrorRate()
        });
      }
    } catch (error) {
      logger.error('Error collecting system metrics:', error);
    }
  }

  /**
   * Check for system alerts
   */
  checkAlerts(memoryUsage, cpuUsage) {
    // Memory alerts
    if (memoryUsage > this.thresholds.memory_usage_critical) {
      this.addAlert('memory_critical', `Memory usage critical: ${(memoryUsage * 100).toFixed(1)}%`, 'critical');
    } else if (memoryUsage > this.thresholds.memory_usage_warning) {
      this.addAlert('memory_warning', `Memory usage high: ${(memoryUsage * 100).toFixed(1)}%`, 'warning');
    }

    // CPU alerts
    if (cpuUsage > this.thresholds.cpu_usage_critical) {
      this.addAlert('cpu_critical', `CPU usage critical: ${(cpuUsage * 100).toFixed(1)}%`, 'critical');
    } else if (cpuUsage > this.thresholds.cpu_usage_warning) {
      this.addAlert('cpu_warning', `CPU usage high: ${(cpuUsage * 100).toFixed(1)}%`, 'warning');
    }

    // Error rate alerts
    const errorRate = this.getErrorRate();
    if (errorRate > this.thresholds.error_rate_critical) {
      this.addAlert('error_rate_critical', `Error rate critical: ${(errorRate * 100).toFixed(1)}%`, 'critical');
    } else if (errorRate > this.thresholds.error_rate_warning) {
      this.addAlert('error_rate_warning', `Error rate high: ${(errorRate * 100).toFixed(1)}%`, 'warning');
    }

    // Response time alerts
    const avgResponseTime = this.getAverageResponseTime();
    if (avgResponseTime > this.thresholds.response_time_critical) {
      this.addAlert('response_time_critical', `Response time critical: ${avgResponseTime}ms`, 'critical');
    } else if (avgResponseTime > this.thresholds.response_time_warning) {
      this.addAlert('response_time_warning', `Response time high: ${avgResponseTime}ms`, 'warning');
    }
  }

  /**
   * Add alert with deduplication
   */
  async addAlert(type, message, level) {
    const now = Date.now();
    const lastAlert = this.alerts.find(a => a.type === type && a.level === level);

    // Don't spam alerts - only add if last alert of same type was > 5 minutes ago
    if (!lastAlert || (now - lastAlert.timestamp) > 300_000) {
      const alert = {
        id: `${type}_${now}`,
        type,
        title: this.getAlertTitle(type, level),
        message,
        level,
        timestamp: now
      };

      this.alerts.push(alert);

      // Keep only last 50 alerts
      if (this.alerts.length > 50) {
        this.alerts = this.alerts.slice(-50);
      }

      logger.warn('System alert', alert);

      // Broadcast to admin WebSocket clients
      try {
        const wsService = await getAdminWebSocketService();
        if (wsService) {
          wsService.broadcastSystemAlert(alert);
        }
      } catch (error) {
        logger.warn('Failed to broadcast system alert via WebSocket:', error);
      }
    }
  }

  /**
   * Generate alert title based on type and level
   */
  getAlertTitle(type, level) {
    const titles = {
      memory_critical: 'Critical Memory Usage',
      memory_warning: 'High Memory Usage',
      cpu_critical: 'Critical CPU Usage',
      cpu_warning: 'High CPU Usage',
      error_rate_critical: 'Critical Error Rate',
      error_rate_warning: 'High Error Rate',
      response_time_critical: 'Critical Response Time',
      response_time_warning: 'High Response Time',
      database_error: 'Database Error',
      cache_error: 'Cache Error',
      disk_space_critical: 'Critical Disk Space',
      disk_space_warning: 'Low Disk Space'
    };

    return titles[type] || `System ${level.charAt(0).toUpperCase() + level.slice(1)}`;
  }

  /**
   * Record request metrics (used by middleware)
   */
  recordRequest(method, path, statusCode, responseTime, error = null) {
    this.metrics.requests.total++;
    // Only count 5xx errors and authentication failures as errors
    // Don't count 404s and other client errors as system errors
    if (error || (statusCode >= 500) || (statusCode === 401 && path.includes('/auth'))) {
      this.metrics.requests.errors++;
    }

    this.metrics.response_times.push({
      timestamp: Date.now(),
      method,
      path,
      statusCode,
      responseTime,
      error: error ? error.message : null
    });

    // Keep only last 1000 requests
    if (this.metrics.response_times.length > 1000) {
      this.metrics.response_times = this.metrics.response_times.slice(-1000);
    }
  }

  /**
   * Record database operation (used by wrappers)
   */
  recordDatabaseOperation(operation, duration, error = null) {
    this.metrics.database_queries.total++;

    if (error) {
      this.metrics.database_queries.errors++;
    }

    if (duration > 1000) { // Slow query threshold: 1s
      this.metrics.database_queries.slow_queries++;
      logger.warn('Slow database query detected', {
        operation: String(operation || '').substring(0, 100),
        duration
      });
    }
  }

  /**
   * Record cache operation (used by wrappers)
   */
  recordCacheOperation(operation, hit = false, error = null) {
    if (hit) {
      this.metrics.cache_operations.hits++;
    } else {
      this.metrics.cache_operations.misses++;
    }

    if (error) {
      this.metrics.cache_operations.errors++;
    }
  }

  /**
   * Get comprehensive health status
   */
  async getHealthStatus() {
    const now = Date.now();
    const uptime = process.uptime();

    // External service health
    const [cacheHealth, dbHealth] = await Promise.all([
      this.getServiceHealth('cache', () => cacheService.healthCheck()),
      this.getServiceHealth('database', () => databaseService.healthCheck())
    ]);

    // Calculated metrics
    const memoryUsage = this.getLatestMemoryUsage();
    const cpuUsage = this.getLatestCpuUsage();
    const errorRate = this.getErrorRate();
    const avgResponseTime = this.getAverageResponseTime();
    const requestsPerMinute = this.getRequestsPerMinute();

    // Overall status
    let overallStatus = 'healthy';
    if (cacheHealth.status !== 'healthy' || dbHealth.status !== 'healthy') {
      overallStatus = 'degraded';
    }
    if (
      memoryUsage > this.thresholds.memory_usage_critical ||
      cpuUsage > this.thresholds.cpu_usage_critical ||
      errorRate > this.thresholds.error_rate_critical ||
      avgResponseTime > this.thresholds.response_time_critical
    ) {
      overallStatus = 'unhealthy';
    }

    return {
      status: overallStatus,
      timestamp: now,
      uptime,
      version: process.env.npm_package_version || '1.0.0',
      metrics: {
        memory: {
          usage_percent: (memoryUsage * 100).toFixed(1),
          status:
            memoryUsage > this.thresholds.memory_usage_critical
              ? 'critical'
              : memoryUsage > this.thresholds.memory_usage_warning
              ? 'warning'
              : 'normal'
        },
        cpu: {
          usage_percent: (cpuUsage * 100).toFixed(1),
          status:
            cpuUsage > this.thresholds.cpu_usage_critical
              ? 'critical'
              : cpuUsage > this.thresholds.cpu_usage_warning
              ? 'warning'
              : 'normal'
        },
        requests: {
          total: this.metrics.requests.total,
          errors: this.metrics.requests.errors,
          error_rate: (errorRate * 100).toFixed(2),
          requests_per_minute: requestsPerMinute,
          avg_response_time: avgResponseTime
        },
        database: {
          ...dbHealth,
          total_queries: this.metrics.database_queries.total,
          query_errors: this.metrics.database_queries.errors,
          slow_queries: this.metrics.database_queries.slow_queries
        },
        cache: {
          ...cacheHealth,
          hits: this.metrics.cache_operations.hits,
          misses: this.metrics.cache_operations.misses,
          hit_rate: this.getCacheHitRate()
        }
      },
      alerts: this.alerts.slice(-10),
      thresholds: this.thresholds
    };
  }

  /**
   * Helper methods for calculating metrics
   */
  getLatestMemoryUsage() {
    const latest = this.metrics.memory_usage[this.metrics.memory_usage.length - 1];
    return latest ? latest.percentage : 0;
  }

  getLatestCpuUsage() {
    const latest = this.metrics.cpu_usage[this.metrics.cpu_usage.length - 1];
    return latest ? latest.usage : 0;
  }

  getErrorRate() {
    if (this.metrics.requests.total === 0) return 0;
    return this.metrics.requests.errors / this.metrics.requests.total;
  }

  getAverageResponseTime() {
    if (this.metrics.response_times.length === 0) return 0;
    const sum = this.metrics.response_times.reduce((acc, r) => acc + (Number(r.responseTime) || 0), 0);
    return Math.round(sum / this.metrics.response_times.length);
  }

  getRequestsPerMinute() {
    const oneMinuteAgo = Date.now() - 60_000;
    const recentRequests = this.metrics.response_times.filter(r => r.timestamp > oneMinuteAgo);
    return recentRequests.length;
  }

  getCacheHitRate() {
    const total = this.metrics.cache_operations.hits + this.metrics.cache_operations.misses;
    if (total === 0) return 0;
    return Number(((this.metrics.cache_operations.hits / total) * 100).toFixed(2));
  }

  /**
   * Reset metrics (useful for testing or periodic resets)
   */
  resetMetrics() {
    this.metrics = {
      requests: { total: 0, errors: 0, lastReset: Date.now() },
      response_times: [],
      memory_usage: [],
      cpu_usage: [],
      active_connections: 0,
      database_queries: { total: 0, errors: 0, slow_queries: 0 },
      cache_operations: { hits: 0, misses: 0, errors: 0 }
    };
    this.alerts = [];
    logger.info('Monitoring metrics reset');
  }

  /**
   * Get performance report
   */
  getPerformanceReport(timeRange = 'last_hour') {
    const now = Date.now();
    let startTime;

    switch (timeRange) {
      case 'last_minute':
        startTime = now - 60_000;
        break;
      case 'last_hour':
        startTime = now - 3_600_000;
        break;
      case 'last_day':
        startTime = now - 86_400_000;
        break;
      default:
        startTime = now - 3_600_000;
    }

    const filteredResponses = this.metrics.response_times.filter(r => r.timestamp > startTime);
    const filteredMemory = this.metrics.memory_usage.filter(m => m.timestamp > startTime);
    const filteredCpu = this.metrics.cpu_usage.filter(c => c.timestamp > startTime);

    return {
      timeRange,
      period: {
        start: new Date(startTime).toISOString(),
        end: new Date(now).toISOString()
      },
      requests: {
        total: filteredResponses.length,
        errors: filteredResponses.filter(r => r.error || r.statusCode >= 400).length,
        avg_response_time:
          filteredResponses.length > 0
            ? filteredResponses.reduce((sum, r) => sum + r.responseTime, 0) / filteredResponses.length
            : 0,
        slowest: filteredResponses.length > 0 ? Math.max(...filteredResponses.map(r => r.responseTime)) : 0,
        fastest: filteredResponses.length > 0 ? Math.min(...filteredResponses.map(r => r.responseTime)) : 0
      },
      memory: {
        avg_usage: filteredMemory.length > 0
          ? filteredMemory.reduce((sum, m) => sum + m.percentage, 0) / filteredMemory.length
          : 0,
        peak_usage: filteredMemory.length > 0
          ? Math.max(...filteredMemory.map(m => m.percentage))
          : 0
      },
      cpu: {
        avg_usage: filteredCpu.length > 0
          ? filteredCpu.reduce((sum, c) => sum + c.usage, 0) / filteredCpu.length
          : 0,
        peak_usage: filteredCpu.length > 0
          ? Math.max(...filteredCpu.map(c => c.usage))
          : 0
      }
    };
  }

  // Helper method for safe service health checking
  async getServiceHealth(serviceName, healthCheckFn) {
    try {
      const result = await healthCheckFn();
      logger.debug(`Health check successful for ${serviceName}:`, result);
      return result;
    } catch (error) {
      logger.error(`${serviceName} health check failed:`, {
        error: error.message,
        service: serviceName,
        stack: error.stack
      });
      return {
        status: 'error',
        error: error.message,
        service: serviceName,
        timestamp: new Date().toISOString()
      };
    }
  }
}

export default new MonitoringService();