import winston from 'winston';
import 'winston-daily-rotate-file';
import { redisClient } from '../middleware/security.js';

export class AuditService {
  constructor() {
    this.logger = this.createLogger();
    this.eventBuffer = [];
    this.bufferSize = 100;
    this.flushInterval = 5000; // 5 seconds
    
    // Start buffer flush interval
    setInterval(() => this.flushBuffer(), this.flushInterval);
  }

  createLogger() {
    const logFormat = winston.format.combine(
      winston.format.timestamp(),
      winston.format.json(),
      winston.format.printf(info => JSON.stringify({
        timestamp: info.timestamp,
        level: info.level,
        ...info.message
      }))
    );

    return winston.createLogger({
      format: logFormat,
      transports: [
        // Audit log file
        new winston.transports.DailyRotateFile({
          filename: 'logs/audit-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '100m',
          maxFiles: '30d',
          level: 'info'
        }),
        // Security events
        new winston.transports.DailyRotateFile({
          filename: 'logs/security-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '50m',
          maxFiles: '90d',
          level: 'warn',
          filter: (info) => ['auth_failed', 'unauthorized_access', 'suspicious_activity'].includes(info.message.event)
        }),
        // Console for development
        ...(process.env.NODE_ENV !== 'production' ? [
          new winston.transports.Console({
            format: winston.format.combine(
              winston.format.colorize(),
              winston.format.simple()
            )
          })
        ] : [])
      ]
    });
  }

  // Log audit event
  async logEvent(event, data = {}) {
    const auditEntry = {
      event,
      timestamp: new Date().toISOString(),
      ...data,
      environment: process.env.NODE_ENV,
      serverInstance: process.env.INSTANCE_ID || 'default'
    };

    // Add to buffer
    this.eventBuffer.push(auditEntry);

    // Flush if buffer is full
    if (this.eventBuffer.length >= this.bufferSize) {
      await this.flushBuffer();
    }

    // Log immediately for critical events
    if (this.isCriticalEvent(event)) {
      this.logger.warn({ message: auditEntry });
      
      // Also store in Redis for real-time monitoring
      await this.storeInRedis(auditEntry);
    }
  }

  // Flush event buffer
  async flushBuffer() {
    if (this.eventBuffer.length === 0) return;

    const events = [...this.eventBuffer];
    this.eventBuffer = [];

    // Batch write to log
    events.forEach(event => {
      this.logger.info({ message: event });
    });

    // Store aggregated metrics in Redis
    await this.updateMetrics(events);
  }

  // Store critical events in Redis for real-time monitoring
  async storeInRedis(event) {
    try {
      const key = `audit:critical:${event.event}`;
      const score = Date.now();
      
      await redisClient.zAdd(key, {
        score,
        value: JSON.stringify(event)
      });

      // Keep only last 1000 events
      await redisClient.zRemRangeByRank(key, 0, -1001);
    } catch (error) {
      logger.error('Failed to store critical event in Redis:', {
        error: error.message,
        event: event.event,
        eventId: event.id
      });
      // Don't throw - audit storage failures shouldn't break the main flow
    }
  }

  // Update metrics
  async updateMetrics(events) {
    try {
      const metrics = {};
      
      events.forEach(event => {
        const key = `metrics:${event.event}`;
        metrics[key] = (metrics[key] || 0) + 1;
      });

      // Update counters in Redis
      for (const [key, count] of Object.entries(metrics)) {
        await redisClient.incrBy(key, count);
      }
    } catch (error) {
      logger.error('Failed to update metrics in Redis:', {
        error: error.message,
        eventCount: events.length
      });
      // Don't throw - metrics failures shouldn't break the main flow
    }
  }

  // Check if event is critical
  isCriticalEvent(event) {
    const criticalEvents = [
      'auth_failed',
      'unauthorized_access',
      'suspicious_activity',
      'data_breach_attempt',
      'admin_action',
      'system_error',
      'security_alert'
    ];
    
    return criticalEvents.includes(event);
  }

  // Query audit logs
  async queryLogs(filters = {}) {
    try {
      // This would typically query from a database or log aggregation service
      // For now, return recent critical events from Redis
      const { event, startDate, endDate, userId, limit = 100 } = filters;
      
      const key = event ? `audit:critical:${event}` : 'audit:critical:*';
      const keys = await redisClient.keys(key);
      
      let allEvents = [];
      
      for (const k of keys) {
        try {
          const events = await redisClient.zRevRange(k, 0, limit - 1);
          const parsed = events.map(e => JSON.parse(e));
          allEvents.push(...parsed);
        } catch (parseError) {
          logger.warn(`Failed to parse events from key ${k}:`, parseError.message);
          // Continue processing other keys
        }
      }
      
      // Filter by date range
      if (startDate || endDate) {
        allEvents = allEvents.filter(e => {
          const eventDate = new Date(e.timestamp);
          if (startDate && eventDate < new Date(startDate)) return false;
          if (endDate && eventDate > new Date(endDate)) return false;
          return true;
        });
      }
      
      // Filter by userId
      if (userId) {
        allEvents = allEvents.filter(e => e.userId === userId);
      }
      
      // Sort by timestamp
      allEvents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      return allEvents.slice(0, limit);
    } catch (error) {
      logger.error('Failed to query audit logs:', {
        error: error.message,
        filters
      });
      return []; // Return empty array instead of throwing
    }
  }

  // Get metrics
  async getMetrics(_period = '1h') {
    try {
      const metrics = {};
      const keys = await redisClient.keys('metrics:*');
      
      for (const key of keys) {
        try {
          const value = await redisClient.get(key);
          const eventName = key.replace('metrics:', '');
          metrics[eventName] = parseInt(value || 0);
        } catch (keyError) {
          logger.warn(`Failed to get metric for key ${key}:`, keyError.message);
          // Continue processing other keys
        }
      }
      
      return metrics;
    } catch (error) {
      logger.error('Failed to get audit metrics:', error.message);
      return {}; // Return empty object instead of throwing
    }
  }
}