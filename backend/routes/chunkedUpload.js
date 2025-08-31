import express from 'express';
import multer from 'multer';
import authenticate from '../middleware/authenticate.js';
import { requestTimeout } from '../middleware/requestContext.js';
import chunkedUploadController from '../controllers/chunkedUploadController.js';
import uploadCleanupService from '../services/uploadCleanupService.js';

const router = express.Router();

const chunkStorage = multer.memoryStorage();
const chunkUpload = multer({
  storage: chunkStorage,
  limits: {
    fileSize: 3 * 1024 * 1024, // 3MB max chunk size (slightly above 2MB default)
    files: 1
  }
});

// For init endpoint, we need to parse form fields (no files)
const initUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 0, // No files for init
    fields: 10   // Allow form fields
  }
});

router.post('/init', 
  authenticate, 
  requestTimeout(30 * 1000),
  initUpload.none(), // Parse form fields only
  chunkedUploadController.initializeUpload.bind(chunkedUploadController)
);

router.post('/chunk/:uploadId',
  authenticate,
  requestTimeout(5 * 60 * 1000),
  chunkUpload.single('chunk'),
  chunkedUploadController.uploadChunk.bind(chunkedUploadController)
);

router.get('/status/:uploadId',
  authenticate,
  requestTimeout(10 * 1000),
  chunkedUploadController.getUploadStatus.bind(chunkedUploadController)
);

router.post('/pause/:uploadId',
  authenticate,
  requestTimeout(10 * 1000),
  chunkedUploadController.pauseUpload.bind(chunkedUploadController)
);

router.post('/resume/:uploadId',
  authenticate,
  requestTimeout(10 * 1000),
  chunkedUploadController.resumeUpload.bind(chunkedUploadController)
);

router.delete('/cancel/:uploadId',
  authenticate,
  requestTimeout(30 * 1000),
  chunkedUploadController.cancelUpload.bind(chunkedUploadController)
);

router.get('/active',
  authenticate,
  requestTimeout(30 * 1000),
  chunkedUploadController.listActiveUploads.bind(chunkedUploadController)
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
  chunkedUploadController.cancelAllForUser.bind(chunkedUploadController)
);

// Debug endpoint to check session by ID (only in development)
if (process.env.NODE_ENV !== 'production') {
  router.get('/debug/:uploadId',
    authenticate,
    requestTimeout(10 * 1000),
    async (req, res) => {
      try {
        const { uploadId } = req.params;
        const session = await chunkedUploadController.getUploadSession(uploadId);
        
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
