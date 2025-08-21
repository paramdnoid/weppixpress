import { promises as fsp, existsSync, mkdirSync } from 'fs';
import { dirname, resolve as _resolve, join, relative } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { filesize } from 'filesize';
import dotenv from 'dotenv';

import { createLogger, transports, format } from 'winston';

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp(),
    format.printf(({ timestamp, level, message, ...meta }) =>
      `${timestamp} [${level.toUpperCase()}]: ${message}${
        Object.keys(meta).length ? ' ' + JSON.stringify(meta) : ''
      }`
    )
  ),
  transports: [new transports.Console()]
});

dotenv.config();

const baseDir = _resolve(process.env.UPLOAD_DIR || join(__dirname, '../..', 'uploads'));

/**
 * Non-recursively reads a file system item and returns its metadata (flat listing only).
 * @param {import('fs').Dirent} item - Directory entry.
 * @param {string} targetPath - Absolute path to the entry.
 * @param {string} baseDirUser - User's base upload directory.
 * @returns {Promise<Object|undefined>} Metadata object or undefined on error.
 */
async function readItem(item, targetPath, baseDirUser) {
  const fullPath = join(targetPath, item.name);
  try {
    const stats = await fsp.stat(fullPath);
    const isFile = item.isFile();
    let hasSubfolder = false;
    
    // Only check if directory has subfolders, don't read them
    if (item.isDirectory()) {
      try {
        const subItems = await fsp.readdir(fullPath, { withFileTypes: true });
        hasSubfolder = subItems.some(subItem => subItem.isDirectory());
      } catch (error) {
        logger.debug(`Failed to check subfolders in ${fullPath}: ${error.message}`);
      }
    }

    const sizeInBytes = isFile
      ? stats.size
      : await getFolderSize(fullPath);
    
    return {
      name: item.name,
      path: relative(baseDirUser, fullPath),
      type: item.isDirectory() ? 'folder' : 'file',
      size: sizeInBytes,
      sizeFormatted: filesize(sizeInBytes),
      extension: isFile ? item.name.split('.').pop() || '' : undefined,
      mimeType: undefined, // TODO: Add mime type detection if needed
      created: stats.birthtime.toISOString(),
      modified: stats.mtime.toISOString(),
      accessed: stats.atime.toISOString(),
      hasSubfolders: hasSubfolder,
      itemCount: undefined, // TODO: Add item count for folders if needed
      hasThumbnail: false,
      thumbnailId: undefined,
      permissions: {
        read: true,
        write: true,
        delete: true,
        share: true
      }
    };
  } catch (error) {
    logger.debug(`Failed to read item at ${fullPath}: ${error.message}`);
  }
}

/**
 * Recursively calculates the total size of a folder (in bytes).
 * Note: This function remains recursive as it's needed for accurate folder size calculation.
 * @param {string} folderPath - Absolute path to the folder.
 * @returns {Promise<number>} Total size in bytes.
 */
async function getFolderSize(folderPath) {
  let totalSize = 0;
  try {
    const entries = await fsp.readdir(folderPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(folderPath, entry.name);
      if (entry.isDirectory()) {
        totalSize += await getFolderSize(fullPath);
      } else if (entry.isFile()) {
        const stats = await fsp.stat(fullPath);
        totalSize += stats.size;
      }
    }
  } catch (error) {
    logger.debug(`Error reading folder size at ${folderPath}: ${error.message}`);
  }
  return totalSize;
}

