import { promises as fsp, createWriteStream, createReadStream } from 'fs';
import { join, dirname, basename, extname } from 'path';
import { ValidationError } from '../utils/errors.js';
import { sanitizeUploadPath, secureResolve } from '../utils/pathSecurity.js';
import { ensureUserUploadDir } from './fileController.js';
import cacheService from '../services/cacheService.js';
import crypto from 'crypto';

const CHUNK_SIZE = parseInt(process.env.UPLOAD_CHUNK_SIZE) || (2 * 1024 * 1024); // 2MB chunks (reduced for better memory usage)
const UPLOAD_SESSION_TTL = parseInt(process.env.UPLOAD_SESSION_TTL) || (24 * 60 * 60); // 24 hours
const MAX_FILE_SIZE = parseInt(process.env.MAX_UPLOAD_FILE_SIZE) || (50 * 1024 * 1024 * 1024); // 50GB

const CACHE_PREFIX = `${process.env.CACHE_PREFIX || 'weppix'}:`;
const stripCachePrefix = (key) => key.startsWith(CACHE_PREFIX) ? key.slice(CACHE_PREFIX.length) : key;

class ChunkedUploadController {
  constructor() {
    this.activeUploads = new Map();
  }

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
      const sanitizedPath = sanitizeUploadPath(relativePath);
      const targetDir = secureResolve(userDir, sanitizedPath);
      
      await fsp.mkdir(targetDir, { recursive: true });

      const uploadId = crypto.randomUUID();
      const safeName = this.sanitizeFilename(fileName);
      const uniquePath = await this.getUniquePath(targetDir, safeName);
      const tempDir = join(dirname(uniquePath), '.chunks', uploadId);
      
      await fsp.mkdir(tempDir, { recursive: true });

      const uploadSession = {
        uploadId,
        userId: req.user.userId,
        fileName: safeName,
        fileSize: parseInt(fileSize),
        chunkSize: parseInt(chunkSize),
        targetPath: uniquePath,
        tempDir,
        relativePath: sanitizedPath,
        totalChunks: Math.ceil(fileSize / chunkSize),
        uploadedChunks: new Set(),
        createdAt: new Date(),
        lastActivity: new Date(),
        status: 'initialized'
      };

      await this.saveUploadSession(uploadId, uploadSession);

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
        throw new ValidationError('Upload session not found or expired');
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

      await this.saveUploadSession(uploadId, uploadSession);

      const progress = (uploadSession.uploadedChunks.size / uploadSession.totalChunks) * 100;

      if (uploadSession.uploadedChunks.size === uploadSession.totalChunks) {
        await this.finalizeUpload(uploadSession);
        
        res.json({
          success: true,
          completed: true,
          progress: 100,
          message: 'Upload completed successfully'
        });
      } else {
        res.json({
          success: true,
          completed: false,
          progress: Math.round(progress * 100) / 100,
          uploadedChunks: uploadSession.uploadedChunks.size,
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
          const progress = (session.uploadedChunks.size / session.totalChunks) * 100;
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

  async finalizeUpload(uploadSession) {
    const writeStream = createWriteStream(uploadSession.targetPath, {
      highWaterMark: 16 * 1024, // 16KB buffer to reduce memory usage
      autoClose: true
    });
    
    try {
      // Process chunks sequentially with optimized streaming
      for (let i = 0; i < uploadSession.totalChunks; i++) {
        const chunkPath = join(uploadSession.tempDir, `chunk_${i}`);
        
        try {
          const chunkStream = createReadStream(chunkPath, {
            highWaterMark: 16 * 1024 // Match write stream buffer to reduce memory usage
          });
          
          await new Promise((resolve, reject) => {
            chunkStream.on('error', reject);
            chunkStream.on('end', () => {
              // Force garbage collection after each chunk to reduce memory pressure
              if (global.gc && i % 10 === 0) {
                global.gc();
              }
              resolve();
            });
            
            // Pipe without ending the write stream
            chunkStream.pipe(writeStream, { end: false });
          });
        } catch (chunkError) {
          throw new Error(`Failed to read chunk ${i}: ${chunkError.message}`);
        }
      }

      // Close the write stream
      writeStream.end();
      
      await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });

      // Verify file size matches expected
      const stats = await fsp.stat(uploadSession.targetPath);
      if (stats.size !== uploadSession.fileSize) {
        throw new Error(`File size mismatch: expected ${uploadSession.fileSize}, got ${stats.size}`);
      }

      uploadSession.status = 'completed';
      uploadSession.completedAt = new Date();
      await this.saveUploadSession(uploadSession.uploadId, uploadSession);

      await this.cleanupUploadSession(uploadSession);

      if (uploadSession.userId) {
        try {
          await cacheService.deletePattern(`files:${uploadSession.userId}:*`);
        } catch (error) {
          console.warn('Failed to invalidate cache:', error.message);
        }
      }

      if (global.wsManager) {
        try {
          const userDir = await ensureUserUploadDir(uploadSession.userId);
          const relativePath = uploadSession.targetPath.replace(userDir, '').replace(/\\/g, '/');
          const parentPath = dirname(relativePath).replace(/\\/g, '/') || '/';

          global.wsManager.broadcastFileCreated({
            name: uploadSession.fileName,
            path: relativePath,
            type: 'file',
            size: uploadSession.fileSize,
            modified: new Date().toISOString()
          });

          global.wsManager.broadcastFolderChanged(parentPath);
        } catch (error) {
          console.warn('Failed to broadcast WebSocket event:', error.message);
        }
      }

    } catch (error) {
      writeStream.destroy();
      await this.cleanupUploadSession(uploadSession);
      throw error;
    }
  }

  async cleanupUploadSession(uploadSession) {
    try {
      await fsp.rmdir(uploadSession.tempDir, { recursive: true });
    } catch (error) {
      console.warn('Failed to cleanup temp directory:', error.message);
    }
  }

  async saveUploadSession(uploadId, session) {
    const key = `upload_session:${session.userId}:${uploadId}`;
    session.uploadedChunks = Array.from(session.uploadedChunks);
    await cacheService.set(key, session, UPLOAD_SESSION_TTL);
  }

  async getUploadSession(uploadId) {
    const keys = (await cacheService.keys(`upload_session:*:${uploadId}`)).map(stripCachePrefix);
    if (keys.length === 0) return null;

    const session = await cacheService.get(keys[0]);
    if (session) {
      session.uploadedChunks = new Set(session.uploadedChunks || []);
    }
    return session;
  }

  async deleteUploadSession(uploadId) {
    const keys = (await cacheService.keys(`upload_session:*:${uploadId}`)).map(stripCachePrefix);
    for (const key of keys) {
      await cacheService.delete(key);
    }
  }

  sanitizeFilename(name) {
    const base = basename(name || '');
    return base.replace(/[\u0000-\u001F<>:"/\\|?*]+/g, '').trim() || 'unnamed';
  }

  async getUniquePath(dir, desiredName) {
    const ext = extname(desiredName);
    const baseName = basename(desiredName, ext);
    let candidate = desiredName;
    let counter = 1;

    while (await this.pathExists(join(dir, candidate))) {
      candidate = `${baseName} (${counter++})${ext}`;
    }

    return join(dir, candidate);
  }

  async pathExists(path) {
    try {
      await fsp.access(path);
      return true;
    } catch {
      return false;
    }
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

export default new ChunkedUploadController();