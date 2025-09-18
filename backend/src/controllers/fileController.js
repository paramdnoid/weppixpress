import { FileCache } from '../utils/fileCache.js';
import logger from '../utils/logger.js';
import { getUserDirectory, sanitizeUploadPath, secureResolve } from '../utils/pathSecurity.js';
import { getUniquePath, ensureDirectory } from '../utils/fileOperations.js';
import { sendErrorResponse, sendInternalServerError } from '../utils/httpResponses.js';
import { validateUserId } from '../utils/commonValidation.js';
import dotenv from 'dotenv';
import { filesize } from 'filesize';
import { promises as fsp } from 'fs';
import { resolve as _resolve, basename, dirname, join, relative } from 'path';
import websocketProvider from '../services/websocketProvider.js';
import { fileURLToPath } from 'url';
import archiver from 'archiver';

const __filename = fileURLToPath(import.meta.url);

// FileCache is now imported from shared utilities
const __dirname = dirname(__filename);

dotenv.config();

const baseDir = _resolve(process.env.UPLOAD_DIR || join(__dirname, '../..', 'uploads'));

// pathExists is now imported from fileOperations utility
// getUniquePath is now imported from fileOperations utility

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
    
    // Check if directory has subfolders without recursively reading them
    if (item.isDirectory()) {
      try {
        const subItems = await fsp.readdir(fullPath, { withFileTypes: true });
        hasSubfolder = subItems.some(subItem => subItem.isDirectory());
      } catch (error) {
        logger.debug(`Failed to check subfolders in ${fullPath}: ${error.message}`);
      }
    }

    let sizeInBytes;
    if (isFile) {
      sizeInBytes = stats.size;
    } else {
      const sizeResult = await getFolderSize(fullPath, { 
        maxDepth: 10, 
        maxFiles: 1000,
        timeout: 5000 // 5 seconds for folder size calculation
      });
      sizeInBytes = sizeResult.size;
      
      if (sizeResult.limitReached.timeout || sizeResult.limitReached.maxFiles) {
        logger.warn(`Folder size calculation limited for ${fullPath}:`, sizeResult.limitReached);
      }
    }
    
    return {
      name: item.name,
      path: relative(baseDirUser, fullPath).replace(/\\/g, '/'),
      type: item.isDirectory() ? 'folder' : 'file',
      size: sizeInBytes,
      sizeFormatted: filesize(sizeInBytes),
      extension: isFile ? item.name.split('.').pop() || '' : undefined,
      mimeType: undefined,
      created: stats.birthtime.toISOString(),
      modified: stats.mtime.toISOString(),
      accessed: stats.atime.toISOString(),
      hasSubfolders: hasSubfolder,
      itemCount: undefined,
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
 * Recursively calculates the total size of a folder (in bytes) with limits.
 * @param {string} folderPath - Absolute path to the folder.
 * @param {Object} options - Calculation options
 * @returns {Promise<Object>} Size calculation result
 */
async function getFolderSize(folderPath, options = {}) {
  const config = {
    maxDepth: options.maxDepth || 50,
    maxFiles: options.maxFiles || 10000,
    timeout: options.timeout || 30000, // 30 seconds
    ...options
  };

  let totalSize = 0;
  let fileCount = 0;
  let dirCount = 0;
  const errors = [];
  
  const startTime = Date.now();
  
  async function calculateSizeRecursive(path, depth = 0) {
    // Check depth limit
    if (depth >= config.maxDepth) {
      errors.push(`Max depth ${config.maxDepth} exceeded at: ${path}`);
      return 0;
    }

    // Check file count limit
    if (fileCount >= config.maxFiles) {
      errors.push(`Max file count ${config.maxFiles} exceeded`);
      return 0;
    }

    // Check timeout limit
    if (Date.now() - startTime >= config.timeout) {
      errors.push(`Timeout of ${config.timeout}ms exceeded`);
      return 0;
    }

    try {
      const entries = await fsp.readdir(path, { withFileTypes: true });
      let size = 0;
      let processedInBatch = 0;
      const batchSize = 50; // Process 50 entries at a time

      for (const entry of entries) {
        const fullPath = join(path, entry.name);
        
        if (entry.isDirectory()) {
          dirCount++;
          size += await calculateSizeRecursive(fullPath, depth + 1);
        } else if (entry.isFile()) {
          fileCount++;
          
          try {
            const stats = await fsp.stat(fullPath);
            size += stats.size;
          } catch (error) {
            logger.debug(`Error getting stats for file ${fullPath}: ${error.message}`);
            errors.push(`Cannot read file: ${fullPath}`);
          }
        }
        
        // Yield control to event loop every batchSize entries
        processedInBatch++;
        if (processedInBatch >= batchSize) {
          processedInBatch = 0;
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
      
      return size;
    } catch (error) {
      logger.debug(`Error reading folder at ${path}: ${error.message}`);
      errors.push(`Cannot read directory: ${path}`);
      return 0;
    }
  }

  totalSize = await calculateSizeRecursive(folderPath, 0);

  return {
    size: totalSize,
    fileCount,
    dirCount,
    errors,
    duration: Date.now() - startTime,
    limitReached: {
      maxDepth: errors.some(e => e.includes('Max depth')),
      maxFiles: errors.some(e => e.includes('Max file count')),
      timeout: errors.some(e => e.includes('Timeout'))
    }
  };
}

/**
 * Express handler: retrieves the list of files/folders for a user path (non-recursive).
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function getFolderFiles(req, res) {
  const userId = req.user?.userId;
  if (validateUserId(req, res)) {
    return;
  }

  const sanitizedPath = sanitizeUploadPath(req.query.path || '');
  const forceRefresh = req.query.forceRefresh === 'true' || req.query.refresh === 'true';
  
  // Try cache first (unless force refresh is requested)
  if (!forceRefresh) {
    const cached = await FileCache.getFileList(userId, sanitizedPath || '/');
    if (cached) {
      logger.debug(`Serving file list from cache for user ${userId}, path: ${sanitizedPath}`);
      return res.json(cached);
    }
  } else {
    logger.debug(`Force refresh requested for user ${userId}, path: ${sanitizedPath}`);
  }

  const baseDirUser = await ensureUserUploadDir(userId);
  
  let targetPath;
  try {
    targetPath = secureResolve(baseDirUser, sanitizedPath);
  } catch (error) {
    return sendErrorResponse(res, 400, 'Invalid path: ' + error.message);
  }

  try {
    await fsp.access(targetPath);
  } catch {
    const emptyResponse = {
      items: [],
      pagination: {
        page: 1,
        limit: 0,
        totalItems: 0,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      }
    };
    
    // Cache empty response briefly
    await FileCache.setFileList(userId, sanitizedPath || '/', emptyResponse);
    return res.json(emptyResponse);
  }

  try {
    const entries = await fsp.readdir(targetPath, { withFileTypes: true });

    logger.info(`Listing ${entries.length} items in ${targetPath} (non-recursive)`);
    const children = await Promise.all(
      entries.map(item => readItem(item, targetPath, baseDirUser))
    );

    const items = children
      .filter(Boolean)
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      });

    const response = {
      items,
      pagination: {
        page: 1,
        limit: items.length,
        totalItems: items.length,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      }
    };

    // Cache the response
    await FileCache.setFileList(userId, sanitizedPath || '/', response);
    
    res.json(response);
  } catch (err) {
    logger.error(`Error fetching folder files: ${err.stack || err}`);
    return sendInternalServerError(res, 'Failed to read directory', req);
  }
}

/**
 * Ensures the upload directory for a user exists.
 * @param {string|number} userId - ID of the user.
 * @returns {string} Absolute path to the user's upload directory.
 */
export async function ensureUserUploadDir(userId) {
  const userDir = getUserDirectory(userId, baseDir);
  return await ensureDirectory(userDir);
}

/**
 * Express handler: Delete files/folders
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function deleteFiles(req, res, next) {
  try {
    if (validateUserId(req, res)) {
      return;
    }

    const { paths } = req.body;
    const userId = req.user.userId;
    const baseDirUser = await ensureUserUploadDir(userId);

    if (!Array.isArray(paths)) {
      return sendErrorResponse(res, 400, 'Paths must be an array');
    }

    logger.info(`Delete request for user ${userId}: ${paths.length} paths`, { paths });

    const deletedItems = [];
    const errors = [];

    for (const relativePath of paths) {
      let fullPath;
      try {
        const sanitizedPath = sanitizeUploadPath(relativePath);
        fullPath = secureResolve(baseDirUser, sanitizedPath);
        logger.debug(`Processing deletion: ${relativePath} -> ${fullPath}`);
      } catch (error) {
        const errorMsg = `Invalid path for deletion: ${relativePath} - ${error.message}`;
        logger.warn(errorMsg, error);
        errors.push(errorMsg);
        continue;
      }

      try {
        // First check if file/folder exists
        const stats = await fsp.stat(fullPath);
        logger.debug(`Found ${stats.isDirectory() ? 'directory' : 'file'}: ${fullPath}`);

        if (stats.isDirectory()) {
          // Try to fix permissions before deletion
          try {
            await fsp.chmod(fullPath, 0o755);
          } catch (chmodError) {
            logger.debug(`Could not change permissions for ${fullPath}: ${chmodError.message}`);
          }
          await fsp.rm(fullPath, { recursive: true, force: true });
          logger.info(`Successfully deleted directory: ${fullPath}`);
        } else {
          // Try to fix permissions before deletion
          try {
            await fsp.chmod(fullPath, 0o644);
          } catch (chmodError) {
            logger.debug(`Could not change permissions for ${fullPath}: ${chmodError.message}`);
          }
          await fsp.unlink(fullPath);
          logger.info(`Successfully deleted file: ${fullPath}`);
        }

        deletedItems.push(relativePath);

        // Invalidate cache for user and parent directory
        await FileCache.invalidateUserFiles(userId);
        const parentDir = relativePath.split('/').slice(0, -1).join('/') || '/';
        await FileCache.invalidateFilePath(userId, parentDir);

        if (websocketProvider.isAvailable()) {
          const deletedPath = ('/' + relativePath).replace(/\/+/, '/');
          websocketProvider.broadcastFileDeleted(deletedPath);
        }
      } catch (error) {
        const errorMsg = `Failed to delete ${fullPath}: ${error.message}`;
        logger.error(errorMsg, {
          path: relativePath,
          fullPath,
          error: error.message,
          code: error.code
        });
        errors.push(errorMsg);
      }
    }

    logger.info(`Delete operation completed for user ${userId}: ${deletedItems.length}/${paths.length} successful`, {
      deleted: deletedItems,
      errors: errors.length > 0 ? errors : undefined
    });

    res.json({
      success: true,
      deleted: deletedItems,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    logger.error('Delete files operation failed:', error);
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
    const baseDirUser = await ensureUserUploadDir(userId);

    let destPath;
    try {
      const sanitizedDest = sanitizeUploadPath(destination);
      destPath = secureResolve(baseDirUser, sanitizedDest);
    } catch (error) {
      return sendErrorResponse(res, 400, 'Invalid destination path: ' + error.message);
    }

    await fsp.mkdir(destPath, { recursive: true });

    // Helper to test if child is subpath of parent
    const isSubPath = (parent, child) => {
      try {
        const rel = relative(parent, child);
        return rel && !rel.startsWith('..') && !rel.startsWith('/') && rel !== '';
      } catch {
        return false;
      }
    };

    const movedItems = [];
    for (const sourcePath of paths) {
      let fullSourcePath;
      try {
        const sanitizedSource = sanitizeUploadPath(sourcePath);
        fullSourcePath = secureResolve(baseDirUser, sanitizedSource);
      } catch (error) {
        logger.warn(`Invalid source path for move: ${sourcePath}`, error);
        continue;
      }
      
      const fileName = sourcePath.split('/').pop();
      let fullDestPath = join(destPath, fileName);

      try {
        const srcStats = await fsp.stat(fullSourcePath);
        if (srcStats.isDirectory()) {
          if (isSubPath(fullSourcePath, fullDestPath) || fullSourcePath === fullDestPath) {
            const base = fileName;
            let candidate = `${base} (moved)`;
            let candidatePath = join(destPath, candidate);
            let i = 2;
            const MAX_ATTEMPTS = 1000; // Prevent infinite loop
            while (i <= MAX_ATTEMPTS) {
              try {
                await fsp.access(candidatePath);
                candidate = `${base} (moved ${i++})`;
                candidatePath = join(destPath, candidate);
              }
              catch {
                break;
              }
            }
            if (i > MAX_ATTEMPTS) {
              throw new Error(`Unable to find unique filename after ${MAX_ATTEMPTS} attempts`);
            }
            fullDestPath = candidatePath;
          }
        }

        // Ensure conflict-safe final destination
        fullDestPath = await getUniquePath(dirname(fullDestPath), basename(fullDestPath));
        const finalName = basename(fullDestPath);

        await fsp.rename(fullSourcePath, fullDestPath);
        const destRel = join(destination, finalName).replace(/\\/g, '/');
        movedItems.push({ from: sourcePath, to: destRel });

        // Invalidate cache for user and affected directories
        await FileCache.invalidateUserFiles(userId);
        await FileCache.invalidateFilePath(userId, destination);
        const sourceParent = sourcePath.split('/').slice(0, -1).join('/') || '/';
        await FileCache.invalidateFilePath(userId, sourceParent);

        if (websocketProvider.isAvailable()) {
          const deletedPath = ('/' + sourcePath).replace(/\/+/, '/');
          const createdPath = ('/' + destRel).replace(/\/+/, '/');
          websocketProvider.broadcastFileDeleted(deletedPath);
          websocketProvider.broadcastFileCreated({
            name: finalName,
            path: createdPath,
            type: srcStats.isDirectory() ? 'folder' : 'file'
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
    const baseDirUser = await ensureUserUploadDir(userId);

    if (!name || typeof name !== 'string') {
      return sendErrorResponse(res, 400, 'Folder name is required');
    }

    const safeName = name.replace(/[<>:"|?*\\x00-\\x1F]/g, '').trim();
    if (!safeName) {
      return sendErrorResponse(res, 400, 'Invalid folder name');
    }

    let targetDir;
    try {
      const sanitizedPath = sanitizeUploadPath(path);
      targetDir = secureResolve(baseDirUser, sanitizedPath);
      
      logger.debug('Creating folder', { name, path, sanitizedPath, targetDir });
    } catch (error) {
      return sendErrorResponse(res, 400, 'Invalid path: ' + error.message);
    }
    
    // Generate a unique folder path to avoid conflicts
    const uniqueFolderPath = await getUniquePath(targetDir, safeName);
    await fsp.mkdir(uniqueFolderPath);

    const finalName = basename(uniqueFolderPath);
    const folderInfo = {
      name: finalName,
      path: join(path, finalName).replace(/\\/g, '/'),
      type: 'folder',
      created: new Date().toISOString()
    };

    // Invalidate cache
    await FileCache.invalidateUserFiles(userId);
    await FileCache.invalidateFilePath(userId, path || '/');

    if (websocketProvider.isAvailable()) {
      websocketProvider.broadcastFileCreated({
        ...folderInfo,
        path: ('/' + folderInfo.path).replace(/\/+/, '/'),
      });
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
    if (validateUserId(req, res)) {
      return;
    }

    const { oldPath, newName: rawNewName } = req.body;
    const safeNewName = String(rawNewName || '').replace(/[<>:"|?*\\x00-\\x1F]/g, '').trim();
    if (!safeNewName) {
      return sendErrorResponse(res, 400, 'Invalid new name');
    }

    const userId = req.user.userId;
    const baseDirUser = await ensureUserUploadDir(userId);

    let fullOldPath;
    try {
      const sanitizedOldPath = sanitizeUploadPath(oldPath);
      fullOldPath = secureResolve(baseDirUser, sanitizedOldPath);
    } catch (error) {
      return sendErrorResponse(res, 400, 'Invalid old path: ' + error.message);
    }
    
    const parentDirAbs = dirname(fullOldPath);
    const fullNewPath = await getUniquePath(parentDirAbs, safeNewName);
    const finalName = basename(fullNewPath);

    await fsp.rename(fullOldPath, fullNewPath);

    const newRelativePath = join(dirname(oldPath), finalName).replace(/\\/g, '/');
    
    // Invalidate cache for user and parent directory
    await FileCache.invalidateUserFiles(userId);
    const oldPathParentDir = dirname(oldPath) || '/';
    await FileCache.invalidateFilePath(userId, oldPathParentDir);

    let itemType = 'file';
    try {
      const st = await fsp.stat(fullNewPath);
      itemType = st.isDirectory() ? 'folder' : 'file';
    } catch {}

    if (websocketProvider.isAvailable()) {
      const deletedPath = ('/' + oldPath).replace(/\/+/, '/');
      const createdPath = ('/' + newRelativePath).replace(/\/+/, '/');
      websocketProvider.broadcastFileDeleted(deletedPath);
      websocketProvider.broadcastFileCreated({
        name: finalName,
        path: createdPath,
        type: itemType
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
    const baseDirUser = await ensureUserUploadDir(userId);
    
    let destPath;
    try {
      const sanitizedDest = sanitizeUploadPath(destination || '');
      destPath = secureResolve(baseDirUser, sanitizedDest);
    } catch (error) {
      return sendErrorResponse(res, 400, 'Invalid destination path: ' + error.message);
    }
    
    await fsp.mkdir(destPath, { recursive: true });
    const copiedItems = [];
    // Read optional limits from request or env, with sane clamps
    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
    const reqLimits = req.body?.limits || {};
    const limits = {
      maxDepth: clamp(Number.isFinite(+reqLimits.maxDepth) ? +reqLimits.maxDepth : (parseInt(process.env.COPY_MAX_DEPTH) || 50), 1, 500),
      maxFiles: clamp(Number.isFinite(+reqLimits.maxFiles) ? +reqLimits.maxFiles : (parseInt(process.env.COPY_MAX_FILES) || 5000), 1, 200000),
      timeout: clamp(Number.isFinite(+reqLimits.timeout) ? +reqLimits.timeout : (parseInt(process.env.COPY_TIMEOUT_MS) || 60000), 1000, 10 * 60 * 1000)
    };

    // Helper to test if child is subpath of parent
    const isSubPath = (parent, child) => {
      try {
        const rel = relative(parent, child);
        return rel && !rel.startsWith('..') && !rel.startsWith('/') && rel !== '';
      } catch {
        return false;
      }
    };
    
    for (const sourcePath of paths) {
      let fullSourcePath;
      try {
        const sanitizedSource = sanitizeUploadPath(sourcePath);
        fullSourcePath = secureResolve(baseDirUser, sanitizedSource);
      } catch (error) {
        logger.warn(`Invalid source path: ${sourcePath}`, error);
        continue;
      }
      
      const fileName = sourcePath.split('/').pop();
      let fullDestPath = join(destPath, fileName);
      
      try {
        // Check if source exists
        const stats = await fsp.stat(fullSourcePath);

        // Prevent self-nesting by generating a unique name if destination would be inside source
        if (stats.isDirectory()) {
          if (isSubPath(fullSourcePath, fullDestPath) || fullSourcePath === fullDestPath) {
            const base = fileName;
            let candidate = `${base} (copy)`;
            let candidatePath = join(destPath, candidate);
            let i = 2;
            const MAX_ATTEMPTS = 1000; // Prevent infinite loop
            while (i <= MAX_ATTEMPTS) {
              try {
                await fsp.access(candidatePath);
                candidate = `${base} (copy ${i++})`;
                candidatePath = join(destPath, candidate);
              }
              catch {
                break;
              }
            }
            if (i > MAX_ATTEMPTS) {
              throw new Error(`Unable to find unique filename after ${MAX_ATTEMPTS} attempts`);
            }
            logger.warn(`Adjusted destination to avoid self-nesting: ${fullDestPath} -> ${candidatePath}`);
            fullDestPath = candidatePath;
          }
        }
        
        let copyResult;
        if (stats.isDirectory()) {
          // Choose a conflict-safe destination folder name
          fullDestPath = await getUniquePath(destPath, basename(fullDestPath));
          const safeDest = fullDestPath;
          // Copy directory recursively with limits, excluding destination to prevent infinite recursion
          copyResult = await copyDirectoryRecursive(fullSourcePath, safeDest, { ...limits, excludePaths: [safeDest] });
          
          if (!copyResult.success) {
            logger.error(`Failed to copy directory ${fullSourcePath}: ${copyResult.errors.join('; ')}`);
            continue;
          }
          if (copyResult.errors.length) {
            logger.warn(`Directory copy completed with warnings for ${fullSourcePath}: ${copyResult.errors.join('; ')}`);
          }
        } else {
          // Choose a conflict-safe destination file name
          fullDestPath = await getUniquePath(destPath, basename(fullDestPath));
          await fsp.copyFile(fullSourcePath, fullDestPath);
        }
        
        const destRelativePath = join(destination, basename(fullDestPath)).replace(/\\/g, '/');
        copiedItems.push({ from: sourcePath, to: destRelativePath });
        
        // Invalidate cache for user and destination directory
        await FileCache.invalidateUserFiles(userId);
        await FileCache.invalidateFilePath(userId, destination);
        
        // Broadcast file created event
        if (websocketProvider.isAvailable()) {
          const createdPath = ('/' + destRelativePath).replace(/\/+/, '/');
          websocketProvider.broadcastFileCreated({
            name: basename(fullDestPath),
            path: createdPath,
            type: stats.isDirectory() ? 'folder' : 'file'
          });
        }
        if (typeof copyResult !== 'undefined' && copyResult && copyResult.errors && copyResult.errors.length) {
          if (!res.locals) res.locals = {};
          res.locals.copyWarnings = (res.locals.copyWarnings || []).concat(copyResult.errors);
        }
      } catch (error) {
        logger.error(`Failed to copy ${fullSourcePath}:`, error);
      }
    }
    
    res.json({
      success: true,
      copied: copiedItems,
      warnings: res.locals?.copyWarnings || []
    });
  } catch (error) {
    next(error);
  }
}

async function copyDirectoryRecursive(source, destination, options = {}) {
  const config = {
    maxDepth: options.maxDepth || 50,
    maxFiles: options.maxFiles || 5000,
    timeout: options.timeout || 60000, // 60 seconds
    excludePaths: Array.isArray(options.excludePaths) ? options.excludePaths : [],
    ...options
  };

  let fileCount = 0;
  let dirCount = 0;
  const errors = [];
  const startTime = Date.now();

  async function copyRecursive(src, dest, depth = 0) {
    // Check limits (depth 0 is the starting folder)
    if (depth >= config.maxDepth) {
      errors.push(`Max depth exceeded: ${src}`);
      return false;
    }
    if (fileCount >= config.maxFiles) {
      errors.push(`Max files limit exceeded`);
      return false;
    }
    if (Date.now() - startTime >= config.timeout) {
      errors.push(`Copy operation timeout exceeded`);
      return false;
    }

    try {
      await fsp.mkdir(dest, { recursive: true });
      const entries = await fsp.readdir(src, { withFileTypes: true });
      const excludes = config.excludePaths.map(p => p);
      
      for (const entry of entries) {
        const sourcePath = join(src, entry.name);
        const destPath = join(dest, entry.name);
        // Skip excluded paths to prevent copying into self
        if (excludes.some(e => sourcePath === e || sourcePath.startsWith(e + '/'))) {
          errors.push(`Skipped excluded path: ${sourcePath}`);
          continue;
        }
        // Skip symlinks to avoid cycles
        try {
          const lst = await fsp.lstat(sourcePath);
          if (typeof lst.isSymbolicLink === 'function' && lst.isSymbolicLink()) {
            errors.push(`Skipped symlink: ${sourcePath}`);
            continue;
          }
        } catch (_e) {
          errors.push(`Failed to lstat: ${sourcePath}`);
          continue;
        }
        if (entry.isDirectory()) {
          dirCount++;
          const success = await copyRecursive(sourcePath, destPath, depth + 1);
          if (!success) return false;
        } else {
          fileCount++;
          try {
            await fsp.copyFile(sourcePath, destPath);
          } catch (error) {
            errors.push(`Failed to copy file: ${sourcePath}`);
            logger.error(`Copy file error: ${error.message}`);
          }
        }
      }
      
      return true;
    } catch (error) {
      errors.push(`Failed to copy directory: ${src}`);
      logger.error(`Copy directory error: ${error.message}`);
      return false;
    }
  }

  const success = await copyRecursive(source, destination, 0);
  
  if (errors.length > 0) {
    logger.warn(`Copy operation completed with errors`, {
      fileCount,
      dirCount,
      errors: errors.length,
      duration: Date.now() - startTime
    });
  }

  return {
    success,
    fileCount,
    dirCount,
    errors,
    duration: Date.now() - startTime,
    limitReached: {
      maxDepth: errors.some(e => e.includes('Max depth')),
      maxFiles: errors.some(e => e.includes('Max files')),
      timeout: errors.some(e => e.includes('timeout'))
    }
  };
}

/**
 * Express handler: Download a single file
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function downloadFile(req, res, next) {
  try {
    if (validateUserId(req, res)) {
      return;
    }

    const filePath = req.query.path;
    if (!filePath) {
      return sendErrorResponse(res, 400, 'File path is required');
    }

    const userId = req.user.userId;
    const baseDirUser = await ensureUserUploadDir(userId);

    let fullPath;
    try {
      const sanitizedPath = sanitizeUploadPath(filePath);
      fullPath = secureResolve(baseDirUser, sanitizedPath);
    } catch (error) {
      return sendErrorResponse(res, 400, 'Invalid file path: ' + error.message);
    }

    try {
      const stats = await fsp.stat(fullPath);

      if (stats.isDirectory()) {
        return sendErrorResponse(res, 400, 'Cannot download a directory as a single file');
      }

      const fileName = basename(fullPath);

      // Set headers for file download
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Length', stats.size);

      // Stream the file
      const fileStream = (await import('fs')).createReadStream(fullPath);
      fileStream.pipe(res);

      fileStream.on('error', (error) => {
        logger.error(`Error streaming file ${fullPath}:`, error);
        if (!res.headersSent) {
          return sendInternalServerError(res, 'Failed to download file', req);
        }
      });

    } catch (error) {
      if (error.code === 'ENOENT') {
        return sendErrorResponse(res, 404, 'File not found');
      }
      logger.error(`Download file error:`, error);
      return sendInternalServerError(res, 'Failed to download file', req);
    }
  } catch (error) {
    next(error);
  }
}

/**
 * Express handler: Download selected files and folders as ZIP
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function downloadAsZip(req, res, next) {
  try {
    if (validateUserId(req, res)) {
      return;
    }

    const { paths } = req.body;
    if (!Array.isArray(paths) || paths.length === 0) {
      return sendErrorResponse(res, 400, 'Paths array is required and must not be empty');
    }

    const userId = req.user.userId;
    const baseDirUser = await ensureUserUploadDir(userId);

    // Generate a zip filename based on selection
    const zipFileName = paths.length === 1
      ? `${basename(paths[0])}.zip`
      : `selected_files_${new Date().toISOString().slice(0, 10)}.zip`;

    // Set headers for ZIP download
    res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);
    res.setHeader('Content-Type', 'application/zip');

    // Create ZIP archive
    const archive = archiver('zip', {
      zlib: { level: 6 } // Compression level
    });

    // Handle archive errors
    archive.on('error', (error) => {
      logger.error('Archive error:', error);
      if (!res.headersSent) {
        return sendInternalServerError(res, 'Failed to create ZIP archive', req);
      }
    });

    // Pipe archive to response
    archive.pipe(res);

    let addedFiles = 0;
    const maxFiles = 10000; // Limit for safety

    // Add each selected file/folder to archive
    for (const relativePath of paths) {
      if (addedFiles >= maxFiles) {
        logger.warn(`ZIP creation stopped: maximum file limit (${maxFiles}) reached`);
        break;
      }

      let fullPath;
      try {
        const sanitizedPath = sanitizeUploadPath(relativePath);
        fullPath = secureResolve(baseDirUser, sanitizedPath);
      } catch (error) {
        logger.warn(`Invalid path for ZIP: ${relativePath}`, error);
        continue;
      }

      try {
        const stats = await fsp.stat(fullPath);
        const itemName = basename(fullPath);

        if (stats.isDirectory()) {
          // Add directory recursively
          await addDirectoryToArchive(archive, fullPath, itemName);
        } else {
          // Add single file
          archive.file(fullPath, { name: itemName });
          addedFiles++;
        }
      } catch (error) {
        logger.warn(`Failed to add ${relativePath} to ZIP:`, error);
        continue;
      }
    }

    // Finalize the archive
    await archive.finalize();

    logger.info(`ZIP download completed for user ${userId}: ${paths.length} items processed`);

  } catch (error) {
    logger.error('Download as ZIP error:', error);
    next(error);
  }
}

/**
 * Helper function to add directory contents to archive recursively
 * @param {Object} archive - Archiver instance
 * @param {string} dirPath - Full path to directory
 * @param {string} archivePath - Path within archive
 */
async function addDirectoryToArchive(archive, dirPath, archivePath) {
  try {
    const entries = await fsp.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);
      const entryArchivePath = join(archivePath, entry.name);

      if (entry.isDirectory()) {
        // Recursively add subdirectory
        await addDirectoryToArchive(archive, fullPath, entryArchivePath);
      } else if (entry.isFile()) {
        // Add file to archive
        archive.file(fullPath, { name: entryArchivePath });
      }
    }
  } catch (error) {
    logger.warn(`Failed to read directory for ZIP: ${dirPath}`, error);
  }
}
