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