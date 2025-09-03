import { promises as fsp, createWriteStream } from 'fs';
import { join, dirname, basename, extname, relative } from 'path';
import { ValidationError } from '../utils/errors.js';
import { fileFilter } from '../utils/fileValidation.js';
import { sanitizeUploadPath, secureResolve } from '../utils/pathSecurity.js';
import { ensureUserUploadDir } from './fileController.js';
import cacheService from '../services/cacheService.js';
import logger from '../utils/logger.js';
import multer from 'multer';
import crypto from 'crypto';

// Configuration constants
const CHUNK_SIZE = parseInt(process.env.UPLOAD_CHUNK_SIZE) || (2 * 1024 * 1024); // 2MB chunks
const UPLOAD_SESSION_TTL = parseInt(process.env.UPLOAD_SESSION_TTL) || (24 * 60 * 60); // 24 hours
const MAX_FILE_SIZE = parseInt(process.env.MAX_UPLOAD_FILE_SIZE) || (50 * 1024 * 1024 * 1024); // 50GB

const maxFileSize =
  Number(process.env.UPLOAD_MAX_FILESIZE_BYTES) ||
  (Number(process.env.UPLOAD_MAX_FILESIZE_GB || 5) * 1024 * 1024 * 1024); // default 5GB

const CACHE_PREFIX = `${process.env.CACHE_PREFIX || 'weppix'}:`;
const stripCachePrefix = (key) => key.startsWith(CACHE_PREFIX) ? key.slice(CACHE_PREFIX.length) : key;

// Cache utility functions for backward compatibility
const FileCache = {
  async invalidateUserFiles(userId) {
    return await cacheService.deletePattern(`files:${userId}:*`);
  },
  async invalidateFilePath(userId, path) {
    const key = `files:${userId}:${(path || '/').replace(/\//g, '_')}`;
    return await cacheService.delete(key);
  }
};

// Helper functions
const pathExists = async (p) => {
  try { await fsp.access(p); return true; } catch { return false; }
};

const sanitizeFilename = (name) => {
  const base = basename(name || '');
  return base.replace(/[\u0000-\u001F<>:"/\\|?*]+/g, '').trim() || 'unnamed';
};

const getUniquePath = async (dir, desiredName) => {
  const idx = desiredName.lastIndexOf('.');
  const hasExt = idx > 0 && desiredName.indexOf('.') !== 0;
  const base = hasExt ? desiredName.slice(0, idx) : desiredName;
  const ext = hasExt ? desiredName.slice(idx) : '';
  let candidate = desiredName;
  let i = 1;
  while (await pathExists(join(dir, candidate))) {
    candidate = `${base} (${i++})${ext}`;
  }
  return join(dir, candidate);
};

// Simple multer memory storage for normal uploads
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  fileFilter: fileFilter(),
  limits: {
    files: Number(process.env.UPLOAD_MAX_FILES || 200),
    fileSize: maxFileSize,
    fields: 2000
  }
});

// Multer configurations for chunked uploads
const chunkStorage = multer.memoryStorage();
const chunkUpload = multer({
  storage: chunkStorage,
  limits: {
    fileSize: 3 * 1024 * 1024, // 3MB max chunk size
    files: 1
  }
});

const initUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 0, // No files for init
    fields: 10   // Allow form fields
  }
});

class UploadController {
  constructor() {
    this.activeUploads = new Map();
  }

  // ===== NORMAL UPLOAD FUNCTIONALITY =====

