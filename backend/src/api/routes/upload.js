import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { join, dirname } from 'path';
import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import { authenticateToken } from '../middleware/authenticate.js';
import { secureResolve, getUserDirectory, sanitizeUploadPath } from '../../shared/utils/pathSecurity.js';

const router = express.Router();

// In-memory session storage (in production, use Redis or database)
const sessions = new Map();
const files = new Map();

// Apply authentication to all upload routes
router.use(authenticateToken);

// Get upload base directory from environment
const getUploadBaseDir = () => {
  return process.env.UPLOAD_BASE_DIR || '../uploads';
};

// Create upload session
router.post('/sessions', async (req, res) => {
  try {
    const { targetPath } = req.body;
    const userId = req.user.id;

    if (!targetPath && targetPath !== '') {
      return res.status(400).json({
        success: false,
        error: { message: 'Target path is required', code: 'INVALID_REQUEST' }
      });
    }

    // Get user's upload directory
    const baseDir = getUserDirectory(userId, getUploadBaseDir());

    // Sanitize the target path
    const sanitized = sanitizeUploadPath(targetPath);

    console.log('createSession debug', {
      userId,
      baseDir,
      targetPath,
      sanitized,
      timestamp: new Date().toISOString()
    });

    // Create session
    const sessionId = uuidv4();
    const session = {
      id: sessionId,
      userId,
      targetPath: targetPath,
      targetRelative: sanitized,
      createdAt: Date.now(),
      status: 'active',
      files: new Map()
    };

    sessions.set(sessionId, session);

    res.status(201).json({
      id: sessionId,
      status: 'active',
      targetRelative: sanitized
    });

  } catch (error) {
    console.error('Upload session creation failed:', error);
    res.status(400).json({
      success: false,
      error: { message: error.message, code: 'INVALID_REQUEST' }
    });
  }
});

// List upload sessions
router.get('/sessions', async (req, res) => {
  try {
    const userId = req.user.id;
    const userSessions = Array.from(sessions.values())
      .filter(s => s.userId === userId)
      .map(s => ({
        id: s.id,
        status: s.status,
        createdAt: s.createdAt,
        targetRelative: s.targetRelative
      }));

    res.json({ sessions: userSessions });
  } catch (error) {
    console.error('List sessions failed:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message, code: 'INTERNAL_ERROR' }
    });
  }
});

// Register files in session
router.post('/sessions/:sessionId/files', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { files: fileList } = req.body;
    const userId = req.user.id;

    console.log('File registration request:', {
      sessionId,
      userId,
      bodyKeys: Object.keys(req.body),
      fileListType: typeof fileList,
      fileListLength: Array.isArray(fileList) ? fileList.length : 'not array',
      fileList: Array.isArray(fileList) ? fileList.slice(0, 3) : fileList
    });

    const session = sessions.get(sessionId);
    if (!session || session.userId !== userId) {
      return res.status(404).json({
        error: 'Session not found'
      });
    }

    if (!Array.isArray(fileList)) {
      return res.status(400).json({
        error: 'Files array is required'
      });
    }

    const registeredFiles = [];
    for (const fileInfo of fileList) {
      const fileId = uuidv4();
      const file = {
        id: fileId,
        sessionId,
        path: fileInfo.path,
        size: fileInfo.size || 0,
        received: 0,
        status: 'pending',
        createdAt: Date.now()
      };

      files.set(fileId, file);
      session.files.set(fileId, file);

      registeredFiles.push({
        fileId,
        path: fileInfo.path
      });
    }

    res.json({ files: registeredFiles });

  } catch (error) {
    console.error('File registration failed:', error);
    res.status(400).json({
      error: error.message
    });
  }
});

// Get session status
router.get('/sessions/:sessionId/status', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    const session = sessions.get(sessionId);
    if (!session || session.userId !== userId) {
      return res.status(404).json({
        success: false,
        error: { message: 'Session not found', code: 'NOT_FOUND' }
      });
    }

    res.json({
      id: session.id,
      status: session.status,
      createdAt: session.createdAt,
      targetRelative: session.targetRelative
    });

  } catch (error) {
    console.error('Get session status failed:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message, code: 'INTERNAL_ERROR' }
    });
  }
});

