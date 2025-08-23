import pool from '../services/dbConnection.js';
import { createClient } from 'redis';

export async function healthCheck(_req, res) {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {}
  };

  try {
    await pool.query('SELECT 1');
    health.services.database = 'healthy';
  } catch (dbError) {
    console.warn('Database health check failed:', dbError.message);
    health.services.database = 'unhealthy';
    health.status = 'degraded';
  }

  try {
    const redis = createClient({ 
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        connectTimeout: 5000
      }
    });
    await redis.connect();
    await redis.ping();
    await redis.disconnect();
    health.services.redis = 'healthy';
  } catch (redisError) {
    console.warn('Redis health check failed:', redisError.message);
    health.services.redis = 'unhealthy';
    health.status = 'degraded';
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
}

export async function readinessCheck(_req, res) {
  res.json({
    status: 'ready',
    timestamp: new Date().toISOString()
  });
}

export async function livenessCheck(_req, res) {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString()
  });
}