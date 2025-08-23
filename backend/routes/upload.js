import { uploadFile, uploadMiddleware } from '../controllers/uploadController.js';
import authenticate from '../middleware/authenticate.js';
import { requestTimeout } from '../middleware/requestContext.js';
import express from 'express';

// routes/upload.js

const router = express.Router();

/**
 * @swagger
 * /api/upload:
 *   post:
 *     summary: Upload a file
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *               "files[]":
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *               path:
 *                 type: string
 *                 description: Target folder path within the user's space (e.g., /projects/demo)
 *     responses:
 *       201:
 *         description: File uploaded successfully
 */
router.post('/', authenticate, requestTimeout(15 * 60 * 1000), uploadMiddleware, uploadFile);

export default router;