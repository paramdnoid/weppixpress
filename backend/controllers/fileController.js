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

    return {
      name: item.name,
      path: relative(baseDirUser, fullPath),
      type: item.isDirectory() ? 'folder' : 'file',
      size: isFile
        ? filesize(stats.size)
        : filesize(await getFolderSize(fullPath)), // This still calculates folder size recursively
      updated: stats.mtime.toISOString(),
      hasSubfolder: hasSubfolder,
      children: undefined // Never populate children in non-recursive mode
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
  let relativePath = (req.query.path || '').replace(/^\/+/, '');
  const targetPath = _resolve(baseDirUser, relativePath);
  if (relative(baseDirUser, targetPath).startsWith('..')) {
    return res.status(400).json({ error: 'Invalid path' });
  }

  try {
    await fsp.access(targetPath);
  } catch {
    return res.json({ children: [] });
  }

  try {
    const items = await fsp.readdir(targetPath, { withFileTypes: true });

    logger.info(`Listing ${items.length} items in ${targetPath} (non-recursive)`);
    const children = await Promise.all(
      items.map(item => readItem(item, targetPath, baseDirUser))
    );

    res.json({ children: children.filter(Boolean) });
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
function ensureUserUploadDir(userId) {
  const userDir = join(baseDir, userId.toString());
  if (!existsSync(userDir)) {
    mkdirSync(userDir, { recursive: true });
  }
  return userDir;
}