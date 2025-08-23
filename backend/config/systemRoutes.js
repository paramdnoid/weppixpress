import cacheService from '../services/cacheService.js';
import databaseService from '../services/databaseService.js';
import monitoringService from '../services/monitoringService.js';
import errorMetricsService from '../services/errorMetricsService.js';
import circuitBreakerRegistry from '../utils/circuitBreaker.js';

export function setupSystemRoutes(app, wsManager) {
  // WebSocket stats endpoint
  app.get('/api/ws/stats', (_req, res) => {
    res.json(wsManager.getStats());
  });

  // Cache health endpoint
  app.get('/api/cache/health', async (_req, res) => {
    const health = await cacheService.healthCheck();
    res.json(health);
  });

  // Database health endpoint
  app.get('/api/database/health', async (_req, res) => {
    const health = await databaseService.healthCheck();
    res.json(health);
  });

  // System health endpoint
  app.get('/api/system/health', async (_req, res) => {
    const health = await monitoringService.getHealthStatus();
    res.json(health);
  });

  // System metrics endpoint
  app.get('/api/system/metrics', async (req, res) => {
    const timeRange = req.query.range || 'last_hour';
    const report = monitoringService.getPerformanceReport(timeRange);
    res.json(report);
  });

  // System errors endpoint
  app.get('/api/system/errors', async (req, res) => {
    const timeWindow = parseInt(req.query.timeWindow) || 3600000; // Default 1 hour
    const metrics = errorMetricsService.getMetrics(timeWindow);
    res.json(metrics);
  });

  // Circuit breakers status endpoint
  app.get('/api/system/circuit-breakers', async (_req, res) => {
    const metrics = circuitBreakerRegistry.getAllMetrics();
    const healthStatus = circuitBreakerRegistry.getHealthStatus();
    res.json({
      metrics,
      healthStatus
    });
  });

  // Circuit breakers reset endpoint
  app.post('/api/system/circuit-breakers/reset', async (req, res) => {
    const { serviceName } = req.body;
    
    if (serviceName) {
      const breaker = circuitBreakerRegistry.getBreaker(serviceName);
      breaker.reset();
      res.json({ message: `Circuit breaker for ${serviceName} reset` });
    } else {
      circuitBreakerRegistry.resetAll();
      res.json({ message: 'All circuit breakers reset' });
    }
  });
}