  async uploadFile(req, res, next) {
    try {
      const filesArr = Array.isArray(req.files)
        ? req.files
        : [
            ...(req.files?.['file'] || []),
            ...(req.files?.['files'] || []),
            ...(req.files?.['files[]'] || [])
          ];

      if (!filesArr || filesArr.length === 0) {
        throw new ValidationError('No files uploaded');
      }

      const uploadedFiles = [];
      const userDir = await ensureUserUploadDir(req.user.userId);
      const uploadPath = req.body?.path || '/';

      // Sanitize and resolve target path
      let targetPath;
      try {
        const sanitizedPath = sanitizeUploadPath(uploadPath);
        targetPath = secureResolve(userDir, sanitizedPath);
      } catch (error) {
        throw new ValidationError('Invalid upload path: ' + error.message);
      }

      // Ensure target directory exists
      await fsp.mkdir(targetPath, { recursive: true });

      for (const file of filesArr) {
        // Sanitize filename
        const safeName = sanitizeFilename(file.originalname);
        
        // Get unique file path
        const uniquePath = await getUniquePath(targetPath, safeName);
        
        // Write file to disk
        await fsp.writeFile(uniquePath, file.buffer);
        
        // Calculate relative path for response
        const rel = relative(userDir, uniquePath).replace(/\\/g, '/');

        uploadedFiles.push({
          name: file.originalname,
          path: rel,
          size: file.size,
          mime_type: file.mimetype || 'application/octet-stream',
          uploaded_at: new Date().toISOString()
        });

        // Invalidate caches (best-effort)
        if (req.user?.userId) {
          try {
            await FileCache.invalidateUserFiles(req.user.userId);
            const createdPath = '/' + rel.replace(/^\/+/, '');
            const parentPath = createdPath.replace(/\/[^/]*$/, '/').replace(/\/+$/, '/') || '/';
            await FileCache.invalidateFilePath(req.user.userId, parentPath);
          } catch (_) {}
        }

        // WebSocket broadcasts (best-effort)
        if (global.wsManager) {
          try {
            const createdPath = '/' + rel.replace(/^\/+/, '');
            const parentPath = createdPath.replace(/\/[^/]*$/, '/').replace(/\/+$/, '/') || '/';

            global.wsManager.broadcastFileCreated({
              name: file.originalname,
              path: createdPath,
              type: 'file',
              size: file.size,
              modified: new Date().toISOString()
            });

            global.wsManager.broadcastFolderChanged(parentPath);
          } catch (_) {}
        }
      }

      res.status(201).json({ success: true, data: uploadedFiles });
    } catch (error) {
      next(error);
    }
  }

  // ===== CHUNKED UPLOAD FUNCTIONALITY =====

  async initializeUpload(req, res, next) {
    try {
      const { fileName, fileSize, relativePath = '', chunkSize = CHUNK_SIZE } = req.body;

      if (!fileName || !fileSize) {
        throw new ValidationError('fileName and fileSize are required');
      }

      if (fileSize > MAX_FILE_SIZE) {
        const maxSizeGB = Math.round(MAX_FILE_SIZE / (1024 * 1024 * 1024));
        throw new ValidationError(`File size exceeds maximum allowed size (${maxSizeGB}GB)`);
      }

      const userDir = await ensureUserUploadDir(req.user.userId);
      const safeName = sanitizeFilename(fileName);
      const sanitizedPath = sanitizeUploadPath(relativePath);

      // Determine if client sent a path including the filename; if so, strip it
      const pathParts = sanitizedPath.split('/').filter(Boolean);
      const lastPart = pathParts[pathParts.length - 1] || '';
      const looksLikeFilename = lastPart.toLowerCase() === safeName.toLowerCase() ||
        (!!lastPart && lastPart.includes('.') && !lastPart.startsWith('.'));

      const dirOnlyPath = looksLikeFilename ? pathParts.slice(0, -1).join('/') : sanitizedPath;

      // Resolve and ensure directory exists
      const targetDir = secureResolve(userDir, dirOnlyPath);
      await fsp.mkdir(targetDir, { recursive: true });

      const uploadId = crypto.randomUUID();
      const uniquePath = await this.getUniquePath(targetDir, safeName);
      
      // Create temp directory for chunks (using the correct parent directory)
      const tempDir = join(targetDir, '.chunks', uploadId);
      await fsp.mkdir(tempDir, { recursive: true });
      
      logger.info(`Upload paths for ${uploadId}`, {
        targetDir,
        uniquePath,
        tempDir,
        fileName: safeName
      });

      const uploadSession = {
        uploadId,
        userId: req.user.userId,
        fileName: safeName,
        fileSize: parseInt(fileSize),
        chunkSize: parseInt(chunkSize),
        targetPath: uniquePath,
        tempDir,
        relativePath: dirOnlyPath,
        totalChunks: Math.ceil(fileSize / chunkSize),
        uploadedChunks: new Set(),
        createdAt: new Date(),
        lastActivity: new Date(),
        status: 'initialized'
      };

      const sessionSaved = await this.saveUploadSession(uploadId, uploadSession);
      
      if (!sessionSaved) {
        logger.error(`Failed to save initial upload session for ${uploadId}`);
        throw new ValidationError('Failed to initialize upload session');
      }
      
      logger.info(`Upload session initialized successfully`, {
        uploadId,
        fileName: safeName,
        fileSize: parseInt(fileSize),
        totalChunks: uploadSession.totalChunks,
        userId: req.user.userId
      });

      res.json({
        success: true,
        data: {
          uploadId,
          chunkSize: uploadSession.chunkSize,
          totalChunks: uploadSession.totalChunks,
          targetPath: uniquePath.replace(userDir, '').replace(/\\/g, '/')
        }
      });

    } catch (error) {
      next(error);
    }
  }

