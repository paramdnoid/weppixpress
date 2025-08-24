import express from 'express';
import multer from 'multer';
import authenticate from '../middleware/authenticate.js';
import { requestTimeout } from '../middleware/requestContext.js';
import chunkedUploadController from '../controllers/chunkedUploadController.js';

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

export default router;