import { Multer as _Multer } from 'multer';

// File Upload Types
export interface UploadedFile extends Express.Multer.File {
  id?: string;
  userId?: string;
}

export interface FileUploadOptions {
  maxSize?: number;
  allowedTypes?: string[];
  destination?: string;
  preserveExtension?: boolean;
  generateThumbnail?: boolean;
  scanForViruses?: boolean;
}

export interface FileMetadata {
  originalName: string;
  mimeType: string;
  size: number;
  encoding: string;
  dimensions?: {
    width: number;
    height: number;
  };
  duration?: number; // For video/audio files
  checksum?: string;
  exif?: Record<string, any>;
}

export interface FileProcessingResult {
  success: boolean;
  fileId?: string;
  url?: string;
  thumbnailUrl?: string;
  metadata?: FileMetadata;
  error?: string;
}

// Storage Provider Interface
export interface StorageProvider {
  upload(file: Buffer | string, key: string, options?: any): Promise<string>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  getUrl(key: string, expires?: number): Promise<string>;
  list(prefix?: string): Promise<string[]>;
  copy(source: string, destination: string): Promise<void>;
  move(source: string, destination: string): Promise<void>;
}

// File Operations
export interface FileOperation {
  type: 'copy' | 'move' | 'delete' | 'rename' | 'compress' | 'extract';
  source: string | string[];
  destination?: string;
  options?: Record<string, any>;
}

export interface BatchFileOperation {
  operations: FileOperation[];
  transactional?: boolean;
}

// Archive Types
export interface ArchiveOptions {
  format: 'zip' | 'tar' | 'tar.gz' | '7z';
  compressionLevel?: number;
  password?: string;
  excludePatterns?: string[];
}

export interface ExtractOptions {
  destination: string;
  password?: string;
  overwrite?: boolean;
  preservePermissions?: boolean;
}

// Sharing Types
export interface FileShareOptions {
  expiresAt?: Date;
  password?: string;
  maxDownloads?: number;
  allowUpload?: boolean;
  notifyOnAccess?: boolean;
}

export interface SharedFileAccess {
  fileId: string;
  token: string;
  accessedBy?: string;
  accessedAt: Date;
  downloadCount: number;
  ipAddress?: string;
}