  async uploadChunk(req, res, next) {
    try {
      const { uploadId } = req.params;
      const { chunkIndex } = req.body;
      const chunkFile = req.file;

      if (!chunkFile || chunkIndex === undefined) {
        throw new ValidationError('Chunk file and chunkIndex are required');
      }

      const uploadSession = await this.getUploadSession(uploadId);
      if (!uploadSession) {
        logger.warn(`Upload session not found during chunk upload`, {
          uploadId,
          userId: req.user.userId,
          chunkIndex
        });
        throw new ValidationError('Upload session not found or expired. Please restart the upload.');
      }

      if (uploadSession.userId !== req.user.userId) {
        throw new ValidationError('Unauthorized access to upload session');
      }

      const chunkIdx = parseInt(chunkIndex);
      if (chunkIdx < 0 || chunkIdx >= uploadSession.totalChunks) {
        throw new ValidationError('Invalid chunk index');
      }

      if (uploadSession.uploadedChunks.has(chunkIdx)) {
        return res.json({ success: true, message: 'Chunk already uploaded' });
      }

      const chunkPath = join(uploadSession.tempDir, `chunk_${chunkIdx}`);
      await fsp.writeFile(chunkPath, chunkFile.buffer);

      uploadSession.uploadedChunks.add(chunkIdx);
      uploadSession.lastActivity = new Date();
      uploadSession.status = 'uploading';

      const sessionSaved = await this.saveUploadSession(uploadId, uploadSession);
      
      if (!sessionSaved) {
        logger.error(`Failed to save session after chunk upload for ${uploadId}`);
        throw new ValidationError('Failed to save upload progress');
      }

      // Extend TTL on active uploads to prevent expiration
      const sessionKey = `upload_session:${uploadSession.userId}:${uploadId}`;
      await cacheService.expire(sessionKey, UPLOAD_SESSION_TTL);

      const uploadedCount = uploadSession.uploadedChunks.size;
      const progress = (uploadedCount / uploadSession.totalChunks) * 100;

      console.log(`Chunk upload debug for ${uploadId}:`, {
        uploadedCount,
        totalChunks: uploadSession.totalChunks,
        uploadedChunks: Array.from(uploadSession.uploadedChunks),
        chunkIdx,
        isComplete: uploadedCount === uploadSession.totalChunks
      });

      if (uploadedCount === uploadSession.totalChunks) {
        logger.info(`All chunks received for upload ${uploadId}, starting finalization`);

        try {
          await this.finalizeUpload(uploadSession);
          
          logger.info(`Upload completed successfully: ${uploadId}`);

          res.json({
            success: true,
            completed: true,
            progress: 100,
            message: 'Upload completed successfully'
          });
        } catch (finalizationError) {
          logger.error(`Finalization failed for upload ${uploadId}:`, finalizationError);

          res.status(500).json({
            success: false,
            completed: false,
            progress: Math.round(progress * 100) / 100,
            message: `Finalization failed: ${finalizationError.message}`
          });
        }
      } else {
        res.json({
          success: true,
          completed: false,
          progress: Math.round(progress * 100) / 100,
          uploadedChunks: uploadedCount,
          totalChunks: uploadSession.totalChunks
        });
      }

    } catch (error) {
      next(error);
    }
  }

