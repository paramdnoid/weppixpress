import express from 'express';
import { createWriteStream } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { join } from 'path';
import fs from 'fs/promises';
import { authenticateToken } from '../middleware/authenticate.js';
import {
  secureResolve,
  getUserDirectory,
  sanitizeUploadPath,
  validateFileUpload,
  logger,
  sendValidationError,
  sendNotFoundError,
  sendInternalServerError
} from '../utils/index.js';

const router = express.Router();

// Redis-based session storage for production
class OptimizedSessionManager {
  constructor() {
    // In-memory for now, easily replaceable with Redis
    this.sessions = new Map();
    this.files = new Map();
    this.activeStreams = new Map(); // Track active upload streams

    // Start cleanup interval for production
    this.cleanupInterval = setInterval(() => this.cleanupStale(), 5 * 60 * 1000); // Every 5 minutes

    // Run initial cleanup on startup to handle restarts
    setTimeout(() => this.cleanupStale(), 30 * 1000); // After 30 seconds
  }

  // Cleanup stale sessions and streams
  cleanupStale() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    const streamTimeout = 10 * 60 * 1000; // 10 minutes for streams
    let cleanedSessions = 0;
    let cleanedFiles = 0;
    let cleanedStreams = 0;

    // Cleanup old sessions
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.createdAt > maxAge) {
        // Cleanup associated files
        for (const fileId of session.files.keys()) {
          this.files.delete(fileId);
          cleanedFiles++;
        }
        this.sessions.delete(sessionId);
        cleanedSessions++;
        logger.info('Cleaned up stale session', { sessionId, age: now - session.createdAt });
      }
    }

    // Cleanup stale active streams
    for (const [streamId, stream] of this.activeStreams.entries()) {
      if (now - stream.startTime > streamTimeout) {
        this.activeStreams.delete(streamId);
        cleanedStreams++;
        logger.warn('Cleaned up stale stream', { streamId, age: now - stream.startTime });
      }
    }

    // Log cleanup stats and trigger garbage collection if significant cleanup occurred
    if (cleanedSessions > 0 || cleanedFiles > 10 || cleanedStreams > 5) {
      logger.info('Upload cleanup completed', {
        cleanedSessions,
        cleanedFiles,
        cleanedStreams,
        remainingSessions: this.sessions.size,
        remainingFiles: this.files.size,
        activeStreams: this.activeStreams.size
      });

      // Trigger garbage collection after significant cleanup
      if (global.gc && (cleanedSessions > 5 || cleanedFiles > 50)) {
        try {
          global.gc();
          logger.debug('Manual garbage collection triggered after upload cleanup');
        } catch (error) {
          logger.debug('Manual GC not available', { error: error.message });
        }
      }
    }
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  createSession(userId, targetPath) {
    const sessionId = uuidv4();
    const session = {
      id: sessionId,
      userId,
      targetPath,
      targetRelative: sanitizeUploadPath(targetPath),
      createdAt: Date.now(),
      status: 'active',
      files: new Map(),
      bytesTransferred: 0,
      totalBytes: 0
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  getSession(sessionId, userId) {
    const session = this.sessions.get(sessionId);
    if (!session || session.userId !== userId) {
      return null;
    }
    return session;
  }

  registerFile(sessionId, fileInfo) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const fileId = uuidv4();
    const file = {
      id: fileId,
      sessionId,
      path: fileInfo.path,
      size: fileInfo.size || 0,
      received: 0,
      status: 'pending',
      createdAt: Date.now(),
      checksum: fileInfo.checksum || null
    };

    this.files.set(fileId, file);
    session.files.set(fileId, file);
    session.totalBytes += file.size;

    return file;
  }
}

const sessionManager = new OptimizedSessionManager();

// Apply authentication to all upload routes
router.use(authenticateToken);

// Get upload base directory from environment
const getUploadBaseDir = () => {
  return process.env.UPLOAD_DIR || './uploads';
};

// Session limits from environment - optimized for batch processing
const MAX_SESSIONS_PER_USER = parseInt(process.env.UPLOAD_MAX_SESSIONS_PER_USER) || 10000; // Temporarily very high for testing
const MAX_FILES_PER_SESSION = parseInt(process.env.UPLOAD_MAX_FILES_PER_SESSION) || 1000;
const MAX_CONCURRENT_STREAMS = parseInt(process.env.UPLOAD_MAX_CONCURRENT_STREAMS) || 20; // Increase concurrent streams

// Optimized session validation middleware
function validateSession(req: Request, res: Response, next: NextFunction) {
  const { sessionId } = req.params;
  const userId = req.user.id;

  const session = sessionManager.getSession(sessionId, userId);
  if (!session) {
    return sendNotFoundError(res, 'Session not found');
  }

  req.uploadSession = session;
  next();
}

