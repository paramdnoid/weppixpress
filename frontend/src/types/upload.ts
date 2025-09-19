// Upload & File Processing types
export interface UploadFile {
  id: string
  file: File
  name: string
  size: number
  type: string
  status: UploadStatus
  progress: number
  error?: string
  response?: unknown
  uploadedAt?: string
  chunks?: FileChunk[]
  metadata?: FileMetadata
}

export enum UploadStatus {
  PENDING = 'pending',
  PREPARING = 'preparing',
  UPLOADING = 'uploading',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  PAUSED = 'paused'
}

export interface FileChunk {
  index: number
  start: number
  end: number
  size: number
  uploaded: boolean
  retries: number
}

export interface FileMetadata {
  originalName: string
  mimeType: string
  extension: string
  dimensions?: {
    width: number
    height: number
  }
  duration?: number // for audio/video
  thumbnailUrl?: string
  checksum?: string
  encoding?: string
  tags?: string[]
  description?: string
}

export interface UploadConfig {
  maxFileSize?: number
  allowedTypes?: string[]
  chunkSize?: number
  maxConcurrentUploads?: number
  autoRetry?: boolean
  maxRetries?: number
  retryDelay?: number
  headers?: Record<string, string>
}

export interface UploadProgress {
  fileId: string
  loaded: number
  total: number
  percentage: number
  speed?: number // bytes per second
  estimatedTimeRemaining?: number // seconds
  currentChunk?: number
  totalChunks?: number
}

export interface UploadQueue {
  items: UploadFile[]
  activeUploads: number
  completedCount: number
  failedCount: number
  totalSize: number
  uploadedSize: number
  overallProgress: number
}

export interface FileValidationResult {
  valid: boolean
  errors: FileValidationError[]
}

export interface FileValidationError {
  type: 'size' | 'type' | 'dimension' | 'count' | 'duplicate' | 'custom'
  message: string
  details?: Record<string, unknown>
}

export interface UploadHistoryItem {
  id: string
  fileName: string
  fileSize: number
  uploadDate: string
  status: UploadStatus
  duration: number // milliseconds
  error?: string
  path?: string
}