  async getUploadStatus(req, res, next) {
    try {
      const { uploadId } = req.params;
      
      const uploadSession = await this.getUploadSession(uploadId);
      if (!uploadSession) {
        return res.status(404).json({ success: false, message: 'Upload session not found' });
      }

      if (uploadSession.userId !== req.user.userId) {
        throw new ValidationError('Unauthorized access to upload session');
      }

      const progress = (uploadSession.uploadedChunks.size / uploadSession.totalChunks) * 100;
      const uploadedSize = uploadSession.uploadedChunks.size * uploadSession.chunkSize;
      const remainingSize = uploadSession.fileSize - uploadedSize;
      
      const avgChunkTime = this.calculateAverageChunkTime(uploadSession);
      const remainingChunks = uploadSession.totalChunks - uploadSession.uploadedChunks.size;
      const estimatedTimeRemaining = remainingChunks * avgChunkTime;

      res.json({
        success: true,
        data: {
          uploadId,
          fileName: uploadSession.fileName,
          progress: Math.round(progress * 100) / 100,
          uploadedChunks: uploadSession.uploadedChunks.size,
          totalChunks: uploadSession.totalChunks,
          uploadedSize,
          totalSize: uploadSession.fileSize,
          remainingSize,
          estimatedTimeRemaining: Math.max(0, estimatedTimeRemaining),
          status: uploadSession.status,
          createdAt: uploadSession.createdAt,
          lastActivity: uploadSession.lastActivity
        }
      });

    } catch (error) {
      next(error);
    }
  }

  async pauseUpload(req, res, next) {
    try {
      const { uploadId } = req.params;
      
      const uploadSession = await this.getUploadSession(uploadId);
      if (!uploadSession) {
        throw new ValidationError('Upload session not found');
      }

      if (uploadSession.userId !== req.user.userId) {
        throw new ValidationError('Unauthorized access to upload session');
      }

      uploadSession.status = 'paused';
      uploadSession.lastActivity = new Date();
      await this.saveUploadSession(uploadId, uploadSession);

      res.json({ success: true, message: 'Upload paused' });

    } catch (error) {
      next(error);
    }
  }

  async resumeUpload(req, res, next) {
    try {
      const { uploadId } = req.params;
      
      const uploadSession = await this.getUploadSession(uploadId);
      if (!uploadSession) {
        throw new ValidationError('Upload session not found');
      }

      if (uploadSession.userId !== req.user.userId) {
        throw new ValidationError('Unauthorized access to upload session');
      }

      uploadSession.status = 'uploading';
      uploadSession.lastActivity = new Date();
      await this.saveUploadSession(uploadId, uploadSession);

      const missingChunks = [];
      for (let i = 0; i < uploadSession.totalChunks; i++) {
        if (!uploadSession.uploadedChunks.has(i)) {
          missingChunks.push(i);
        }
      }

      res.json({ 
        success: true, 
        message: 'Upload resumed',
        missingChunks,
        progress: (uploadSession.uploadedChunks.size / uploadSession.totalChunks) * 100
      });

    } catch (error) {
      next(error);
    }
  }

  async cancelUpload(req, res, next) {
    try {
      const { uploadId } = req.params;
      
      const uploadSession = await this.getUploadSession(uploadId);
      if (!uploadSession) {
        throw new ValidationError('Upload session not found');
      }

      if (uploadSession.userId !== req.user.userId) {
        throw new ValidationError('Unauthorized access to upload session');
      }

      await this.cleanupUploadSession(uploadSession);
      await this.deleteUploadSession(uploadId);

      res.json({ success: true, message: 'Upload cancelled' });

    } catch (error) {
      next(error);
    }
  }

