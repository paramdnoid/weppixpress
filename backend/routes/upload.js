// routes/upload.js
import express from 'express';
import { uploadFile, handleUploadWithPath } from '../controllers/uploadController.js';
import authenticate from '../middleware/authenticate.js';

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
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: File uploaded successfully
 */
router.post('/', authenticate, handleUploadWithPath, uploadFile);

export default router;