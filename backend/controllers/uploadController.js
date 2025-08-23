// controllers/uploadController.js
import multer from 'multer';
import { relative, basename, join } from 'path';
import { secureResolve, sanitizeUploadPath } from '../utils/pathSecurity.js';
import { promises as fsp } from 'fs';
import { ValidationError } from '../utils/errors.js';
import { ensureUserUploadDir } from './fileController.js';
import { fileFilter } from '../utils/fileValidation.js';

// Conflict-safe naming helpers
const pathExists = async (p) => {
  try { await fsp.access(p); return true; } catch { return false; }
};
/**
 * Returns a unique absolute path inside `dir` by appending " (1)", "(2)", ... before the extension if needed.
 */
const getUniquePath = async (dir, desiredName) => {
  const idx = desiredName.lastIndexOf('.');
  const hasExt = idx > 0 && desiredName.indexOf('.') !== 0; // ignore dotfiles
  const base = hasExt ? desiredName.slice(0, idx) : desiredName;
  const ext = hasExt ? desiredName.slice(idx) : '';
  let candidate = desiredName;
  let i = 1;
  while (await pathExists(join(dir, candidate))) {
    candidate = `${base} (${i++})${ext}`;
  }
  return join(dir, candidate);
};

// Basic filename sanitizer to prevent path tricks and control chars
const sanitizeFilename = (name) => {
  const base = basename(name || '');
  // drop control chars and reserved characters on Windows/POSIX
  return base.replace(/[\u0000-\u001F<>:"/\\|?*]+/g, '').trim() || 'unnamed';
};

// Configure multer for file uploads with async operations
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    (async () => {
      try {
        if (!req.user?.userId) {
          return cb(new ValidationError('Missing authenticated user'), null);
        }
        const userDir = await ensureUserUploadDir(req.user.userId);

        // Get path from form fields (if available) or default to root
        let uploadPath = '/';
        if (req.body && req.body.path) {
          uploadPath = req.body.path;
        }

        // Secure path resolution
        let targetPath;
        try {
          const sanitizedPath = sanitizeUploadPath(uploadPath);
          targetPath = secureResolve(userDir, sanitizedPath);
        } catch (error) {
          return cb(new ValidationError('Invalid upload path: ' + error.message), null);
        }

        // Ensure target directory exists
        try {
          await fsp.access(targetPath);
        } catch {
          await fsp.mkdir(targetPath, { recursive: true });
        }

        cb(null, targetPath);
      } catch (error) {
        cb(error, null);
      }
    })();
  },
  filename: (req, file, cb) => {
    (async () => {
      try {
        const safeName = sanitizeFilename(file.originalname);
        if (!req.user?.userId) {
          return cb(new ValidationError('Missing authenticated user'), null);
        }
        const userDir = await ensureUserUploadDir(req.user.userId);
        const uploadPath = req.body?.path || '/';

        let targetPath;
        try {
          const sanitizedPath = sanitizeUploadPath(uploadPath);
          targetPath = secureResolve(userDir, sanitizedPath);
        } catch (err) {
          return cb(new ValidationError('Invalid upload path: ' + err.message), null);
        }

        await fsp.mkdir(targetPath, { recursive: true });
        const uniquePath = await getUniquePath(targetPath, safeName);
        cb(null, basename(uniquePath));
      } catch (e) {
        cb(e, null);
      }
    })();
  }
});

// Custom middleware to handle upload with dynamic path
export const handleUploadWithPath = async (req, res, next) => {
  let uploadPath = '/'; // Default path
  let uploadedFiles = [];

  // Using centralized file filter

  // Parse form data manually
  const form = multer({
    storage: multer.memoryStorage(),
    fileFilter,
    limits: {
      // 512MB per file by default; adjust if needed in env
      fileSize: Number(process.env.UPLOAD_MAX_FILESIZE_BYTES || 512 * 1024 * 1024),
      files: Number(process.env.UPLOAD_MAX_FILES || 50)
    }
  });

  form.any()(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    // Extract path from form data
    uploadPath = req.body.path || '/';
    const userDir = await ensureUserUploadDir(req.user.userId);
    
    // Secure path resolution
    let targetPath;
    try {
      const sanitizedPath = sanitizeUploadPath(uploadPath);
      targetPath = secureResolve(userDir, sanitizedPath);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid upload path: ' + error.message });
    }
    
    // Ensure target directory exists
    try {
      await fsp.access(targetPath);
    } catch {
      await fsp.mkdir(targetPath, { recursive: true });
    }

    // Process files and save them to the correct directory
    const processFiles = async () => {
      try {
        const files = req.files || [];
        uploadedFiles = [];

        for (const file of files) {
          if (file.fieldname === 'files' || file.fieldname === 'files[]') {
            const safeName = sanitizeFilename(file.originalname);
            // Ensure parent directory still exists (race-safe)
            try {
              await fsp.mkdir(targetPath, { recursive: true });
            } catch {}

            // Choose a conflict-safe path and write file
            const uniquePath = await getUniquePath(targetPath, safeName);
            await fsp.writeFile(uniquePath, file.buffer);
            const finalName = basename(uniquePath);

            const relativePath = relative(userDir, uniquePath).replace(/\\/g, '/');
            uploadedFiles.push({
              name: finalName,
              path: relativePath,
              size: file.size,
              mime_type: file.mimetype,
              uploaded_at: new Date().toISOString()
            });

            // Invalidate cache immediately after file creation
            if (req.user?.userId) {
              const { FileCache } = await import('../utils/cache.js');
              await FileCache.invalidateUserFiles(req.user.userId);
              const parentPath = ('/' + relativePath).replace(/\/[^/]*$/, '/').replace(/\/+$/, '/') || '/';
              await FileCache.invalidateFilePath(req.user.userId, parentPath);
            }
          }
        }

        // Set processed files for the uploadFile controller
        req.files = uploadedFiles.map((file) => ({
          originalname: file.name,
          path: secureResolve(userDir, file.path),
          size: file.size,
          mimetype: file.mime_type || 'application/octet-stream'
        }));

        next();
      } catch (e) {
        res.status(500).json({ error: 'Failed to process files', details: e?.message || String(e) });
      }
    };

    await processFiles();
  });
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: Number(process.env.UPLOAD_MAX_FILESIZE_BYTES || 512 * 1024 * 1024),
    files: Number(process.env.UPLOAD_MAX_FILES || 50)
  }
});

export async function uploadFile(req, res, next) {
  try {
    if (!req.files || req.files.length === 0) {
      throw new ValidationError('No files uploaded');
    }

    const uploadedFiles = [];
    const userDir = await ensureUserUploadDir(req.user.userId);
    
    for (const file of req.files) {
      const relativePath = relative(userDir, file.path).replace(/\\/g, '/');

      const fileInfo = {
        name: file.originalname,
        path: relativePath,
        size: file.size,
        mime_type: file.mimetype,
        uploaded_at: new Date().toISOString()
      };

      uploadedFiles.push(fileInfo);

      // Broadcast file creation via WebSocket
      if (global.wsManager) {
        const createdPath = '/' + relativePath.replace(/^\/+/, '');
        const parentPath = createdPath.replace(/\/[^/]*$/, '/').replace(/\/+$/, '/') || '/';

        global.wsManager.broadcastFileCreated({
          name: file.originalname,
          path: createdPath,
          type: 'file',
          size: file.size,
          modified: new Date().toISOString()
        });

        // Also broadcast folder change
        global.wsManager.broadcastFolderChanged(parentPath);
      }
    }

    res.status(201).json({
      success: true,
      data: uploadedFiles
    });
  } catch (error) {
    next(error);
  }
}