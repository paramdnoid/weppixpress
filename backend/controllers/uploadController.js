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

// Custom middleware to handle upload with dynamic path
export const handleUploadWithPath = (req, res, next) => {
  let uploadPath = '/'; // Default path
  let uploadedFiles = [];

  const fileFilter = (req, file, cb) => {
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

  // Parse form data manually
  const form = multer({
    storage: multer.memoryStorage(),
    fileFilter
  });

  form.any()(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    // Extract path from form data
    uploadPath = req.body.path || '/';
    const userDir = ensureUserUploadDir(req.user.userId);
    
    // Remove leading slashes and resolve target path
    const cleanPath = uploadPath.replace(/^\/+/, '');
    const targetPath = cleanPath ? resolve(userDir, cleanPath) : userDir;
    
    // Security check - ensure path is within user directory
    if (relative(userDir, targetPath).startsWith('..')) {
      return res.status(400).json({ error: 'Invalid upload path' });
    }
    
    // Ensure target directory exists
    if (!existsSync(targetPath)) {
      mkdirSync(targetPath, { recursive: true });
    }

    // Process files and save them to the correct directory
    const processFiles = async () => {
      try {
        const files = req.files || [];
        uploadedFiles = [];

        for (const file of files) {
          if (file.fieldname === 'files') {
            const filePath = resolve(targetPath, file.originalname);
            
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
        }

        // Set processed files for the uploadFile controller
        req.files = uploadedFiles.map(file => ({
          originalname: file.name,
          path: resolve(userDir, file.path),
          size: file.size,
          mimetype: file.mime_type
        }));

        next();
      } catch {
        res.status(500).json({ error: 'Failed to process files' });
      }
    };

    processFiles();
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