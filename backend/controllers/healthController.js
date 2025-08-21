// controllers/healthController.js
import pool from '../db.js';
import { createClient } from 'redis';

export async function healthCheck(_req, res) {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {}
  };

  try {
    // Check database
    await pool.query('SELECT 1');
    health.services.database = 'healthy';
  } catch {
    health.services.database = 'unhealthy';
    health.status = 'degraded';
  }

  try {
    // Check Redis
    const redis = createClient();
    await redis.connect();
    await redis.ping();
    await redis.disconnect();
    health.services.redis = 'healthy';
  } catch {
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