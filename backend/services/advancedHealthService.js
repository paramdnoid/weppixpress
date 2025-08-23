import logger from '../utils/logger.js';
import { createRetryHandler } from '../utils/retryHandler.js';
import circuitBreakerRegistry from '../utils/circuitBreaker.js';

/**
 * Advanced health check service with dependency tracking,
 * degradation detection, and recovery monitoring
 */
export class AdvancedHealthService {
  constructor() {
    this.dependencies = new Map();
    this.healthHistory = [];
    this.maxHistorySize = 100;
    this.checkInterval = 30000; // 30 seconds
    this.criticalDependencies = new Set();
    this.isRunning = false;
    this.retryHandler = createRetryHandler('external', { maxAttempts: 2 });
    
    logger.info('Advanced health service initialized');
  }

  /**
   * Register a dependency for health monitoring
   */
  registerDependency(name, healthCheckFn, options = {}) {
    const dependency = {
      name,
      healthCheckFn,
      isCritical: options.critical || false,
      timeout: options.timeout || 5000,
      retryConfig: options.retryConfig || 'external',
      lastCheck: null,
      lastStatus: 'unknown',
      consecutiveFailures: 0,
      totalChecks: 0,
      totalFailures: 0,
      avgResponseTime: 0,
      metadata: options.metadata || {}
    };

    this.dependencies.set(name, dependency);
    
    if (dependency.isCritical) {
      this.criticalDependencies.add(name);
    }

    logger.info(`Registered dependency: ${name}`, {
      critical: dependency.isCritical,
      timeout: dependency.timeout
    });
  }

  /**
   * Start continuous health monitoring
   */
  start() {
    if (this.isRunning) {
      logger.warn('Health monitoring is already running');
      return;
    }

    this.isRunning = true;
    this.monitoringInterval = setInterval(() => {
      this.performHealthChecks().catch(error => {
        logger.error('Error during scheduled health checks:', error);
      });
    }, this.checkInterval);

    logger.info('Health monitoring started', {
      checkInterval: this.checkInterval,
      dependencies: Array.from(this.dependencies.keys())
    });
  }

  /**
   * Stop health monitoring
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    logger.info('Health monitoring stopped');
  }

  /**
   * Perform health checks on all registered dependencies
   */
  async performHealthChecks() {
    const startTime = Date.now();
    const results = {};

    // Check all dependencies concurrently
    const checkPromises = Array.from(this.dependencies.entries()).map(
      ([name, dependency]) => this.checkDependency(name, dependency)
    );

    const dependencyResults = await Promise.allSettled(checkPromises);

    dependencyResults.forEach((result, index) => {
      const [name] = Array.from(this.dependencies.entries())[index];
      
      if (result.status === 'fulfilled') {
        results[name] = result.value;
      } else {
        logger.error(`Health check failed for ${name}:`, result.reason);
        results[name] = {
          status: 'error',
          error: result.reason.message,
          timestamp: Date.now()
        };
      }
    });

    // Calculate overall health status
    const overallHealth = this.calculateOverallHealth(results);
    
    // Record health check history
    this.recordHealthHistory({
      timestamp: Date.now(),
      duration: Date.now() - startTime,
      overall: overallHealth,
      dependencies: results
    });

    return {
      overall: overallHealth,
      dependencies: results,
      timestamp: Date.now()
    };
  }

