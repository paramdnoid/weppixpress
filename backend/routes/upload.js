// routes/upload.js
import express from 'express';
import multer from 'multer';
import { uploadFile } from '../controllers/uploadController.js';
import authenticate from '../middleware/authenticate.js';
import { resolve, relative } from 'path';
import { mkdirSync, existsSync } from 'fs';
import { ValidationError } from '../utils/errors.js';
import { ensureUserUploadDir } from '../controllers/fileController.js';

const router = express.Router();

// Custom middleware to handle upload with dynamic path
const handleUploadWithPath = (req, res, next) => {
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

/**
 * @swagger
 * /api/upload:
 *   post:
 *     summary: Upload a file
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: File uploaded successfully
 */
router.post('/', authenticate, handleUploadWithPath, uploadFile);

export default router;