// List files in session
router.get('/sessions/:sessionId/files', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    const session = sessions.get(sessionId);
    if (!session || session.userId !== userId) {
      return res.status(404).json({
        success: false,
        error: { message: 'Session not found', code: 'NOT_FOUND' }
      });
    }

    const fileList = Array.from(session.files.values()).map(f => ({
      id: f.id,
      path: f.path,
      size: f.size,
      received: f.received,
      status: f.status
    }));

    res.json({ files: fileList });

  } catch (error) {
    console.error('List session files failed:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message, code: 'INTERNAL_ERROR' }
    });
  }
});

// Get file upload offset
router.get('/sessions/:sessionId/files/:fileId/offset', async (req, res) => {
  try {
    const { sessionId, fileId } = req.params;
    const userId = req.user.id;

    const session = sessions.get(sessionId);
    if (!session || session.userId !== userId) {
      return res.status(404).json({
        success: false,
        error: { message: 'Session not found', code: 'NOT_FOUND' }
      });
    }

    const file = files.get(fileId);
    if (!file || file.sessionId !== sessionId) {
      return res.status(404).json({
        success: false,
        error: { message: 'File not found', code: 'NOT_FOUND' }
      });
    }

    res.json({
      received: file.received,
      size: file.size,
      status: file.status
    });

  } catch (error) {
    console.error('Get file offset failed:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message, code: 'INTERNAL_ERROR' }
    });
  }
});

// Upload file chunk
router.put('/sessions/:sessionId/files/:fileId/chunk', async (req, res) => {
  try {
    const { sessionId, fileId } = req.params;
    const { offset } = req.query;
    const userId = req.user.id;

    const session = sessions.get(sessionId);
    if (!session || session.userId !== userId) {
      return res.status(404).json({
        success: false,
        error: { message: 'Session not found', code: 'NOT_FOUND' }
      });
    }

    const file = files.get(fileId);
    if (!file || file.sessionId !== sessionId) {
      return res.status(404).json({
        success: false,
        error: { message: 'File not found', code: 'NOT_FOUND' }
      });
    }

    const chunkOffset = parseInt(offset) || 0;
    if (chunkOffset !== file.received) {
      return res.status(409).json({
        success: false,
        error: { message: `Expected offset ${file.received}, got ${chunkOffset}`, code: 'OFFSET_MISMATCH' }
      });
    }

    // Get user's upload directory and create target path
    const baseDir = getUserDirectory(userId, getUploadBaseDir());
    const sanitizedTarget = sanitizeUploadPath(session.targetRelative);
    const targetDir = sanitizedTarget ? secureResolve(baseDir, sanitizedTarget) : baseDir;

    // Create file path - handle relative paths in file.path
    let filePath;
    if (file.path.includes('/')) {
      // File has directory structure (from folder upload)
      const pathParts = file.path.split('/');
      const fileName = pathParts.pop();
      const subDir = pathParts.join('/');
      const fullSubDir = subDir ? secureResolve(targetDir, subDir) : targetDir;

      // Ensure subdirectory exists
      await fs.mkdir(fullSubDir, { recursive: true });
      filePath = join(fullSubDir, fileName);
    } else {
      // Simple file upload
      await fs.mkdir(targetDir, { recursive: true });
      filePath = join(targetDir, file.path);
    }

    // Write chunk to file
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', async () => {
      try {
        const buffer = Buffer.concat(chunks);

        // Append to file (create if doesn't exist)
        await fs.appendFile(filePath, buffer);

        file.received += buffer.length;
        file.status = file.received >= file.size ? 'completed' : 'uploading';

        res.json({
          received: file.received,
          completed: file.status === 'completed'
        });

      } catch (writeError) {
        console.error('Chunk write failed:', writeError);
        file.status = 'error';
        res.status(500).json({
          success: false,
          error: { message: 'Failed to write chunk', code: 'WRITE_ERROR' }
        });
      }
    });

  } catch (error) {
    console.error('Upload chunk failed:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message, code: 'INTERNAL_ERROR' }
    });
  }
});

