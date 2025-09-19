import { WebSocketManager } from '../websockets/websocketService.js';
import monitoringService from './monitoringService.js';
import errorMetricsService from './errorMetricsService.js';
import { getAllUsers } from '../models/userModel.js';
import logger from '../utils/logger.js';

class AdminWebSocketService {
  private wsManager: WebSocketManager | null = null;
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private isInitialized = false;

  initialize(wsManager: WebSocketManager) {
    this.wsManager = wsManager;
    this.isInitialized = true;
    this.setupAdminDataStreams();
    logger.info('Admin WebSocket service initialized');
  }

  private setupAdminDataStreams() {
    if (!this.wsManager) return;

    // Dashboard overview - every 30 seconds
    this.intervals.set('dashboard-overview', setInterval(async () => {
      await this.broadcastDashboardOverview();
    }, 30000));

    // System metrics - every 10 seconds
    this.intervals.set('system-metrics', setInterval(async () => {
      await this.broadcastSystemMetrics();
    }, 10000));

    // Error metrics - every 60 seconds
    this.intervals.set('error-metrics', setInterval(async () => {
      await this.broadcastErrorMetrics();
    }, 60000));

    // User statistics - every 2 minutes
    this.intervals.set('user-stats', setInterval(async () => {
      await this.broadcastUserStatistics();
    }, 120000));

    logger.info('Admin data streams configured');
  }

  async broadcastDashboardOverview() {
    if (!this.wsManager) return;

    try {
      const [healthStatus, errorMetrics, users] = await Promise.all([
        monitoringService.getHealthStatus(),
        errorMetricsService.getMetrics(3600000), // Last hour
        getAllUsers()
      ]);

      const userStats = {
        total: users.length,
        admins: users.filter((u: any) => u.role === 'admin').length,
        verified: users.filter((u: any) => u.is_verified).length,
        suspended: users.filter((u: any) => u.is_suspended).length,
        recentRegistrations: users.filter((u: any) => {
          const createdAt = new Date(u.created_at);
          const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          return createdAt > dayAgo;
        }).length
      };

      const overview = {
        timestamp: Date.now(),
        system: {
          status: healthStatus.status,
          uptime: healthStatus.uptime,
          memory: healthStatus.metrics.memory,
          cpu: healthStatus.metrics.cpu,
          version: healthStatus.version
        },
        users: userStats,
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
        alerts: healthStatus.alerts,
        database: healthStatus.metrics.database,
        cache: healthStatus.metrics.cache
      };

      this.wsManager.broadcastToPath('/admin/dashboard', {
        type: 'dashboard_overview',
        data: overview
      });

      logger.debug('Dashboard overview broadcasted to admin clients');
    } catch (error) {
      logger.error('Error broadcasting dashboard overview:', error);
    }
  }

  async broadcastSystemMetrics() {
    if (!this.wsManager) return;

    try {
      const healthStatus = await monitoringService.getHealthStatus();

      const systemMetrics = {
        timestamp: Date.now(),
        status: healthStatus.status,
        uptime: healthStatus.uptime,
        memory: healthStatus.metrics.memory,
        cpu: healthStatus.metrics.cpu,
        requests: healthStatus.metrics.requests,
        database: healthStatus.metrics.database,
        cache: healthStatus.metrics.cache
      };

      this.wsManager.broadcastToPath('/admin/system', {
        type: 'system_metrics',
        data: systemMetrics
      });

      logger.debug('System metrics broadcasted to admin clients');
    } catch (error) {
      logger.error('Error broadcasting system metrics:', error);
    }
  }

  async broadcastErrorMetrics() {
    if (!this.wsManager) return;

    try {
      const errorMetrics = errorMetricsService.getMetrics(3600000); // Last hour

      const errorData = {
        timestamp: Date.now(),
        summary: errorMetrics.summary,
        breakdown: errorMetrics.breakdown,
        topErrors: errorMetrics.topErrors,
        trends: errorMetrics.trends,
        healthStatus: errorMetricsService.getHealthStatus()
      };

      this.wsManager.broadcastToPath('/admin/errors', {
        type: 'error_metrics',
        data: errorData
      });

      logger.debug('Error metrics broadcasted to admin clients');
    } catch (error) {
      logger.error('Error broadcasting error metrics:', error);
    }
  }