  async listActiveUploads(req, res, next) {
    try {
      const userId = req.user.userId;
      const pattern = `upload_session:${userId}:*`;
      const keys = (await cacheService.keys(pattern)).map(stripCachePrefix);

      const sessions = [];
      for (const key of keys) {
        const session = await cacheService.get(key);
        if (session && session.status !== 'completed') {
          // Ensure uploadedChunks is a Set for consistent size calculations
          if (Array.isArray(session.uploadedChunks)) {
            session.uploadedChunks = new Set(session.uploadedChunks);
          } else if (session.uploadedChunks && typeof session.uploadedChunks === 'object' && session.uploadedChunks.size === undefined) {
            session.uploadedChunks = new Set(
              Object.keys(session.uploadedChunks)
                .filter((k) => !isNaN(parseInt(k)))
                .map((k) => parseInt(k))
            );
          } else if (!session.uploadedChunks) {
            session.uploadedChunks = new Set();
          }

          const uploadedCount = session.uploadedChunks.size;
          const progress = (uploadedCount / session.totalChunks) * 100;
          sessions.push({
            uploadId: session.uploadId,
            fileName: session.fileName,
            progress: Math.round(progress * 100) / 100,
            status: session.status,
            fileSize: session.fileSize,
            createdAt: session.createdAt,
            lastActivity: session.lastActivity
          });
        }
      }

      res.json({ success: true, data: sessions });

    } catch (error) {
      next(error);
    }
  }

  async cancelAllForUser(req, res, next) {
    try {
      const userId = req.user.userId;
      const pattern = `upload_session:${userId}:*`;
      const keys = (await cacheService.keys(pattern)).map(stripCachePrefix);

      let cancelled = 0;
      for (const key of keys) {
        const session = await cacheService.get(key);
        if (!session) continue;

        // Normalize structure similar to getUploadSession
        if (Array.isArray(session.uploadedChunks)) {
          session.uploadedChunks = new Set(session.uploadedChunks);
        }

        try {
          await this.cleanupUploadSession(session);
        } catch (_) {
          // ignore per-session cleanup errors to continue
        }
        const uploadId = session.uploadId;
        await this.deleteUploadSession(uploadId);
        cancelled++;
      }

      res.json({ success: true, data: { cancelled } });
    } catch (error) {
      next(error);
    }
  }

  // ===== CHUNKED UPLOAD HELPER METHODS =====