  /**
   * Check a single dependency
   */
  async checkDependency(name, dependency) {
    const startTime = Date.now();
    
    try {
      // Use circuit breaker for dependency checks
      const result = await circuitBreakerRegistry.execute(
        `health-${name}`,
        () => this.executeHealthCheck(dependency),
        { status: 'circuit_open', message: 'Circuit breaker is open' },
        { 
          failureThreshold: 3,
          recoveryTimeout: 60000,
          serviceName: `health-${name}`
        }
      );

      const responseTime = Date.now() - startTime;
      
      // Update dependency statistics
      dependency.totalChecks++;
      dependency.consecutiveFailures = 0;
      dependency.lastStatus = result.status;
      dependency.lastCheck = Date.now();
      dependency.avgResponseTime = this.updateAverage(
        dependency.avgResponseTime,
        responseTime,
        dependency.totalChecks
      );

      return {
        ...result,
        responseTime,
        consecutiveFailures: dependency.consecutiveFailures,
        timestamp: dependency.lastCheck
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      // Update failure statistics
      dependency.totalChecks++;
      dependency.totalFailures++;
      dependency.consecutiveFailures++;
      dependency.lastStatus = 'unhealthy';
      dependency.lastCheck = Date.now();

      logger.warn(`Dependency health check failed: ${name}`, {
        error: error.message,
        consecutiveFailures: dependency.consecutiveFailures,
        responseTime
      });

      return {
        status: 'unhealthy',
        error: error.message,
        responseTime,
        consecutiveFailures: dependency.consecutiveFailures,
        timestamp: dependency.lastCheck
      };
    }
  }

  /**
   * Execute health check with timeout and retry
   */
  async executeHealthCheck(dependency) {
    return Promise.race([
      this.retryHandler.execute(() => dependency.healthCheckFn(), {
        dependency: dependency.name
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Health check timeout')), dependency.timeout)
      )
    ]);
  }

  /**
   * Calculate overall system health based on dependency statuses
   */
  calculateOverallHealth(dependencyResults) {
    const results = Object.values(dependencyResults);
    const criticalResults = Object.entries(dependencyResults)
      .filter(([name]) => this.criticalDependencies.has(name))
      .map(([, result]) => result);

    // Check critical dependencies first
    const criticalHealthy = criticalResults.every(result => 
      result.status === 'healthy' || result.status === 'degraded'
    );

    if (!criticalHealthy) {
      return {
        status: 'unhealthy',
        message: 'Critical dependencies are failing'
      };
    }

    // Check all dependencies
    const allHealthy = results.every(result => result.status === 'healthy');
    const majorityHealthy = results.filter(result => 
      result.status === 'healthy' || result.status === 'degraded'
    ).length > results.length / 2;

    if (allHealthy) {
      return {
        status: 'healthy',
        message: 'All systems operational'
      };
    }

    if (majorityHealthy) {
      return {
        status: 'degraded',
        message: 'Some non-critical systems experiencing issues'
      };
    }

    return {
      status: 'unhealthy',
      message: 'Multiple systems failing'
    };
  }

  /**
   * Get comprehensive health report
   */
  async getHealthReport() {
    const currentHealth = await this.performHealthChecks();
    const trends = this.getHealthTrends();
    const circuitBreakerStatus = circuitBreakerRegistry.getHealthStatus();

    return {
      ...currentHealth,
      trends,
      circuitBreakers: circuitBreakerStatus,
      statistics: this.getDependencyStatistics()
    };
  }

  /**
   * Get dependency statistics
   */
  getDependencyStatistics() {
    const stats = {};

    for (const [name, dependency] of this.dependencies) {
      const successRate = dependency.totalChecks > 0 
        ? ((dependency.totalChecks - dependency.totalFailures) / dependency.totalChecks) * 100 
        : 0;

      stats[name] = {
        totalChecks: dependency.totalChecks,
        totalFailures: dependency.totalFailures,
        successRate: Math.round(successRate * 100) / 100,
        avgResponseTime: Math.round(dependency.avgResponseTime),
        consecutiveFailures: dependency.consecutiveFailures,
        lastStatus: dependency.lastStatus,
        isCritical: dependency.isCritical
      };
    }

    return stats;
  }

  /**
   * Get health trends from history
   */
  getHealthTrends() {
    if (this.healthHistory.length === 0) {
      return { message: 'No historical data available' };
    }

    const recentHistory = this.healthHistory.slice(-20); // Last 20 checks
    const healthyCount = recentHistory.filter(h => h.overall.status === 'healthy').length;
    const degradedCount = recentHistory.filter(h => h.overall.status === 'degraded').length;
    const unhealthyCount = recentHistory.filter(h => h.overall.status === 'unhealthy').length;

    const avgDuration = recentHistory.reduce((sum, h) => sum + h.duration, 0) / recentHistory.length;

    return {
      recentChecks: recentHistory.length,
      healthyPercentage: Math.round((healthyCount / recentHistory.length) * 100),
      degradedPercentage: Math.round((degradedCount / recentHistory.length) * 100),
      unhealthyPercentage: Math.round((unhealthyCount / recentHistory.length) * 100),
      avgCheckDuration: Math.round(avgDuration),
      trend: this.calculateTrend(recentHistory)
    };
  }

  /**
   * Calculate health trend direction
   */
  calculateTrend(history) {
    if (history.length < 5) {
      return 'insufficient_data';
    }

    const recent = history.slice(-5);
    const older = history.slice(-10, -5);

    const recentHealthy = recent.filter(h => h.overall.status === 'healthy').length;
    const olderHealthy = older.length > 0 ? older.filter(h => h.overall.status === 'healthy').length : 0;

    if (recentHealthy > olderHealthy) {
      return 'improving';
    } else if (recentHealthy < olderHealthy) {
      return 'degrading';
    } else {
      return 'stable';
    }
  }

  /**
   * Record health check in history
   */
  recordHealthHistory(healthCheck) {
    this.healthHistory.push(healthCheck);

    // Maintain history size limit
    if (this.healthHistory.length > this.maxHistorySize) {
      this.healthHistory.shift();
    }
  }

  /**
   * Update running average
   */
  updateAverage(currentAvg, newValue, count) {
    return ((currentAvg * (count - 1)) + newValue) / count;
  }

  /**
   * Get quick health status
   */
  async getQuickStatus() {
    const critical = [];
    const warnings = [];

    for (const [name, dependency] of this.dependencies) {
      if (dependency.isCritical && dependency.lastStatus !== 'healthy') {
        critical.push({
          name,
          status: dependency.lastStatus,
          consecutiveFailures: dependency.consecutiveFailures
        });
      } else if (dependency.consecutiveFailures > 2) {
        warnings.push({
          name,
          consecutiveFailures: dependency.consecutiveFailures
        });
      }
    }

    return {
      status: critical.length > 0 ? 'critical' : warnings.length > 0 ? 'warning' : 'healthy',
      criticalIssues: critical,
      warnings,
      timestamp: Date.now()
    };
  }
}

export default new AdvancedHealthService();