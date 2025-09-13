import { join, dirname } from 'path';
import fs from 'fs/promises';
import { secureResolve, getUserDirectory, sanitizeUploadPath } from '../../shared/utils/pathSecurity.js';

/**
 * Upload Service
 * Handles file upload operations with security
 */
class UploadService {
  constructor() {
    this.uploadBaseDir = process.env.UPLOAD_DIR || './uploads';
  }

  /**
   * Get user's upload directory
   * @param {string} userId
   * @returns {string}
   */
  getUserUploadDir(userId) {
    return getUserDirectory(userId, this.uploadBaseDir);
  }

  /**
   * Create upload session directory
   * @param {string} userId
   * @param {string} targetPath
   * @returns {Promise<string>}
   */
  async createSessionDirectory(userId, targetPath) {
    const userDir = this.getUserUploadDir(userId);
    const sanitized = sanitizeUploadPath(targetPath);
    const targetDir = sanitized ? secureResolve(userDir, sanitized) : userDir;

    await fs.mkdir(targetDir, { recursive: true });
    return targetDir;
  }

  /**
   * Write file chunk
   * @param {string} filePath
   * @param {Buffer} chunk
   * @param {number} _offset - Reserved for future resumable upload implementation
   */
  async writeChunk(filePath, chunk, _offset) {
    // Ensure directory exists
    await fs.mkdir(dirname(filePath), { recursive: true });

    // For resumable uploads, we need to write at specific offset
    // For now, we'll append (offset handling can be added later for true resumable uploads)
    await fs.appendFile(filePath, chunk);
  }

  /**
   * Get file stats
   * @param {string} filePath
   * @returns {Promise<{size: number, exists: boolean}>}
   */
  async getFileStats(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return {
        size: stats.size,
        exists: true
      };
    } catch (error) {
      if (error.code === 'ENOENT') {
        return {
          size: 0,
          exists: false
        };
      }
      throw error;
    }
  }

  /**
   * Create full file path for upload
   * @param {string} userId
   * @param {string} targetPath
   * @param {string} fileName
   * @returns {string}
   */
  createFilePath(userId, targetPath, fileName) {
    const userDir = this.getUserUploadDir(userId);
    const sanitized = sanitizeUploadPath(targetPath);
    const targetDir = sanitized ? secureResolve(userDir, sanitized) : userDir;

    return join(targetDir, fileName);
  }

  /**
   * Cleanup incomplete uploads
   * @param {string} _sessionId
   */
  async cleanupSession(_sessionId) {
    // In a real implementation, this would clean up temporary files
    // For now, we'll leave files in place for resume capability
  }
}

export default new UploadService();