  async finalizeUpload(uploadSession) {
    try {
      logger.info(`Starting finalization for upload ${uploadSession.uploadId}`);

      // Verify all chunks are present before starting assembly
      const missingChunks = [];
      for (let i = 0; i < uploadSession.totalChunks; i++) {
        const chunkPath = join(uploadSession.tempDir, `chunk_${i}`);
        try {
          await fsp.access(chunkPath);
        } catch {
          missingChunks.push(i);
        }
      }

      if (missingChunks.length > 0) {
        throw new Error(`Missing chunks: ${missingChunks.join(', ')}`);
      }

      // Create write stream
      const writeStream = createWriteStream(uploadSession.targetPath, {
        highWaterMark: 64 * 1024,
        autoClose: true
      });

      let totalBytesWritten = 0;

      // Process chunks sequentially
      for (let i = 0; i < uploadSession.totalChunks; i++) {
        const chunkPath = join(uploadSession.tempDir, `chunk_${i}`);
        
        try {
          const chunkData = await fsp.readFile(chunkPath);
          totalBytesWritten += chunkData.length;
          
          await new Promise((resolve, reject) => {
            writeStream.write(chunkData, (error) => {
              if (error) {
                reject(error);
              } else {
                resolve();
              }
            });
          });

          // Force garbage collection periodically
          if (global.gc && i % 50 === 0) {
            global.gc();
          }

        } catch (chunkError) {
          writeStream.destroy();
          throw new Error(`Failed to process chunk ${i}: ${chunkError.message}`);
        }
      }

      // Close the write stream and wait for completion
      await new Promise((resolve, reject) => {
        writeStream.end((error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });

      // Verify final file integrity
      const stats = await fsp.stat(uploadSession.targetPath);
      if (stats.size !== uploadSession.fileSize) {
        throw new Error(`File size mismatch: expected ${uploadSession.fileSize}, got ${stats.size}`);
      }

      // Update session status
      uploadSession.status = 'completed';
      uploadSession.completedAt = new Date();
      await this.saveUploadSession(uploadSession.uploadId, uploadSession);

      // Clean up chunk files
      await this.cleanupUploadSession(uploadSession);

      // Invalidate file cache
      if (uploadSession.userId) {
        try {
          await cacheService.deletePattern(`files:${uploadSession.userId}:*`);
        } catch (error) {
          logger.warn('Failed to invalidate cache:', error);
        }
      }

      // Broadcast file creation via WebSocket
      if (global.wsManager) {
        try {
          const userDir = await ensureUserUploadDir(uploadSession.userId);
          const relativePath = uploadSession.targetPath.replace(userDir, '').replace(/\\/g, '/');
          const normalizedPath = ('/' + relativePath).replace(/\/+/, '/');
          const parentPath = dirname(normalizedPath).replace(/\\/g, '/') || '/';

          global.wsManager.broadcastFileCreated({
            name: uploadSession.fileName,
            path: normalizedPath,
            type: 'file',
            size: uploadSession.fileSize,
            modified: new Date().toISOString()
          });

          global.wsManager.broadcastFolderChanged(parentPath);
        } catch (wsError) {
          logger.warn('Failed to broadcast WebSocket event:', wsError);
        }
      }

    } catch (error) {
      logger.error(`Upload finalization failed for ${uploadSession.uploadId}:`, error);

      // Ensure cleanup happens even on failure
      try {
        await this.cleanupUploadSession(uploadSession);
      } catch (cleanupError) {
        logger.warn('Failed to cleanup after finalization error:', cleanupError);
      }

      // Update session with error status
      uploadSession.status = 'error';
      uploadSession.errorMessage = error.message;
      try {
        await this.saveUploadSession(uploadSession.uploadId, uploadSession);
      } catch (saveError) {
        logger.warn('Failed to save error status to session:', saveError);
      }

      throw error;
    }
  }

  async cleanupUploadSession(uploadSession) {
    try {
      // Check if temp directory exists before cleanup
      await fsp.access(uploadSession.tempDir);
      
      // Count chunks before cleanup for logging
      const chunkFiles = await fsp.readdir(uploadSession.tempDir);
      const chunkCount = chunkFiles.length;
      
      // Get parent .chunks directory path
      const chunksParentDir = dirname(uploadSession.tempDir);
      
      await fsp.rm(uploadSession.tempDir, { recursive: true, force: true });
      
      // Try to remove the parent .chunks directory if it's empty
      try {
        const remainingItems = await fsp.readdir(chunksParentDir);
        if (remainingItems.length === 0) {
          await fsp.rmdir(chunksParentDir);
          logger.info(`Removed empty .chunks directory: ${chunksParentDir}`);
        }
      } catch (cleanupError) {
        // Ignore errors when trying to clean up parent directory
        logger.debug(`Could not remove parent .chunks directory: ${cleanupError.message}`);
      }
      
      logger.info(`Cleaned up chunk directory for upload ${uploadSession.uploadId}`, {
        tempDir: uploadSession.tempDir,
        chunksRemoved: chunkCount,
        fileName: uploadSession.fileName
      });
    } catch (error) {
      if (error.code === 'ENOENT') {
        logger.debug(`Temp directory already removed for upload ${uploadSession.uploadId}`);
      } else {
        logger.warn('Failed to cleanup temp directory:', { 
          error: error.message, 
          tempDir: uploadSession.tempDir,
          uploadId: uploadSession.uploadId
        });
      }
    }
  }

  async saveUploadSession(uploadId, session) {
    const key = `upload_session:${session.userId}:${uploadId}`;
    
    // Create a copy for serialization, don't modify the original
    const sessionForStorage = {
      ...session,
      uploadedChunks: Array.from(session.uploadedChunks)
    };
    
    const success = await cacheService.set(key, sessionForStorage, UPLOAD_SESSION_TTL);
    
    logger.debug(`Saving upload session ${uploadId}`, {
      key,
      success,
      fileName: session.fileName,
      uploadedChunks: session.uploadedChunks.length,
      totalChunks: session.totalChunks,
      status: session.status,
      ttl: UPLOAD_SESSION_TTL
    });
    
    if (!success) {
      logger.warn(`Failed to save upload session ${uploadId}`, { key });
    }
    
    return success;
  }

  async getUploadSession(uploadId) {
    const pattern = `upload_session:*:${uploadId}`;
    const keys = await cacheService.keys(pattern);
    
    logger.debug(`Looking for upload session ${uploadId}`, {
      pattern,
      keysFound: keys.length
    });
    
    if (keys.length === 0) {
      logger.warn(`Upload session not found: ${uploadId}`, { pattern });
      return null;
    }
    
    const keyToUse = keys[0];
    const prefix = process.env.CACHE_PREFIX || 'weppix';
    const cacheKey = keyToUse.replace(`${prefix}:`, '');
    
    const session = await cacheService.get(cacheKey);
    if (session) {
      // Fix the uploadedChunks conversion
      if (Array.isArray(session.uploadedChunks)) {
        session.uploadedChunks = new Set(session.uploadedChunks);
      } else if (session.uploadedChunks && typeof session.uploadedChunks === 'object') {
        session.uploadedChunks = new Set(Object.keys(session.uploadedChunks).filter(key => !isNaN(parseInt(key))).map(key => parseInt(key)));
      } else {
        session.uploadedChunks = new Set();
      }
      
      logger.debug(`Session retrieved successfully for ${uploadId}`, {
        fileName: session.fileName,
        uploadedChunks: session.uploadedChunks.size,
        totalChunks: session.totalChunks,
        status: session.status
      });
    } else {
      logger.warn(`Session key found but data is null for ${uploadId}`, { keyToUse, cacheKey });
    }
    
    return session;
  }

  async deleteUploadSession(uploadId) {
    const pattern = `upload_session:*:${uploadId}`;
    const keys = await cacheService.keys(pattern);
    const prefix = process.env.CACHE_PREFIX || 'weppix';
    
    logger.debug(`Deleting upload session ${uploadId}`, {
      pattern,
      keysFound: keys.length
    });
    
    let deletedCount = 0;
    for (const key of keys) {
      const cacheKey = key.replace(`${prefix}:`, '');
      const deleted = await cacheService.delete(cacheKey);
      if (deleted) deletedCount++;
    }
    
    logger.debug(`Deleted upload session ${uploadId}`, {
      keysDeleted: deletedCount,
      totalKeys: keys.length
    });
    
    return deletedCount;
  }

  async getUniquePath(dir, desiredName) {
    const ext = extname(desiredName);
    const baseName = basename(desiredName, ext);
    let candidate = desiredName;
    let counter = 1;

    while (await pathExists(join(dir, candidate))) {
      candidate = `${baseName} (${counter++})${ext}`;
    }

    return join(dir, candidate);
  }

  calculateAverageChunkTime(uploadSession) {
    if (uploadSession.uploadedChunks.size === 0) return 0;
    
    const totalTime = new Date() - new Date(uploadSession.createdAt);
    return totalTime / uploadSession.uploadedChunks.size;
  }

  async cleanupExpiredSessions() {
    try {
      const pattern = 'upload_session:*';
      const keys = (await cacheService.keys(pattern)).map(stripCachePrefix);
      const expiredSessions = [];

      for (const key of keys) {
        const session = await cacheService.get(key);
        if (session) {
          const age = new Date() - new Date(session.lastActivity);
          const maxAge = 24 * 60 * 60 * 1000; // 24 hours
          
          if (age > maxAge) {
            expiredSessions.push(session);
            await this.cleanupUploadSession(session);
            await cacheService.delete(key);
          }
        }
      }

      return expiredSessions.length;
    } catch (error) {
      console.error('Failed to cleanup expired sessions:', error);
      return 0;
    }
  }
}

// Create single instance
const uploadController = new UploadController();

// Export both the class instance and middleware configurations
export default uploadController;

// Exported middleware for normal uploads
export const uploadMiddleware = upload.any();

// Exported middleware for chunked uploads
export const chunkUploadMiddleware = chunkUpload.single('chunk');
export const initUploadMiddleware = initUpload.none();

// Export individual methods for easier importing
export const uploadFile = uploadController.uploadFile.bind(uploadController);
export const initializeUpload = uploadController.initializeUpload.bind(uploadController);
export const uploadChunk = uploadController.uploadChunk.bind(uploadController);
export const getUploadStatus = uploadController.getUploadStatus.bind(uploadController);
export const pauseUpload = uploadController.pauseUpload.bind(uploadController);
export const resumeUpload = uploadController.resumeUpload.bind(uploadController);
export const cancelUpload = uploadController.cancelUpload.bind(uploadController);
export const listActiveUploads = uploadController.listActiveUploads.bind(uploadController);
export const cancelAllForUser = uploadController.cancelAllForUser.bind(uploadController);