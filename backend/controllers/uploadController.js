
import { ValidationError } from '../utils/errors.js';
import { fileFilter } from '../utils/fileValidation.js';
import { sanitizeUploadPath, secureResolve } from '../utils/pathSecurity.js';
import { ensureUserUploadDir } from './fileController.js';
import { promises as fsp } from 'fs';
import multer from 'multer';
import { basename, join, relative } from 'path';

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

// Multer disk storage with secure path resolution
const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    (async () => {
      try {
        if (!req.user?.userId) {
          return cb(new ValidationError('Missing authenticated user'), null);
        }
        const userDir = await ensureUserUploadDir(req.user.userId);
        const uploadPath = req.body?.path || '/';

        let targetPath;
        try {
          const sanitizedPath = sanitizeUploadPath(uploadPath);
          targetPath = secureResolve(userDir, sanitizedPath);
        } catch (error) {
          return cb(new ValidationError('Invalid upload path: ' + error.message), null);
        }

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

const upload = multer({
  storage,
  fileFilter,
  limits: { files: Number(process.env.UPLOAD_MAX_FILES || 50) }
});

// Exported middleware to parse files before controller
export const uploadMiddleware = upload.fields([{ name: 'files' }, { name: 'files[]' }]);

export async function uploadFile(req, res, next) {
  try {
    const filesArr = [
      ...(req.files?.['files'] || []),
      ...(req.files?.['files[]'] || [])
    ];

    if (!filesArr || filesArr.length === 0) {
      throw new ValidationError('No files uploaded');
    }

    const uploadedFiles = [];
    const userDir = await ensureUserUploadDir(req.user.userId);

    for (const file of filesArr) {
      const rel = relative(userDir, file.path).replace(/\\/g, '/');

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
          const { FileCache } = await import('../utils/cache.js');
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