// Create optimized upload session
router.post('/sessions', async (req, res) => {
  try {
    logger.info('Creating upload session - rate limiting DISABLED', { userId: req.user.id });
    const { targetPath } = req.body;
    const userId = req.user.id;

    if (!targetPath && targetPath !== '') {
      return res.status(400).json({
        success: false,
        error: { message: 'Target path is required', code: 'INVALID_REQUEST' }
      });
    }

    // Check session limit - TEMPORARILY DISABLED FOR TESTING
    // const userSessions = Array.from(sessionManager.sessions.values())
    //   .filter(s => s.userId === userId);

    // if (userSessions.length >= MAX_SESSIONS_PER_USER) {
    //   return res.status(429).json({
    //     success: false,
    //     error: {
    //       message: `Maximum ${MAX_SESSIONS_PER_USER} concurrent upload sessions allowed`,
    //       code: 'SESSION_LIMIT_EXCEEDED'
    //     }
    //   });
    // }

    const session = sessionManager.createSession(userId, targetPath);

    res.status(201).json({
      id: session.id,
      status: session.status,
      targetRelative: session.targetRelative
    });

  } catch (error) {
    logger.error('Upload session creation failed:', error);
    res.status(400).json({
      success: false,
      error: { message: error.message, code: 'INVALID_REQUEST' }
    });
  }
});

// Register files in session (batch registration)
router.post('/sessions/:sessionId/files', validateSession, async (req, res) => {
  try {
    const { files: fileList } = req.body;
    const session = req.uploadSession;

    if (!Array.isArray(fileList)) {
      return res.status(400).json({
        error: 'Files array is required'
      });
    }

    // Check file count limit
    const currentFileCount = session.files.size;
    const newFileCount = fileList.length;
    if (currentFileCount + newFileCount > MAX_FILES_PER_SESSION) {
      return res.status(400).json({
        error: `Maximum ${MAX_FILES_PER_SESSION} files per session. Current: ${currentFileCount}, Trying to add: ${newFileCount}`
      });
    }

    const registeredFiles = [];
    for (const fileInfo of fileList) {
      try {
        // Validate file information with enhanced security checks
        validateFileUpload(fileInfo);

        const file = sessionManager.registerFile(session.id, fileInfo);
        if (file) {
          registeredFiles.push({
            fileId: file.id,
            path: file.path,
            size: file.size
          });
        }
      } catch (validationError) {
        logger.warn('File validation failed during registration', {
          fileInfo: fileInfo?.path || 'unknown',
          error: validationError.message,
          sessionId: session.id,
          userId: session.userId
        });

        return res.status(400).json({
          success: false,
          error: {
            message: `File validation failed: ${validationError.message}`,
            code: 'FILE_VALIDATION_ERROR',
            file: fileInfo?.path || 'unknown'
          }
        });
      }
    }

    res.json({ files: registeredFiles });

  } catch (error) {
    logger.error('File registration failed:', error);
    res.status(400).json({
      error: error.message
    });
  }
});

