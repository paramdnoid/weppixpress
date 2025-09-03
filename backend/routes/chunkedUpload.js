import express from 'express';
import authenticate from '../middleware/authenticate.js';
import { requestTimeout } from '../middleware/requestContext.js';
import uploadController, { 
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

router.post('/init', 
  authenticate, 
  requestTimeout(30 * 1000),
  initUploadMiddleware, // Parse form fields only
  initializeUpload
);

router.post('/chunk/:uploadId',
  authenticate,
  requestTimeout(5 * 60 * 1000),
  chunkUploadMiddleware,
  uploadChunk
);

router.get('/status/:uploadId',
  authenticate,
  requestTimeout(10 * 1000),
  getUploadStatus
);

router.post('/pause/:uploadId',
  authenticate,
  requestTimeout(10 * 1000),
  pauseUpload
);

router.post('/resume/:uploadId',
  authenticate,
  requestTimeout(10 * 1000),
  resumeUpload
);

router.delete('/cancel/:uploadId',
  authenticate,
  requestTimeout(30 * 1000),
  cancelUpload
);

router.get('/active',
  authenticate,
  requestTimeout(30 * 1000),
  listActiveUploads
);

// Trigger cleanup of expired/stale sessions (authenticated)
router.post('/cleanup',
  authenticate,
  requestTimeout(60 * 1000),
  async (req, res, next) => {
    try {
      // Use the service to keep logging/metrics consistent
      const cleaned = await uploadCleanupService.manualCleanup();
      res.json({ success: true, data: { cleaned } });
    } catch (error) {
      next(error);
    }
  }
);

// Cancel all active uploads for the current user
router.delete('/active',
  authenticate,
  requestTimeout(60 * 1000),
  cancelAllForUser
);

// Debug endpoint to check session by ID (only in development)
if (process.env.NODE_ENV !== 'production') {
  router.get('/debug/:uploadId',
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
