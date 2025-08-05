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
 * Recursively reads a file system item and returns its metadata.
 * @param {import('fs').Dirent} item - Directory entry.
 * @param {string} targetPath - Absolute path to the entry.
 * @param {string} baseDirUser - User's base upload directory.
 * @returns {Promise<Object|undefined>} Metadata object or undefined on error.
 */
async function readItemRecursively(item, targetPath, baseDirUser) {
  const fullPath = join(targetPath, item.name);
  try {
    const stats = await fsp.stat(fullPath);
    const isFile = item.isFile();
    let children;
    if (item.isDirectory()) {
      const subItems = await fsp.readdir(fullPath, { withFileTypes: true });
      children = await Promise.all(
        subItems.map(subItem =>
          readItemRecursively(subItem, fullPath, baseDirUser)
        )
      );
    }

    return {
      name: item.name,
      path: relative(baseDirUser, fullPath),
      type: item.isDirectory() ? 'folder' : 'file',
      size: isFile
        ? filesize(stats.size)
        : filesize(await getFolderSize(fullPath)),
      updated: stats.mtime.toISOString(),
      hasSubfolder: item.isDirectory() ? children?.some(child => child.type === 'folder') ?? false : false,
      children: children?.filter(Boolean) ?? undefined
    };
  } catch (error) {
    logger.debug(`Failed to read item at ${fullPath}: ${error.message}`);
  }
}

/**
 * Recursively calculates the total size of a folder (in bytes).
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
 * Express handler: retrieves the list of files/folders for a user path.
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

    logger.info(`Listing ${items.length} items in ${targetPath}`);
    const children = await Promise.all(
      items.map(item =>
        readItemRecursively(item, targetPath, baseDirUser)
      )
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