// OPTIMIZED: Streaming upload endpoint
router.put('/sessions/:sessionId/files/:fileId/stream', validateSession, async (req, res) => {
  try {
    const { fileId } = req.params;
    const { offset } = req.query;
    const session = req.uploadSession;
    const userId = req.user.id;

    const file = sessionManager.files.get(fileId);
    if (!file || file.sessionId !== session.id) {
      return res.status(404).json({
        success: false,
        error: { message: 'File not found', code: 'NOT_FOUND' }
      });
    }

    const chunkOffset = parseInt(offset) || 0;
    if (chunkOffset !== file.received) {
      return res.status(409).json({
        success: false,
        error: { message: `Expected offset ${file.received}, got ${chunkOffset}`, code: 'OFFSET_MISMATCH' }
      });
    }

    // Check concurrent stream limit
    const activeStreamCount = sessionManager.activeStreams.size;
    if (activeStreamCount >= MAX_CONCURRENT_STREAMS) {
      logger.warn('Upload stream limit exceeded', {
        userId,
        sessionId: session.id,
        fileId,
        activeStreams: activeStreamCount,
        maxStreams: MAX_CONCURRENT_STREAMS
      });
      return res.status(429).json({
        success: false,
        error: {
          message: `Too many concurrent uploads (${activeStreamCount}/${MAX_CONCURRENT_STREAMS})`,
          code: 'STREAM_LIMIT_EXCEEDED',
          retryAfter: 1
        }
      });
    }

    // Create file path
    const baseDir = getUserDirectory(userId, getUploadBaseDir());
    const sanitizedTarget = sanitizeUploadPath(session.targetRelative);
    const targetDir = sanitizedTarget ? secureResolve(baseDir, sanitizedTarget) : baseDir;

    let filePath;
    if (file.path.includes('/')) {
      const pathParts = file.path.split('/');
      const fileName = pathParts.pop();
      const subDir = pathParts.join('/');
      const fullSubDir = subDir ? secureResolve(targetDir, subDir) : targetDir;
      await fs.mkdir(fullSubDir, { recursive: true });
      filePath = join(fullSubDir, fileName);
    } else {
      await fs.mkdir(targetDir, { recursive: true });
      filePath = join(targetDir, file.path);
    }

    // Create optimized write stream
    const writeStream = createWriteStream(filePath, {
      flags: 'a', // append mode for resumable uploads
      start: chunkOffset,
      highWaterMark: 64 * 1024 // 64KB buffer for optimal performance
    });

    const streamId = `${fileId}-${Date.now()}`;
    sessionManager.activeStreams.set(streamId, {
      fileId,
      sessionId: session.id,
      startTime: Date.now()
    });

    // Get the buffered body from express.raw()
    const chunkData = req.body;
    const bytesReceived = chunkData ? chunkData.length : 0;

    logger.info('Stream chunk received', {
      fileId,
      chunkSize: bytesReceived,
      offset: chunkOffset,
      progress: file.size > 0 ? ((chunkOffset + bytesReceived) / file.size * 100).toFixed(2) + '%' : 'unknown'
    });

    if (bytesReceived > 0 && !writeStream.destroyed) {
      // Write the chunk data to the file
      writeStream.write(chunkData, (error) => {
        if (error) {
          logger.error('Write stream error during write:', error);
          if (!writeStream.destroyed) {
            writeStream.destroy();
          }
          sessionManager.activeStreams.delete(streamId);
          file.status = 'error';
          if (!res.headersSent) {
            return res.status(500).json({
              success: false,
              error: { message: 'File write failed', code: 'WRITE_ERROR' }
            });
          }
          return;
        }

        // Update file progress
        file.received = chunkOffset + bytesReceived;
        file.status = file.received >= file.size ? 'completed' : 'uploading';
        session.bytesTransferred += bytesReceived;

        // Calculate throughput
        const streamInfo = sessionManager.activeStreams.get(streamId);
        const throughputBytesPerSec = streamInfo
          ? bytesReceived / ((Date.now() - streamInfo.startTime) / 1000)
          : 0;

        logger.info('Stream chunk processed', {
          fileId,
          received: file.received,
          completed: file.status === 'completed',
          throughput: throughputBytesPerSec
        });

        // Clean up stream tracking
        sessionManager.activeStreams.delete(streamId);

        // Send response
        if (!res.headersSent) {
          res.json({
            received: file.received,
            completed: file.status === 'completed',
            throughput: throughputBytesPerSec
          });
        }
      });
    } else {
      // No data or destroyed stream
      sessionManager.activeStreams.delete(streamId);
      if (!res.headersSent) {
        res.status(400).json({
          success: false,
          error: { message: 'No data received or stream destroyed', code: 'NO_DATA' }
        });
      }
    }

    // Cleanup on request abort/close
    req.on('close', () => {
      if (!writeStream.destroyed) {
        writeStream.destroy();
      }
      sessionManager.activeStreams.delete(streamId);
    });

  } catch (error) {
    logger.error('Stream upload setup failed:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message, code: 'INTERNAL_ERROR' }
    });
  }
});

// Get session and files status (optimized response)
router.get('/sessions/:sessionId/status', validateSession, (req, res) => {
  const session = req.uploadSession;

  const fileStatuses = Array.from(session.files.values()).map(f => ({
    id: f.id,
    path: f.path,
    size: f.size,
    received: f.received,
    status: f.status,
    progress: f.size > 0 ? (f.received / f.size * 100).toFixed(2) : 0
  }));

  res.json({
    id: session.id,
    status: session.status,
    createdAt: session.createdAt,
    targetRelative: session.targetRelative,
    totalBytes: session.totalBytes,
    bytesTransferred: session.bytesTransferred,
    progress: session.totalBytes > 0 ? (session.bytesTransferred / session.totalBytes * 100).toFixed(2) : 0,
    files: fileStatuses,
    activeStreams: sessionManager.activeStreams.size
  });
});

// Performance monitoring endpoint
router.get('/stats', (_req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return sendNotFoundError(res, 'Not found');
  }

  const totalSessions = sessionManager.sessions.size;
  const totalFiles = sessionManager.files.size;
  const activeStreams = sessionManager.activeStreams.size;

  const memUsage = process.memoryUsage();

  res.json({
    sessions: totalSessions,
    files: totalFiles,
    activeStreams,
    limits: {
      maxSessionsPerUser: MAX_SESSIONS_PER_USER,
      maxFilesPerSession: MAX_FILES_PER_SESSION,
      maxConcurrentStreams: MAX_CONCURRENT_STREAMS
    },
    memory: {
      rss: Math.round(memUsage.rss / 1024 / 1024) + ' MB',
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB'
    }
  });
});

export default router;