/**
 * Express handler: retrieves the list of files/folders for a user path (non-recursive).
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function getFolderFiles(req, res) {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized: Missing user ID' });
  }
  const baseDirUser = ensureUserUploadDir(userId);
  const relativePath = (req.query.path || '').replace(/^\/+/, '');
  const targetPath = _resolve(baseDirUser, relativePath);
  if (relative(baseDirUser, targetPath).startsWith('..')) {
    return res.status(400).json({ error: 'Invalid path' });
  }

  try {
    await fsp.access(targetPath);
  } catch {
    return res.json({
      items: [],
      pagination: {
        page: 1,
        limit: 0,
        totalItems: 0,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      }
    });
  }

  try {
    const entries = await fsp.readdir(targetPath, { withFileTypes: true });

    logger.info(`Listing ${entries.length} items in ${targetPath} (non-recursive)`);
    const children = await Promise.all(
      entries.map(item => readItem(item, targetPath, baseDirUser))
    );

    const items = children.filter(Boolean);
    res.json({
      items,
      pagination: {
        page: 1,
        limit: items.length,
        totalItems: items.length,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      }
    });
  } catch (err) {
    logger.error(`Error fetching folder files: ${err.stack || err}`);
    res.status(500).json({ error: 'Failed to read directory' });
  }
}

/**
 * Ensures the upload directory for a user exists.
 * @param {string|number} userId - ID of the user.
 * @returns {string} Absolute path to the user's upload directory.
 */
export function ensureUserUploadDir(userId) {
  const userDir = join(baseDir, userId.toString());
  if (!existsSync(userDir)) {
    mkdirSync(userDir, { recursive: true });
  }
  return userDir;
}

