// controllers/uploadController.js
import multer from 'multer';
import { resolve, relative } from 'path';
import { mkdirSync, existsSync } from 'fs';
import { ValidationError } from '../utils/errors.js';
import { ensureUserUploadDir } from './fileController.js';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userDir = ensureUserUploadDir(req.user.userId);
    
    // Get path from form fields (if available) or default to root
    let uploadPath = '/';
    if (req.body && req.body.path) {
      uploadPath = req.body.path;
    }
    
    // Remove leading slashes and resolve target path
    const cleanPath = uploadPath.replace(/^\/+/, '');
    const targetPath = cleanPath ? resolve(userDir, cleanPath) : userDir;
    
    // Security check - ensure path is within user directory
    if (relative(userDir, targetPath).startsWith('..')) {
      return cb(new ValidationError('Invalid upload path'), null);
    }
    
    // Ensure target directory exists
    if (!existsSync(targetPath)) {
      mkdirSync(targetPath, { recursive: true });
    }
    
    cb(null, targetPath);
  },
  filename: (req, file, cb) => {
    // Use original filename instead of UUID
    cb(null, file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  // Block only dangerous file types, allow most others
  const blockedTypes = [
    'application/x-executable',
    'application/x-msdownload',
    'application/x-msdos-program',
    'application/x-msi',
    'application/x-bat',
    'application/x-sh'
  ];

  const blockedExtensions = ['.exe', '.bat', '.cmd', '.com', '.scr', '.vbs', '.js', '.jar'];
  const fileExtension = file.originalname.toLowerCase().split('.').pop();

  if (blockedTypes.includes(file.mimetype) || 
      blockedExtensions.includes('.' + fileExtension)) {
    cb(new ValidationError('File type not allowed for security reasons'), false);
  } else {
    cb(null, true);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

export async function uploadFile(req, res, next) {
  try {
    if (!req.files || req.files.length === 0) {
      throw new ValidationError('No files uploaded');
    }

    const uploadedFiles = [];
    const userDir = ensureUserUploadDir(req.user.userId);
    
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