  async broadcastUserStatistics() {
    if (!this.wsManager) return;

    try {
      const users = await getAllUsers();

      const userStats = {
        timestamp: Date.now(),
        total: users.length,
        admins: users.filter((u: any) => u.role === 'admin').length,
        verified: users.filter((u: any) => u.is_verified).length,
        suspended: users.filter((u: any) => u.is_suspended).length,
        recentRegistrations: {
          today: users.filter((u: any) => {
            const createdAt = new Date(u.created_at);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return createdAt >= today;
          }).length,
          thisWeek: users.filter((u: any) => {
            const createdAt = new Date(u.created_at);
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            return createdAt > weekAgo;
          }).length,
          thisMonth: users.filter((u: any) => {
            const createdAt = new Date(u.created_at);
            const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            return createdAt > monthAgo;
          }).length
        },
        recentActivity: {
          activeToday: users.filter((u: any) => {
            if (!u.last_login_at) return false;
            const lastLogin = new Date(u.last_login_at);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return lastLogin >= today;
          }).length,
          activeThisWeek: users.filter((u: any) => {
            if (!u.last_login_at) return false;
            const lastLogin = new Date(u.last_login_at);
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            return lastLogin > weekAgo;
          }).length
        }
      };

      this.wsManager.broadcastToPath('/admin/users', {
        type: 'user_statistics',
        data: userStats
      });

      logger.debug('User statistics broadcasted to admin clients');
    } catch (error) {
      logger.error('Error broadcasting user statistics:', error);
    }
  }

  // Broadcast user action events
  broadcastUserAction(action: string, data: any) {
    if (!this.wsManager) return;

    const actionData = {
      action,
      ...data,
      timestamp: Date.now()
    };

    // Broadcast to users channel
    this.wsManager.broadcastToPath('/admin/users', {
      type: 'user_action',
      data: actionData
    });

    // Also broadcast to dashboard for notifications
    this.wsManager.broadcastToPath('/admin/dashboard', {
      type: 'user_action',
      data: actionData
    });

    logger.info(`User action broadcasted: ${action}`, data);
  }

  // Broadcast system alerts
  broadcastSystemAlert(alert: any) {
    if (!this.wsManager) return;

    this.wsManager.broadcastToPath('/admin/alerts', {
      type: 'system_alert',
      data: {
        ...alert,
        timestamp: Date.now()
      }
    });

    // Also broadcast to dashboard for notifications
    this.wsManager.broadcastToPath('/admin/dashboard', {
      type: 'system_alert',
      data: {
        ...alert,
        timestamp: Date.now()
      }
    });

    logger.warn('System alert broadcasted', alert);
  }

  // Broadcast general admin notifications
  broadcastAdminNotification(notification: {
    type: 'info' | 'warning' | 'error' | 'success'
    title: string
    message: string
    data?: any
  }) {
    if (!this.wsManager) return;

    this.wsManager.broadcastToPath('/admin/dashboard', {
      type: 'admin_notification',
      data: {
        ...notification,
        id: Date.now(),
        timestamp: Date.now()
      }
    });

    logger.info('Admin notification broadcasted', notification);
  }

  // Force refresh specific data
  async forceRefresh(dataType: string) {
    switch (dataType) {
      case 'dashboard':
        await this.broadcastDashboardOverview();
        break;
      case 'system':
        await this.broadcastSystemMetrics();
        break;
      case 'errors':
        await this.broadcastErrorMetrics();
        break;
      case 'users':
        await this.broadcastUserStatistics();
        break;
      default:
        logger.warn(`Unknown data type for force refresh: ${dataType}`);
    }
  }

  // Get service status
  getStatus() {
    return {
      initialized: this.isInitialized,
      activeIntervals: Array.from(this.intervals.keys()),
      connectedClients: this.wsManager?.getStats().connectedClients || 0
    };
  }

  // Cleanup
  shutdown() {
    // Clear all intervals
    this.intervals.forEach((interval, key) => {
      clearInterval(interval);
      logger.debug(`Cleared admin data stream: ${key}`);
    });
    this.intervals.clear();

    this.isInitialized = false;
    logger.info('Admin WebSocket service shutdown complete');
  }
}

// Create singleton instance
const adminWebSocketService = new AdminWebSocketService();

export default adminWebSocketService;