/**
 * Express handler: Delete files/folders
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function deleteFiles(req, res, next) {
  try {
    const { paths } = req.body;
    const userId = req.user.userId;
    const baseDirUser = ensureUserUploadDir(userId);

    if (!Array.isArray(paths)) {
      return res.status(400).json({ error: 'Paths must be an array' });
    }

    const deletedItems = [];
    for (const relativePath of paths) {
      const fullPath = _resolve(baseDirUser, relativePath.replace(/^\/+/, ''));
      
      if (!fullPath.startsWith(baseDirUser)) {
        return res.status(400).json({ error: 'Invalid path' });
      }

      try {
        const stats = await fsp.stat(fullPath);
        if (stats.isDirectory()) {
          await fsp.rmdir(fullPath, { recursive: true });
        } else {
          await fsp.unlink(fullPath);
        }
        deletedItems.push(relativePath);

        if (global.wsManager) {
          global.wsManager.broadcastFileDeleted(relativePath);
        }
      } catch (error) {
        logger.error(`Failed to delete ${fullPath}:`, error);
      }
    }

    res.json({ success: true, deleted: deletedItems });
  } catch (error) {
    next(error);
  }
}

/**
 * Express handler: Move files/folders
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function moveFiles(req, res, next) {
  try {
    const { paths, destination } = req.body;
    const userId = req.user.userId;
    const baseDirUser = ensureUserUploadDir(userId);

    const destPath = _resolve(baseDirUser, destination.replace(/^\/+/, ''));
    
    if (!destPath.startsWith(baseDirUser)) {
      return res.status(400).json({ error: 'Invalid destination' });
    }

    await fsp.mkdir(destPath, { recursive: true });

    const movedItems = [];
    for (const sourcePath of paths) {
      const fullSourcePath = _resolve(baseDirUser, sourcePath.replace(/^\/+/, ''));
      const fileName = sourcePath.split('/').pop();
      const fullDestPath = join(destPath, fileName);

      try {
        await fsp.rename(fullSourcePath, fullDestPath);
        movedItems.push({ from: sourcePath, to: join(destination, fileName) });

        if (global.wsManager) {
          global.wsManager.broadcastFileDeleted(sourcePath);
          global.wsManager.broadcastFileCreated({
            name: fileName,
            path: join(destination, fileName),
            type: 'file'
          });
        }
      } catch (error) {
        logger.error(`Failed to move ${fullSourcePath}:`, error);
      }
    }

    res.json({ success: true, moved: movedItems });
  } catch (error) {
    next(error);
  }
}

/**
 * Express handler: Create folder
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function createFolder(req, res, next) {
  try {
    const { name, path = '' } = req.body;
    const userId = req.user.userId;
    const baseDirUser = ensureUserUploadDir(userId);

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Folder name is required' });
    }

    const safeName = name.replace(/[<>:"|?*\x00-\x1F]/g, '').trim();
    if (!safeName) {
      return res.status(400).json({ error: 'Invalid folder name' });
    }

    const targetDir = _resolve(baseDirUser, path.replace(/^\/+/, ''));
    const newFolderPath = join(targetDir, safeName);

    if (!newFolderPath.startsWith(baseDirUser)) {
      return res.status(400).json({ error: 'Invalid path' });
    }

    await fsp.mkdir(newFolderPath, { recursive: true });

    const folderInfo = {
      name: safeName,
      path: join(path, safeName).replace(/\\/g, '/'),
      type: 'folder',
      created: new Date().toISOString()
    };

    if (global.wsManager) {
      global.wsManager.broadcastFileCreated(folderInfo);
    }

    res.status(201).json({ success: true, folder: folderInfo });
  } catch (error) {
    next(error);
  }
}

/**
 * Express handler: Rename item
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function renameItem(req, res, next) {
  try {
    const { oldPath, newName } = req.body;
    const userId = req.user.userId;
    const baseDirUser = ensureUserUploadDir(userId);

    const fullOldPath = _resolve(baseDirUser, oldPath.replace(/^\/+/, ''));
    const parentDir = dirname(fullOldPath);
    const fullNewPath = join(parentDir, newName);

    if (!fullOldPath.startsWith(baseDirUser) || !fullNewPath.startsWith(baseDirUser)) {
      return res.status(400).json({ error: 'Invalid path' });
    }

    await fsp.rename(fullOldPath, fullNewPath);

    const newRelativePath = join(dirname(oldPath), newName).replace(/\\/g, '/');
    
    if (global.wsManager) {
      global.wsManager.broadcastFileDeleted(oldPath);
      global.wsManager.broadcastFileCreated({
        name: newName,
        path: newRelativePath,
        type: 'file'
      });
    }

    res.json({ 
      success: true, 
      renamed: { from: oldPath, to: newRelativePath }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Express handler: Copy files/folders
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function copyFiles(req, res, next) {
  try {
    const { paths, destination } = req.body;
    const userId = req.user.userId;
    const baseDirUser = ensureUserUploadDir(userId);
    const destPath = _resolve(baseDirUser, destination.replace(/^\/+/, ''));
    
    if (!destPath.startsWith(baseDirUser)) {
      return res.status(400).json({ error: 'Invalid destination' });
    }
    
    await fsp.mkdir(destPath, { recursive: true });
    const copiedItems = [];
    
    for (const sourcePath of paths) {
      const fullSourcePath = _resolve(baseDirUser, sourcePath.replace(/^\/+/, ''));
      const fileName = sourcePath.split('/').pop();
      const fullDestPath = join(destPath, fileName);
      
      try {
        // Check if source exists
        const stats = await fsp.stat(fullSourcePath);
        
        if (stats.isDirectory()) {
          // Copy directory recursively
          await copyDirectoryRecursive(fullSourcePath, fullDestPath);
        } else {
          // Copy file
          await fsp.copyFile(fullSourcePath, fullDestPath);
        }
        
        const destRelativePath = join(destination, fileName).replace(/\\/g, '/');
        copiedItems.push({ from: sourcePath, to: destRelativePath });
        
        // Broadcast file created event
        if (global.wsManager) {
          global.wsManager.broadcastFileCreated({
            name: fileName,
            path: destRelativePath,
            type: stats.isDirectory() ? 'folder' : 'file'
          });
        }
      } catch (error) {
        logger.error(`Failed to copy ${fullSourcePath}:`, error);
      }
    }
    
    res.json({ success: true, copied: copiedItems });
  } catch (error) {
    next(error);
  }
}

// Helper function to copy directories recursively
async function copyDirectoryRecursive(source, destination) {
  await fsp.mkdir(destination, { recursive: true });
  const entries = await fsp.readdir(source, { withFileTypes: true });
  
  for (const entry of entries) {
    const sourcePath = join(source, entry.name);
    const destPath = join(destination, entry.name);
    
    if (entry.isDirectory()) {
      await copyDirectoryRecursive(sourcePath, destPath);
    } else {
      await fsp.copyFile(sourcePath, destPath);
    }
  }
}