import express from 'express';
import authenticate from '../middleware/authenticate.js';
import { requestTimeout } from '../middleware/requestContext.js';
import uploadController, {
  uploadFile,
  uploadMiddleware,
  initializeUpload,
  uploadChunk,
  getUploadStatus,
  pauseUpload,
  resumeUpload,
  cancelUpload,
  listActiveUploads,
  cancelAllForUser,
  initUploadMiddleware,
  chunkUploadMiddleware
} from '../controllers/uploadController.js';
import uploadCleanupService from '../services/uploadCleanupService.js';

const router = express.Router();

/**
 * @swagger
 * /api/upload:
 *   post:
 *     summary: Upload files (normal upload for smaller files)
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

// ===== CHUNKED UPLOAD ROUTES =====

/**
 * @swagger
 * /api/upload/chunked/init:
 *   post:
 *     summary: Initialize chunked upload session (for large files)
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 */
router.post('/chunked/init', 
  authenticate, 
  requestTimeout(30 * 1000),
  initUploadMiddleware,
  initializeUpload
);

/**
 * @swagger
 * /api/upload/chunked/chunk/{uploadId}:
 *   post:
 *     summary: Upload a file chunk
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 */
router.post('/chunked/chunk/:uploadId',
  authenticate,
  requestTimeout(5 * 60 * 1000),
  chunkUploadMiddleware,
  uploadChunk
);

/**
 * @swagger
 * /api/upload/chunked/status/{uploadId}:
 *   get:
 *     summary: Get upload progress status
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 */
router.get('/chunked/status/:uploadId',
  authenticate,
  requestTimeout(10 * 1000),
  getUploadStatus
);

/**
 * @swagger
 * /api/upload/chunked/pause/{uploadId}:
 *   post:
 *     summary: Pause chunked upload
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 */
router.post('/chunked/pause/:uploadId',
  authenticate,
  requestTimeout(10 * 1000),
  pauseUpload
);

/**
 * @swagger
 * /api/upload/chunked/resume/{uploadId}:
 *   post:
 *     summary: Resume chunked upload
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 */
router.post('/chunked/resume/:uploadId',
  authenticate,
  requestTimeout(10 * 1000),
  resumeUpload
);

/**
 * @swagger
 * /api/upload/chunked/cancel/{uploadId}:
 *   delete:
 *     summary: Cancel chunked upload
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/chunked/cancel/:uploadId',
  authenticate,
  requestTimeout(30 * 1000),
  cancelUpload
);

/**
 * @swagger
 * /api/upload/chunked/active:
 *   get:
 *     summary: List active chunked uploads
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 */
router.get('/chunked/active',
  authenticate,
  requestTimeout(30 * 1000),
  listActiveUploads
);

/**
 * @swagger
 * /api/upload/chunked/active:
 *   delete:
 *     summary: Cancel all active uploads for current user
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/chunked/active',
  authenticate,
  requestTimeout(60 * 1000),
  cancelAllForUser
);

/**
 * @swagger
 * /api/upload/chunked/cleanup:
 *   post:
 *     summary: Trigger manual cleanup of expired upload sessions
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 */
router.post('/chunked/cleanup',
  authenticate,
  requestTimeout(60 * 1000),
  async (req, res, next) => {
    try {
      const cleaned = await uploadCleanupService.manualCleanup();
      res.json({ success: true, data: { cleaned } });
    } catch (error) {
      next(error);
    }
  }
);

// Debug endpoint to check session by ID (only in development)
if (process.env.NODE_ENV !== 'production') {
  /**
   * @swagger
   * /api/upload/chunked/debug/{uploadId}:
   *   get:
   *     summary: Debug upload session (development only)
   *     tags: [Upload]
   *     security:
   *       - bearerAuth: []
   */
  router.get('/chunked/debug/:uploadId',
    authenticate,
    requestTimeout(10 * 1000),
    async (req, res) => {
      try {
        const { uploadId } = req.params;
        const session = await uploadController.getUploadSession(uploadId);
        
        if (session) {
          res.json({
            success: true,
            data: {
              uploadId: session.uploadId,
              fileName: session.fileName,
              status: session.status,
              uploadedChunks: session.uploadedChunks.size,
              totalChunks: session.totalChunks,
              createdAt: session.createdAt,
              lastActivity: session.lastActivity
            }
          });
        } else {
          res.status(404).json({ success: false, message: 'Session not found' });
        }
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    }
  );
}

export default router;