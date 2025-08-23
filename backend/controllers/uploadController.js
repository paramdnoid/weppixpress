// controllers/uploadController.js
import multer from 'multer';
import { resolve, relative } from 'path';
import { secureResolve, sanitizeUploadPath } from '../utils/pathSecurity.js';
import { promises as fsp } from 'fs';
import { ValidationError } from '../utils/errors.js';
import { ensureUserUploadDir } from './fileController.js';
import { fileFilter } from '../utils/fileValidation.js';

// Configure multer for file uploads with async operations
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
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
  },
  filename: (req, file, cb) => {
    // Use original filename instead of UUID
    cb(null, file.originalname);
  }
});

// File filter removed - now using centralized fileFilter from utils

// Custom middleware to handle upload with dynamic path
export const handleUploadWithPath = async (req, res, next) => {
  let uploadPath = '/'; // Default path
  let uploadedFiles = [];

  // Using centralized file filter

  // Parse form data manually
  const form = multer({
    storage: multer.memoryStorage(),
    fileFilter
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
          if (file.fieldname === 'files') {
            const filePath = secureResolve(targetPath, file.originalname);
            
            // Write file to target directory
            const fs = await import('fs/promises');
            await fs.writeFile(filePath, file.buffer);
            
            const relativePath = relative(userDir, filePath);
            uploadedFiles.push({
              name: file.originalname,
              path: relativePath,
              size: file.size,
              mime_type: file.mimetype,
              uploaded_at: new Date().toISOString()
            });

            // Invalidate cache immediately after file creation
            if (req.user?.userId) {
              const { FileCache } = await import('../utils/cache.js');
              await FileCache.invalidateUserFiles(req.user.userId);
              const parentPath = '/' + relativePath.replace(/[^/]*$/, '').replace(/\/$/, '') || '/';
              await FileCache.invalidateFilePath(req.user.userId, parentPath);
            }
          }
        }

        // Set processed files for the uploadFile controller
        req.files = uploadedFiles.map(file => ({
          originalname: file.name,
          path: secureResolve(userDir, file.path),
          size: file.size,
          mimetype: file.mime_type
        }));

        next();
      } catch {
        res.status(500).json({ error: 'Failed to process files' });
      }
    };

    await processFiles();
  });
};

export const upload = multer({
  storage,
  fileFilter
});

export async function uploadFile(req, res, next) {
  try {
    if (!req.files || req.files.length === 0) {
      throw new ValidationError('No files uploaded');
    }

    const uploadedFiles = [];
    const userDir = await ensureUserUploadDir(req.user.userId);
    
    for (const file of req.files) {
      const relativePath = relative(userDir, file.path);
      
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
        const parentPath = '/' + relativePath.replace(/[^/]*$/, '').replace(/\/$/, '');
        global.wsManager.broadcastFileCreated({
          name: file.originalname,
          path: '/' + relativePath.replace(/\\/g, '/'),
          type: 'file',
          size: file.size,
          modified: new Date().toISOString()
        });
        
        // Also broadcast folder change
        global.wsManager.broadcastFolderChanged(parentPath || '/');
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