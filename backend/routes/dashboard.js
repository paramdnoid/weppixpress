import { authenticateToken, requireAdmin } from '../middleware/authenticate.js';
import errorMetricsService from '../services/errorMetricsService.js';
import monitoringService from '../services/monitoringService.js';
import express from 'express';

const router = express.Router();

/**
 * @swagger
 * /api/dashboard/overview:
 *   get:
 *     summary: Get dashboard overview data
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard overview data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 system:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                     uptime:
 *                       type: number
 *                     memory:
 *                       type: object
 *                     cpu:
 *                       type: object
 *                 errors:
 *                   type: object
 *                 requests:
 *                   type: object
 */
router.get('/overview', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [healthStatus, errorMetrics, performanceReport] = await Promise.all([
      monitoringService.getHealthStatus(),
      errorMetricsService.getMetrics(3600000), // Last hour
      monitoringService.getPerformanceReport('last_hour')
    ]);

    const overview = {
      timestamp: Date.now(),
      system: {
        status: healthStatus.status,
        uptime: healthStatus.uptime,
        memory: healthStatus.metrics.memory,
        cpu: healthStatus.metrics.cpu,
        version: healthStatus.version
      },
      errors: {
        total: errorMetrics.summary.totalErrors,
        critical: errorMetrics.summary.criticalErrors,
        operational: errorMetrics.summary.operationalErrors,
        trends: errorMetrics.trends,
        topErrors: errorMetrics.topErrors.slice(0, 5)
      },
      requests: {
        total: healthStatus.metrics.requests.total,
        errors: healthStatus.metrics.requests.errors,
        error_rate: parseFloat(healthStatus.metrics.requests.error_rate),
        avg_response_time: healthStatus.metrics.requests.avg_response_time,
        requests_per_minute: healthStatus.metrics.requests.requests_per_minute
      },
      performance: {
        avg_response_time: performanceReport.requests.avg_response_time,
        slowest_request: performanceReport.requests.slowest,
        fastest_request: performanceReport.requests.fastest,
        memory_peak: (performanceReport.memory.peak_usage * 100).toFixed(1),
        cpu_peak: (performanceReport.cpu.peak_usage * 100).toFixed(1)
      },
      alerts: healthStatus.alerts,
      database: healthStatus.metrics.database,
      cache: healthStatus.metrics.cache
    };

    res.json(overview);
  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({ error: 'Failed to get dashboard overview' });
  }
});

/**
 * @swagger
 * /api/dashboard/errors:
 *   get:
 *     summary: Get detailed error metrics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeRange
 *         schema:
 *           type: string
 *           enum: [last_minute, last_hour, last_day]
 *         description: Time range for error metrics
 *     responses:
 *       200:
 *         description: Detailed error metrics
 */
router.get('/errors', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const timeRange = req.query.timeRange || 'last_hour';
    const timeWindows = {
      last_minute: 60000,
      last_hour: 3600000,
      last_day: 86400000
    };

    const timeWindow = timeWindows[timeRange] || timeWindows.last_hour;
    const errorMetrics = errorMetricsService.getMetrics(timeWindow);

    res.json({
      timeRange,
      ...errorMetrics,
      healthStatus: errorMetricsService.getHealthStatus()
    });
  } catch (error) {
    console.error('Dashboard errors error:', error);
    res.status(500).json({ error: 'Failed to get error metrics' });
  }
});

/**
 * @swagger
 * /api/dashboard/performance:
 *   get:
 *     summary: Get performance metrics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeRange
 *         schema:
 *           type: string
 *           enum: [last_minute, last_hour, last_day]
 *         description: Time range for performance metrics
 *     responses:
 *       200:
 *         description: Performance metrics
 */
router.get('/performance', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const timeRange = req.query.timeRange || 'last_hour';
    const performanceReport = monitoringService.getPerformanceReport(timeRange);

    // Get current system metrics
    const healthStatus = await monitoringService.getHealthStatus();
    
    res.json({
      ...performanceReport,
      current: {
        memory: healthStatus.metrics.memory,
        cpu: healthStatus.metrics.cpu,
        requests: healthStatus.metrics.requests
      }
    });
  } catch (error) {
    console.error('Dashboard performance error:', error);
    res.status(500).json({ error: 'Failed to get performance metrics' });
  }
});

/**
 * @swagger
 * /api/dashboard/system:
 *   get:
 *     summary: Get system health status
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System health status
 */
router.get('/system', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const healthStatus = await monitoringService.getHealthStatus();
    res.json(healthStatus);
  } catch (error) {
    console.error('Dashboard system error:', error);
    res.status(500).json({ error: 'Failed to get system health' });
  }
});

/**
 * @swagger
 * /api/dashboard/alerts:
 *   get:
 *     summary: Get system alerts
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System alerts
 */
router.get('/alerts', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const healthStatus = await monitoringService.getHealthStatus();
    res.json({
      alerts: healthStatus.alerts,
      thresholds: healthStatus.thresholds,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Dashboard alerts error:', error);
    res.status(500).json({ error: 'Failed to get alerts' });
  }
});

export default router;