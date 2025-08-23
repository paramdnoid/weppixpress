import { ValidationError } from '../utils/errors.js';
import { fileFilter } from '../utils/fileValidation.js';
import { sanitizeUploadPath, secureResolve } from '../utils/pathSecurity.js';
import { ensureUserUploadDir } from './fileController.js';
import cacheService from '../services/cacheService.js';
import { promises as fsp } from 'fs';
import multer from 'multer';
import { basename, join, relative } from 'path';

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

// helpers
const pathExists = async (p) => {
  try { await fsp.access(p); return true; } catch { return false; }
};

/**
 * Generate a unique file path inside a directory if the filename already exists
 */
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

const sanitizeFilename = (name) => {
  const base = basename(name || '');
  return base.replace(/[\u0000-\u001F<>:"/\\|?*]+/g, '').trim() || 'unnamed';
};

// Simple multer memory storage - we'll handle file writing in the controller
const storage = multer.memoryStorage();

const maxFileSize =
  Number(process.env.UPLOAD_MAX_FILESIZE_BYTES) ||
  (Number(process.env.UPLOAD_MAX_FILESIZE_GB || 5) * 1024 * 1024 * 1024); // default 5GB

const upload = multer({
  storage,
  fileFilter: fileFilter(), // Call the function to get the actual filter
  limits: {
    files: Number(process.env.UPLOAD_MAX_FILES || 200),
    fileSize: maxFileSize,
    fields: 2000
  }
});

// Exported middleware to parse files before controller
export const uploadMiddleware = upload.any();

export async function uploadFile(req, res, next) {
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