// Complete file upload
router.post('/sessions/:sessionId/files/:fileId/complete', async (req, res) => {
  try {
    const { sessionId, fileId } = req.params;
    const userId = req.user.id;

    const session = sessions.get(sessionId);
    if (!session || session.userId !== userId) {
      return res.status(404).json({
        success: false,
        error: { message: 'Session not found', code: 'NOT_FOUND' }
      });
    }

    const file = files.get(fileId);
    if (!file || file.sessionId !== sessionId) {
      return res.status(404).json({
        success: false,
        error: { message: 'File not found', code: 'NOT_FOUND' }
      });
    }

    file.status = 'completed';

    res.json({
      file: {
        path: file.path
      }
    });

  } catch (error) {
    console.error('Complete file failed:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message, code: 'INTERNAL_ERROR' }
    });
  }
});

// Complete session
router.post('/sessions/:sessionId/complete', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { files: selectedFiles } = req.body;
    const userId = req.user.id;

    const session = sessions.get(sessionId);
    if (!session || session.userId !== userId) {
      return res.status(404).json({
        success: false,
        error: { message: 'Session not found', code: 'NOT_FOUND' }
      });
    }

    session.status = 'completed';

    const completedFiles = Array.from(session.files.values())
      .filter(f => !selectedFiles || selectedFiles.includes(f.id))
      .filter(f => f.status === 'completed');

    res.json({
      count: completedFiles.length,
      fileIds: completedFiles.map(f => f.id)
    });

  } catch (error) {
    console.error('Complete session failed:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message, code: 'INTERNAL_ERROR' }
    });
  }
});

// Pause session
router.post('/sessions/:sessionId/pause', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    const session = sessions.get(sessionId);
    if (!session || session.userId !== userId) {
      return res.status(404).json({
        success: false,
        error: { message: 'Session not found', code: 'NOT_FOUND' }
      });
    }

    session.status = 'paused';

    res.json({ status: 'paused' });

  } catch (error) {
    console.error('Pause session failed:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message, code: 'INTERNAL_ERROR' }
    });
  }
});

// Resume session
router.post('/sessions/:sessionId/resume', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    const session = sessions.get(sessionId);
    if (!session || session.userId !== userId) {
      return res.status(404).json({
        success: false,
        error: { message: 'Session not found', code: 'NOT_FOUND' }
      });
    }

    session.status = 'active';

    res.json({ status: 'active' });

  } catch (error) {
    console.error('Resume session failed:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message, code: 'INTERNAL_ERROR' }
    });
  }
});

// Abort file
router.delete('/sessions/:sessionId/files/:fileId', async (req, res) => {
  try {
    const { sessionId, fileId } = req.params;
    const userId = req.user.id;

    const session = sessions.get(sessionId);
    if (!session || session.userId !== userId) {
      return res.status(404).json({
        success: false,
        error: { message: 'Session not found', code: 'NOT_FOUND' }
      });
    }

    const file = files.get(fileId);
    if (file && file.sessionId === sessionId) {
      file.status = 'aborted';
      session.files.delete(fileId);
      files.delete(fileId);
    }

    res.json({ status: 'aborted' });

  } catch (error) {
    console.error('Abort file failed:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message, code: 'INTERNAL_ERROR' }
    });
  }
});

// Abort session
router.delete('/sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    const session = sessions.get(sessionId);
    if (!session || session.userId !== userId) {
      return res.status(404).json({
        success: false,
        error: { message: 'Session not found', code: 'NOT_FOUND' }
      });
    }

    // Cleanup files
    for (const fileId of session.files.keys()) {
      files.delete(fileId);
    }

    sessions.delete(sessionId);

    res.json({ status: 'aborted' });

  } catch (error) {
    console.error('Abort session failed:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message, code: 'INTERNAL_ERROR' }
    });
  }
});

export default router;