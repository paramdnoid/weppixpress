// routes/health.js
import express from 'express';
import { healthCheck, readinessCheck, livenessCheck } from '../controllers/healthController.js';

const router = express.Router();

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 */
router.get('/', healthCheck);

/**
 * @swagger
 * /api/health/ready:
 *   get:
 *     summary: Readiness check
 *     tags: [Health]
 */
router.get('/ready', readinessCheck);

/**
 * @swagger
 * /api/health/live:
 *   get:
 *     summary: Liveness check
 *     tags: [Health]
 */
router.get('/live', livenessCheck);

export default router;