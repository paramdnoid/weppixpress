import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import { pipeline } from 'stream/promises';
import { createReadStream } from 'fs';
import mime from 'mime-types';

export class FileService {
  constructor(uploadDir) {
    this.uploadDir = uploadDir;
    this.thumbnailCache = new Map();
  }

  // Generate unique file identifier
  generateFileId(userId, fileName) {
    const hash = crypto.createHash('sha256');
    hash.update(`${userId}-${fileName}-${Date.now()}`);
    return hash.digest('hex').substring(0, 16);
  }

  // Secure file path resolution
  resolveSecurePath(userId, relativePath) {
    const userDir = path.join(this.uploadDir, String(userId));
    const resolved = path.resolve(userDir, relativePath);
    
    // Ensure the resolved path is within user directory
    if (!resolved.startsWith(userDir)) {
      throw new Error('Invalid path: Access denied');
    }
    
    return resolved;
  }

  // Optimized file listing with pagination
  async listFiles(userId, relativePath = '/', options = {}) {
    const {
      page = 1,
      limit = 50,
      sortBy = 'name',
      sortOrder = 'asc',
      search = '',
      fileTypes = []
    } = options;

    const targetPath = this.resolveSecurePath(userId, relativePath);
    
    try {
      const entries = await fs.readdir(targetPath, { withFileTypes: true });
      
      // Filter and map entries
      let files = await Promise.all(
        entries
          .filter(entry => {
            // Filter hidden files
            if (entry.name.startsWith('.')) return false;
            
            // Search filter
            if (search && !entry.name.toLowerCase().includes(search.toLowerCase())) {
              return false;
            }
            
            // File type filter
            if (fileTypes.length > 0 && entry.isFile()) {
              const ext = path.extname(entry.name).toLowerCase();
              if (!fileTypes.includes(ext)) return false;
            }
            
            return true;
          })
          .map(async (entry) => {
            const fullPath = path.join(targetPath, entry.name);
            const stats = await fs.stat(fullPath);
            const relativePath = path.relative(
              path.join(this.uploadDir, String(userId)),
              fullPath
            );
            
            const fileInfo = {
              name: entry.name,
              path: '/' + relativePath.replace(/\\/g, '/'),
              type: entry.isDirectory() ? 'folder' : 'file',
              size: stats.size,
              sizeFormatted: this.formatFileSize(stats.size),
              created: stats.birthtime,
              modified: stats.mtime,
              accessed: stats.atime
            };
            
            // Add file-specific metadata
            if (entry.isFile()) {
              fileInfo.extension = path.extname(entry.name);
              fileInfo.mimeType = mime.lookup(entry.name) || 'application/octet-stream';
              
              // Add thumbnail for images
              if (this.isImage(entry.name)) {
                fileInfo.hasThumbnail = true;
                fileInfo.thumbnailId = this.generateFileId(userId, entry.name);
              }
            } else {
              // Check if folder has subfolders
              const subEntries = await fs.readdir(fullPath, { withFileTypes: true });
              fileInfo.hasSubfolders = subEntries.some(e => e.isDirectory());
              fileInfo.itemCount = subEntries.length;
            }
            
            return fileInfo;
          })
      );
      
      // Sort files
      files = this.sortFiles(files, sortBy, sortOrder);
      
      // Paginate
      const totalItems = files.length;
      const totalPages = Math.ceil(totalItems / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      
      return {
        items: files.slice(startIndex, endIndex),
        pagination: {
          page,
          limit,
          totalItems,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        path: relativePath
      };
    } catch (error) {
      throw new Error(`Failed to list files: ${error.message}`);
    }
  }

  // Sort files
  sortFiles(files, sortBy, sortOrder) {
    const multiplier = sortOrder === 'asc' ? 1 : -1;
    
    return files.sort((a, b) => {
      // Folders always come first
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
      }
      
      switch (sortBy) {
        case 'size':
          return (a.size - b.size) * multiplier;
        case 'modified':
          return (new Date(a.modified) - new Date(b.modified)) * multiplier;
        case 'type':
          return (a.extension || '').localeCompare(b.extension || '') * multiplier;
        case 'name':
        default:
          return a.name.localeCompare(b.name, undefined, { numeric: true }) * multiplier;
      }
    });
  }

  // Create thumbnail for images
  async createThumbnail(filePath, thumbnailPath, size = 200) {
    try {
      await sharp(filePath)
        .resize(size, size, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 80, progressive: true })
        .toFile(thumbnailPath);
      
      return true;
    } catch (error) {
      console.error('Thumbnail creation failed:', error);
      return false;
    }
  }

  // Stream file for download
  async streamFile(userId, filePath, res) {
    const fullPath = this.resolveSecurePath(userId, filePath);
    
    // Check if file exists
    const stats = await fs.stat(fullPath);
    if (!stats.isFile()) {
      throw new Error('Not a file');
    }
    
    // Set headers
    const mimeType = mime.lookup(fullPath) || 'application/octet-stream';
    const fileName = path.basename(fullPath);
    
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    
    // Stream file
    const stream = createReadStream(fullPath);
    await pipeline(stream, res);
  }

  // Virus scanning integration (ClamAV)
  async scanFile(_filePath) {
    // This would integrate with ClamAV or similar
    // For now, return a mock result
    return {
      clean: true,
      threats: []
    };
  }

  // File versioning
  async createVersion(userId, filePath) {
    const fullPath = this.resolveSecurePath(userId, filePath);
    const versionDir = path.join(path.dirname(fullPath), '.versions');
    
    // Create versions directory if it doesn't exist
    await fs.mkdir(versionDir, { recursive: true });
    
    // Generate version name
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const versionName = `${path.basename(fullPath)}.${timestamp}`;
    const versionPath = path.join(versionDir, versionName);
    
    // Copy file to version
    await fs.copyFile(fullPath, versionPath);
    
    return versionName;
  }

  // Helper methods
  formatFileSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
  }

  isImage(fileName) {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
    return imageExtensions.includes(path.extname(fileName).toLowerCase());
  }
}