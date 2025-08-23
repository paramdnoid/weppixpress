import os from 'os';
import process from 'process';
import logger from '../utils/logger.js';
import cacheService from './cacheService.js';
import databaseService from './databaseService.js';

/**
 * System monitoring and health check service
 */
export class MonitoringService {
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
      memory_usage_critical: 0.9,
      memory_usage_warning: 0.7,
      cpu_usage_critical: 0.9,
      cpu_usage_warning: 0.7,
      response_time_critical: 5000,
      response_time_warning: 1000,
      error_rate_critical: 0.1,
      error_rate_warning: 0.05
    };
    
    this.alerts = [];
    this.isMonitoring = false;
    this.monitoringInterval = null;
    
    // Start monitoring
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
    }, 30000);
    
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
      const cpuUsage = os.loadavg()[0] / os.cpus().length;
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
      
      // Log metrics periodically
      if (Date.now() % 300000 < 30000) { // Every 5 minutes
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
    const now = Date.now();
    
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
  addAlert(type, message, level) {
    const now = Date.now();
    const lastAlert = this.alerts.find(a => a.type === type && a.level === level);
    
    // Don't spam alerts - only add if last alert of same type was more than 5 minutes ago
    if (!lastAlert || (now - lastAlert.timestamp) > 300000) {
      const alert = {
        type,
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
      
      // Here you could integrate with external alerting systems
      // this.sendToExternalAlerting(alert);
    }
  }

  /**
   * Record request metrics
   */
  recordRequest(method, path, statusCode, responseTime, error = null) {
    this.metrics.requests.total++;
    
    if (error || statusCode >= 400) {
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
   * Record database operation
   */
  recordDatabaseOperation(operation, duration, error = null) {
    this.metrics.database_queries.total++;
    
    if (error) {
      this.metrics.database_queries.errors++;
    }
    
    if (duration > 1000) { // Slow query threshold: 1 second
      this.metrics.database_queries.slow_queries++;
      logger.warn('Slow database query detected', {
        operation: operation.substring(0, 100),
        duration
      });
    }
  }

  /**
   * Record cache operation
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
    
    // Get external service health
    const [cacheHealth, dbHealth] = await Promise.all([
      cacheService.healthCheck().catch(err => ({ status: 'error', error: err.message })),
      databaseService.healthCheck().catch(err => ({ status: 'error', error: err.message }))
    ]);
    
    // Calculate metrics
    const memoryUsage = this.getLatestMemoryUsage();
    const cpuUsage = this.getLatestCpuUsage();
    const errorRate = this.getErrorRate();
    const avgResponseTime = this.getAverageResponseTime();
    const requestsPerMinute = this.getRequestsPerMinute();
    
    // Determine overall health status
    let overallStatus = 'healthy';
    
    if (cacheHealth.status !== 'healthy' || dbHealth.status !== 'healthy') {
      overallStatus = 'degraded';
    }
    
    if (memoryUsage > this.thresholds.memory_usage_critical ||
        cpuUsage > this.thresholds.cpu_usage_critical ||
        errorRate > this.thresholds.error_rate_critical ||
        avgResponseTime > this.thresholds.response_time_critical) {
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
          status: memoryUsage > this.thresholds.memory_usage_critical ? 'critical' :
                  memoryUsage > this.thresholds.memory_usage_warning ? 'warning' : 'normal'
        },
        cpu: {
          usage_percent: (cpuUsage * 100).toFixed(1),
          status: cpuUsage > this.thresholds.cpu_usage_critical ? 'critical' :
                  cpuUsage > this.thresholds.cpu_usage_warning ? 'warning' : 'normal'
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
      alerts: this.alerts.slice(-10), // Last 10 alerts
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
    const recent = this.metrics.response_times.slice(-100); // Last 100 requests
    return recent.reduce((sum, r) => sum + r.responseTime, 0) / recent.length;
  }

  getRequestsPerMinute() {
    const oneMinuteAgo = Date.now() - 60000;
    const recentRequests = this.metrics.response_times.filter(r => r.timestamp > oneMinuteAgo);
    return recentRequests.length;
  }

  getCacheHitRate() {
    const total = this.metrics.cache_operations.hits + this.metrics.cache_operations.misses;
    if (total === 0) return 0;
    return ((this.metrics.cache_operations.hits / total) * 100).toFixed(2);
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
        startTime = now - 60000;
        break;
      case 'last_hour':
        startTime = now - 3600000;
        break;
      case 'last_day':
        startTime = now - 86400000;
        break;
      default:
        startTime = now - 3600000;
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
        avg_response_time: filteredResponses.length > 0 
          ? filteredResponses.reduce((sum, r) => sum + r.responseTime, 0) / filteredResponses.length 
          : 0,
        slowest: filteredResponses.length > 0 
          ? Math.max(...filteredResponses.map(r => r.responseTime)) 
          : 0,
        fastest: filteredResponses.length > 0 
          ? Math.min(...filteredResponses.map(r => r.responseTime)) 
          : 0
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
}

export default new MonitoringService();