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
    const key = `audit:critical:${event.event}`;
    const score = Date.now();
    
    await redisClient.zAdd(key, {
      score,
      value: JSON.stringify(event)
    });

    // Keep only last 1000 events
    await redisClient.zRemRangeByRank(key, 0, -1001);
  }

  // Update metrics
  async updateMetrics(events) {
    const metrics = {};
    
    events.forEach(event => {
      const key = `metrics:${event.event}`;
      metrics[key] = (metrics[key] || 0) + 1;
    });

    // Update counters in Redis
    for (const [key, count] of Object.entries(metrics)) {
      await redisClient.incrBy(key, count);
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
    // This would typically query from a database or log aggregation service
    // For now, return recent critical events from Redis
    const { event, startDate, endDate, userId, limit = 100 } = filters;
    
    const key = event ? `audit:critical:${event}` : 'audit:critical:*';
    const keys = await redisClient.keys(key);
    
    let allEvents = [];
    
    for (const k of keys) {
      const events = await redisClient.zRevRange(k, 0, limit - 1);
      const parsed = events.map(e => JSON.parse(e));
      allEvents.push(...parsed);
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
  }

  // Get metrics
  async getMetrics(_period = '1h') {
    const metrics = {};
    const keys = await redisClient.keys('metrics:*');
    
    for (const key of keys) {
      const value = await redisClient.get(key);
      const eventName = key.replace('metrics:', '');
      metrics[eventName] = parseInt(value || 0);
    }
    
    return metrics;
  }
}