import axios, { AxiosResponse, CancelTokenSource } from 'axios'
import api from '@/api/axios'
import type { FileEntry } from './folderScannerService'
import { filePersistenceService } from './filePersistenceService'

export interface UploadSession {
  uploadId: string
  chunkSize: number
  totalChunks: number
  targetPath: string
}

export interface UploadProgress {
  uploadId: string
  fileName: string
  progress: number
  uploadedChunks: number
  totalChunks: number
  uploadedSize: number
  totalSize: number
  remainingSize: number
  estimatedTimeRemaining: number
  status: 'initialized' | 'uploading' | 'paused' | 'completed' | 'error' | 'cancelled'
  speed?: number
  eta?: string
}

export interface ActiveUpload {
  uploadId: string
  fileName: string
  progress: number
  status: string
  fileSize: number
  createdAt: string
  lastActivity: string
}

export class ChunkedUploadService {
  private activeUploads = new Map<string, {
    session: UploadSession
    file: File
    relativePath: string
    currentChunk: number
    cancelToken: CancelTokenSource
    startTime: number
    lastProgressTime: number
    uploadedBytes: number
    paused: boolean
    lastPersistedChunk: number
  }>()

  private queuedUploads = new Map<string, {
    session: UploadSession
    file: File
    relativePath: string
    cancelToken: CancelTokenSource
  }>()

  private maxConcurrentUploads = 3
  private uploadQueue: string[] = []
  private isProcessingQueue = false
  private queueProcessingMutex = Promise.resolve()
  private initialized = false
  private lastQueueProcessTime = 0

  async init(): Promise<void> {
    if (this.initialized) return
    
    try {
      await filePersistenceService.init()
      // Clean up old uploads on startup
      await filePersistenceService.clearOldUploads()
      
      // Clean up any completed uploads from IndexedDB
      try {
        const cleanedCount = await filePersistenceService.cleanupCompletedUploads()
        if (cleanedCount > 0) {
          console.log(`Cleaned up ${cleanedCount} completed uploads from IndexedDB`)
        }
      } catch (error) {
        console.error('Failed to cleanup completed uploads:', error)
      }
      
      // Start queue watchdog
      this.startQueueWatchdog()
      
      this.initialized = true
    } catch (error) {
      console.error('Failed to initialize file persistence:', error)
    }
  }

  private startQueueWatchdog() {
    // Check every 30 seconds if queue processing is stuck
    setInterval(() => {
      if (this.uploadQueue.length > 0 && !this.isProcessingQueue) {
        const timeSinceLastProcess = Date.now() - this.lastQueueProcessTime
        if (timeSinceLastProcess > 30000) {
          console.warn('Queue processing seems stuck, restarting...')
          this.processQueue()
        }
      }
    }, 30000)
  }

  async initializeUpload(file: File, relativePath: string = ''): Promise<UploadSession> {

    try {
      const formData = new FormData()
      formData.append('fileName', file.name)
      formData.append('fileSize', file.size.toString())
      formData.append('relativePath', relativePath)
      formData.append('chunkSize', (2 * 1024 * 1024).toString()) // 2MB chunks to match backend


      const response: AxiosResponse<{ success: boolean; data: UploadSession }> =
        await api.post('/upload/chunked/init', formData)


      if (!response.data.success) {
        throw new Error('Failed to initialize upload')
      }

      return response.data.data
    } catch (error: any) {
      console.error('Upload initialization failed:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      })

      if (error.response?.status === 401) {
        throw new Error('Authentication required. Please log in to upload files.')
      }

      const errorMessage = error.response?.data?.message || error.message || 'Unknown initialization error'
      throw new Error(`Upload initialization failed: ${errorMessage}`)
    }
  }

  async startUpload(fileEntry: FileEntry, basePath?: string): Promise<string> {
    await this.init() // Ensure persistence is initialized
    
    try {
      // Prefix the relative path with current folder basePath if provided
      let relativePath = fileEntry.relativePath || ''
      if (basePath && basePath !== '/') {
        const base = basePath.replace(/^\/+|\/+$/g, '')
        relativePath = base ? `${base}/${relativePath}` : relativePath
      }

      const session = await this.initializeUpload(fileEntry.file, relativePath)
      const cancelToken = axios.CancelToken.source()

      // Store in queued uploads, not active uploads
      const queuedInfo = {
        session,
        file: fileEntry.file,
        relativePath,
        cancelToken
      }

      this.queuedUploads.set(session.uploadId, queuedInfo)
      this.uploadQueue.push(session.uploadId)

      // Dispatch status event immediately to prevent "Initializing..." stuck state
      this.dispatchStatusEvent(session.uploadId, 'uploading')
      this.dispatchProgressEvent(session.uploadId, {
        uploadId: session.uploadId,
        fileName: fileEntry.file.name,
        progress: 0,
        uploadedChunks: 0,
        totalChunks: session.totalChunks,
        uploadedSize: 0,
        totalSize: fileEntry.file.size,
        remainingSize: fileEntry.file.size,
        estimatedTimeRemaining: 0,
        status: 'uploading'
      })

      // Persist file data to IndexedDB (non-blocking, optimized)
      setTimeout(() => {
        filePersistenceService.storeUpload(
          session.uploadId,
          fileEntry.file,
          relativePath,
          session
        ).catch(error => {
          console.error('Failed to persist upload data:', error)
          // Continue anyway - upload can still work without persistence
        })
      }, 0)

      this.processQueue()

      return session.uploadId
    } catch (error: any) {
      console.error(`Failed to start upload for ${fileEntry.file.name}:`, error)

      // Show user notification for authentication errors
      if (error.message?.includes('Authentication required')) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('upload-auth-error', {
            detail: { fileName: fileEntry.file.name, error: error.message }
          }))
        }
      }

      throw error
    }
  }

  private async processQueue(): Promise<void> {
    const now = Date.now()
    this.lastQueueProcessTime = now
    
    // Acquire mutex to prevent concurrent queue processing
    this.queueProcessingMutex = this.queueProcessingMutex.then(async () => {
      if (this.isProcessingQueue) {
        return // Already processing, skip
      }

      this.isProcessingQueue = true

      try {
        while (this.uploadQueue.length > 0) {
          const uploads = Array.from(this.activeUploads.values())
          const activeUploads = uploads.filter(upload => 
            upload.currentChunk < upload.session.totalChunks && !upload.paused
          )
          const activeCount = activeUploads.length

          if (activeCount >= this.maxConcurrentUploads) {
            // Schedule retry when uploads complete
            setTimeout(() => {
              if (this.uploadQueue.length > 0 && !this.isProcessingQueue) {
                this.processQueue()
              }
            }, 2000) // Check again in 2 seconds
            break // Wait for slots to free up
          }

          const uploadId = this.uploadQueue.shift()
          if (!uploadId || !this.queuedUploads.has(uploadId)) {
            continue // Skip invalid uploads
          }

          try {
            const queuedInfo = this.queuedUploads.get(uploadId)!

            // Move from queued to active atomically
            // Check if this was a restored upload with progress
            const currentChunk = (queuedInfo as any).restoredChunk || 0
            const uploadedBytes = (queuedInfo as any).restoredBytes || 0
            
            const uploadInfo = {
              session: queuedInfo.session,
              file: queuedInfo.file,
              relativePath: queuedInfo.relativePath,
              cancelToken: queuedInfo.cancelToken,
              currentChunk,
              startTime: Date.now(),
              lastProgressTime: Date.now(),
              uploadedBytes,
              paused: false,
              lastPersistedChunk: currentChunk - 1
            }

            this.activeUploads.set(uploadId, uploadInfo)
            this.queuedUploads.delete(uploadId)

            // Start upload in background
            this.startSingleUpload(uploadId).catch(error => {
              console.error(`Upload failed for ${uploadId}:`, error)
              this.handleUploadError(uploadId, error)
            })

          } catch (error) {
            console.error(`ERROR in processQueue for ${uploadId}:`, error)
            // Continue processing other uploads
          }

          // Small delay to prevent tight loops - REDUCED
          await new Promise(resolve => setTimeout(resolve, 1))
        }
      } finally {
        this.isProcessingQueue = false
      }
    })

    await this.queueProcessingMutex
  }

  private async startSingleUpload(uploadId: string): Promise<void> {
    try {
      await this.uploadFileChunks(uploadId)
    } catch (error) {
      console.error(`Upload failed for ${uploadId}:`, error)
      this.handleUploadError(uploadId, error)
    }
  }

  private async uploadFileChunks(uploadId: string): Promise<void> {

    const uploadInfo = this.activeUploads.get(uploadId)
    if (!uploadInfo) {
      console.error(`Upload info not found for ${uploadId}`)
      return
    }

    const { session, file, cancelToken } = uploadInfo

    // Update status to uploading when starting
    this.dispatchStatusEvent(uploadId, 'uploading')
    this.dispatchProgressEvent(uploadId, {
      uploadId,
      fileName: file.name,
      progress: 0,
      uploadedChunks: uploadInfo.currentChunk,
      totalChunks: session.totalChunks,
      uploadedSize: uploadInfo.uploadedBytes,
      totalSize: file.size,
      remainingSize: file.size - uploadInfo.uploadedBytes,
      estimatedTimeRemaining: 0,
      status: 'uploading'
    })
    
    while (uploadInfo.currentChunk < session.totalChunks && !uploadInfo.paused) {
      if (cancelToken.token.reason) {
        break
      }

      const chunkIndex = uploadInfo.currentChunk
      const start = chunkIndex * session.chunkSize
      const end = Math.min(start + session.chunkSize, file.size)
      const chunk = file.slice(start, end)


      const formData = new FormData()
      formData.append('chunk', chunk)
      formData.append('chunkIndex', chunkIndex.toString())

      try {
        const response = await api.post(
          `/upload/chunked/chunk/${session.uploadId}`,
          formData,
          {
            headers: { 'Content-Type': 'multipart/form-data' },
            cancelToken: cancelToken.token,
            onUploadProgress: (progressEvent) => {
              this.updateProgress(uploadId, progressEvent.loaded)
            }
          }
        )

        if (response.data.success) {

          uploadInfo.currentChunk++
          uploadInfo.uploadedBytes += chunk.size

          // Update persisted progress every 20 chunks or on completion (heavily throttled)
          if (uploadInfo.currentChunk - uploadInfo.lastPersistedChunk >= 20 || response.data.completed) {
            uploadInfo.lastPersistedChunk = uploadInfo.currentChunk
            setTimeout(() => {
              filePersistenceService.updateUploadProgress(
                uploadId,
                uploadInfo.currentChunk,
                uploadInfo.uploadedBytes
              ).catch(error => {
                console.error('Failed to update persisted progress:', error)
              })
            }, 0)
          }

          if (response.data.completed) {
            this.completeUpload(uploadId)
            break
          }
        } else {
          // Handle finalization errors specifically
          if (response.status === 500 && response.data.message?.includes('Finalization failed')) {
            console.error(`Finalization error for ${uploadInfo.file.name}:`, response.data.message)
            this.handleUploadError(uploadId, new Error(`Finalization failed: ${response.data.message}`))
            break
          } else {
            throw new Error(response.data.message || 'Chunk upload failed')
          }
        }

      } catch (error: any) {
        if (axios.isCancel(error)) {
          break
        }
        console.error(`Error uploading chunk ${chunkIndex + 1} for ${file.name}:`, {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        })
        throw error
      }

      // Remove delay between chunks for better performance
      // await this.delay(10)
    }
  }

  private updateProgress(uploadId: string, chunkUploaded: number): void {
    const uploadInfo = this.activeUploads.get(uploadId)
    if (!uploadInfo) return

    const now = Date.now()
    const timeDiff = now - uploadInfo.lastProgressTime

    if (timeDiff > 100) { // Update every 100ms
      const totalUploaded = (uploadInfo.currentChunk * uploadInfo.session.chunkSize) + chunkUploaded
      const progress = (totalUploaded / uploadInfo.file.size) * 100

      const speed = timeDiff > 0 ? (chunkUploaded / timeDiff) * 1000 : 0 // bytes per second
      const remainingBytes = uploadInfo.file.size - totalUploaded
      const eta = speed > 0 ? Math.round(remainingBytes / speed) : 0

      this.dispatchProgressEvent(uploadId, {
        uploadId,
        fileName: uploadInfo.file.name,
        progress: Math.min(progress, 100),
        uploadedChunks: uploadInfo.currentChunk,
        totalChunks: uploadInfo.session.totalChunks,
        uploadedSize: totalUploaded,
        totalSize: uploadInfo.file.size,
        remainingSize: remainingBytes,
        estimatedTimeRemaining: eta,
        status: 'uploading',
        speed,
        eta: this.formatTime(eta)
      })

      uploadInfo.lastProgressTime = now
    }
  }

  async pauseUpload(uploadId: string): Promise<void> {
    const uploadInfo = this.activeUploads.get(uploadId)
    if (!uploadInfo) return

    uploadInfo.paused = true
    uploadInfo.cancelToken.cancel('Upload paused by user')

    try {
      await api.post(`/upload/chunked/pause/${uploadId}`)
    } catch (error) {
      console.error('Failed to pause upload on server:', error)
    }

    this.dispatchStatusEvent(uploadId, 'paused')
  }

  async resumeUpload(uploadId: string): Promise<void> {
    const uploadInfo = this.activeUploads.get(uploadId)
    if (!uploadInfo) return

    uploadInfo.paused = false
    uploadInfo.cancelToken = axios.CancelToken.source()

    try {
      const response = await api.post(`/upload/chunked/resume/${uploadId}`)

      if (response.data.success) {
        const missingChunks = response.data.missingChunks || []
        uploadInfo.currentChunk = missingChunks.length > 0 ? Math.min(...missingChunks) : uploadInfo.currentChunk

        // Reset timing for accurate speed calculations
        uploadInfo.lastProgressTime = Date.now()
        
        // Continue uploading immediately without re-queueing since it's already active
        this.startSingleUpload(uploadId).catch(error => {
          console.error(`Upload failed for ${uploadId}:`, error)
          this.handleUploadError(uploadId, error)
        })
        
        this.dispatchStatusEvent(uploadId, 'uploading')
      }
    } catch (error) {
      console.error('Failed to resume upload:', error)
      this.handleUploadError(uploadId, error)
    }
  }

  async cancelUpload(uploadId: string): Promise<void> {
    const uploadInfo = this.activeUploads.get(uploadId)
    const queuedInfo = this.queuedUploads.get(uploadId)

    if (!uploadInfo && !queuedInfo) return

    const cancelToken = uploadInfo?.cancelToken || queuedInfo?.cancelToken
    if (cancelToken) {
      try {
        cancelToken.cancel('Upload cancelled by user')
      } catch {
        // Ignore cancellation errors
      }
    }

    try {
      await api.delete(`/upload/chunked/cancel/${uploadId}`)
    } catch (error) {
      console.error('Failed to cancel upload on server:', error)
    }

    this.dispatchStatusEvent(uploadId, 'cancelled')
    
    // Remove from persisted storage (deferred)
    setTimeout(() => {
      filePersistenceService.removeUpload(uploadId).catch(error => {
        console.error('Failed to remove cancelled upload from storage:', error)
      })
    }, 0)
    
    // Clean up memory for cancelled upload
    this.cleanupUploadMemory(uploadId)

    // Process next uploads in queue immediately (with fallback retry)
    this.processQueue()
    
    // Fallback: ensure queue continues processing
    setTimeout(() => {
      if (this.uploadQueue.length > 0 && !this.isProcessingQueue) {
        this.processQueue()
      }
    }, 500)
  }

  async cancelAllUploads(): Promise<void> {
    try {
      // Cancel client-side tokens and clean up persistence
      for (const [uploadId, info] of this.activeUploads.entries()) {
        try { info.cancelToken?.cancel('Upload cancelled by user') } catch { }
        this.dispatchStatusEvent(uploadId, 'cancelled')
        
        // Remove from persisted storage (deferred)
        setTimeout(() => {
          filePersistenceService.removeUpload(uploadId).catch(error => {
            console.error('Failed to remove upload from storage:', error)
          })
        }, 0)
      }
      for (const [uploadId, info] of this.queuedUploads.entries()) {
        try { info.cancelToken?.cancel('Upload cancelled by user') } catch { }
        
        // Remove from persisted storage (deferred)
        setTimeout(() => {
          filePersistenceService.removeUpload(uploadId).catch(error => {
            console.error('Failed to remove upload from storage:', error)
          })
        }, 0)
      }

      // Clear internal queues
      this.activeUploads.clear()
      this.queuedUploads.clear()
      this.uploadQueue = []

      // Cancel server-side sessions
      await api.delete('/upload/chunked/active')
    } catch (error) {
      console.error('Failed to cancel all uploads:', error)
      throw error
    }
  }

  async getUploadStatus(uploadId: string): Promise<UploadProgress | null> {
    try {
      const response = await api.get(`/upload/chunked/status/${uploadId}`)

      if (response.data.success) {
        return {
          ...response.data.data,
          eta: this.formatTime(response.data.data.estimatedTimeRemaining)
        }
      }
    } catch (error) {
      console.error('Failed to get upload status:', error)
    }

    return null
  }

  private listActiveUploadsPromise: Promise<ActiveUpload[]> | null = null

  async listActiveUploads(): Promise<ActiveUpload[]> {
    // Deduplicate concurrent requests
    if (this.listActiveUploadsPromise) {
      return this.listActiveUploadsPromise
    }

    this.listActiveUploadsPromise = this.fetchActiveUploads()

    try {
      const result = await this.listActiveUploadsPromise
      return result
    } finally {
      // Clear the promise after completion (success or error)
      setTimeout(() => {
        this.listActiveUploadsPromise = null
      }, 100) // Small delay to prevent rapid successive calls
    }
  }

  private async fetchActiveUploads(): Promise<ActiveUpload[]> {
    try {
      const response = await api.get('/upload/chunked/active')
      return response.data.success ? response.data.data : []
    } catch (error) {
      console.error('Failed to list active uploads:', error)
      return []
    }
  }

  private completeUpload(uploadId: string): void {
    const uploadInfo = this.activeUploads.get(uploadId)
    if (!uploadInfo) return

    // Mark as completed immediately so processQueue() doesn't count it as active
    uploadInfo.currentChunk = uploadInfo.session.totalChunks

    this.dispatchProgressEvent(uploadId, {
      uploadId,
      fileName: uploadInfo.file.name,
      progress: 100,
      uploadedChunks: uploadInfo.session.totalChunks,
      totalChunks: uploadInfo.session.totalChunks,
      uploadedSize: uploadInfo.file.size,
      totalSize: uploadInfo.file.size,
      remainingSize: 0,
      estimatedTimeRemaining: 0,
      status: 'completed',
      eta: '0s'
    })

    this.dispatchStatusEvent(uploadId, 'completed')

    // Remove from persisted storage immediately
    filePersistenceService.removeUpload(uploadId).catch(error => {
      console.error('Failed to remove completed upload from storage:', error)
    })

    // Clean up memory immediately
    this.cleanupUploadMemory(uploadId)

    // Process next uploads in queue immediately (with fallback retry)
    this.processQueue()
    
    // Fallback: ensure queue continues processing
    setTimeout(() => {
      if (this.uploadQueue.length > 0 && !this.isProcessingQueue) {
        this.processQueue()
      }
    }, 500)
  }

  private cleanupUploadMemory(uploadId: string): void {
    const uploadInfo = this.activeUploads.get(uploadId)
    if (uploadInfo) {
      // Cancel any pending operations
      try {
        uploadInfo.cancelToken.cancel('Upload completed or cancelled')
      } catch {
        // Ignore cancellation errors
      }

      // Clear references by removing from maps below; browser GC will reclaim memory
    }

    // Remove from both maps
    this.activeUploads.delete(uploadId)
    this.queuedUploads.delete(uploadId)

    // Force garbage collection if available (non-standard, dev-only)
    if (typeof window !== 'undefined') {
      try {
        // declare global Window.gc for type-safety without ts-ignore
        (window as Window & { gc?: () => void }).gc?.()
      } catch {
        // ignore
      }
    }
  }

  private handleUploadError(uploadId: string, error: any): void {
    const uploadInfo = this.activeUploads.get(uploadId)
    if (!uploadInfo) return

    console.error(`Upload error for ${uploadInfo.file.name}:`, error.message)

    this.dispatchProgressEvent(uploadId, {
      uploadId,
      fileName: uploadInfo.file.name,
      progress: (uploadInfo.currentChunk / uploadInfo.session.totalChunks) * 100,
      uploadedChunks: uploadInfo.currentChunk,
      totalChunks: uploadInfo.session.totalChunks,
      uploadedSize: uploadInfo.uploadedBytes,
      totalSize: uploadInfo.file.size,
      remainingSize: uploadInfo.file.size - uploadInfo.uploadedBytes,
      estimatedTimeRemaining: 0,
      status: 'error',
      eta: 'Error'
    })

    // Show user-friendly error notification before cleanup
    if (typeof window !== 'undefined') {
      const errorMsg = error.message?.includes('Finalization failed')
        ? `Failed to finalize upload for ${uploadInfo.file.name}. Please try again.`
        : `Upload failed for ${uploadInfo.file.name}: ${error.message}`;

      // Dispatch custom event for error notifications
      window.dispatchEvent(new CustomEvent('upload-error', {
        detail: { uploadId, fileName: uploadInfo.file.name, error: errorMsg }
      }))
    }

    // Clean up memory for failed upload
    this.cleanupUploadMemory(uploadId)

    // Process next uploads in queue immediately (with fallback retry)
    this.processQueue()
    
    // Fallback: ensure queue continues processing
    setTimeout(() => {
      if (this.uploadQueue.length > 0 && !this.isProcessingQueue) {
        this.processQueue()
      }
    }, 500)
  }

  private dispatchProgressEvent(uploadId: string, progress: UploadProgress): void {

    window.dispatchEvent(new CustomEvent('upload-progress', {
      detail: { uploadId, progress }
    }))
  }

  private dispatchStatusEvent(uploadId: string, status: UploadProgress['status']): void {
    window.dispatchEvent(new CustomEvent('upload-status-change', {
      detail: { uploadId, status }
    }))
  }

  private formatTime(seconds: number): string {
    if (!seconds || seconds === 0) return '0s'
    if (seconds < 60) return `${Math.round(seconds)}s`
    if (seconds < 3600) return `${Math.round(seconds / 60)}m ${Math.round(seconds % 60)}s`
    return `${Math.round(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}m`
  }


  getActiveUploadsCount(): number {
    return this.activeUploads.size
  }

  getQueueLength(): number {
    return this.queuedUploads.size
  }

  hasActiveUpload(uploadId: string): boolean {
    return this.activeUploads.has(uploadId) || this.queuedUploads.has(uploadId)
  }

  async restoreUploadFromStorage(uploadId: string): Promise<boolean> {
    await this.init()
    
    try {
      const persistedUpload = await filePersistenceService.getUpload(uploadId)
      if (!persistedUpload) return false

      // Restore the file from stored data
      const file = await filePersistenceService.restoreFileFromUpload(persistedUpload)
      const cancelToken = axios.CancelToken.source()

      // Always add to queue for proper concurrency management
      const queuedInfo = {
        session: persistedUpload.session,
        file,
        relativePath: persistedUpload.relativePath,
        cancelToken,
        // Store the progress info for when it starts
        restoredChunk: persistedUpload.currentChunk,
        restoredBytes: persistedUpload.uploadedBytes
      }
      
      this.queuedUploads.set(uploadId, queuedInfo)
      this.uploadQueue.push(uploadId)
      
      // Dispatch status event for restored upload to show it's queued
      this.dispatchStatusEvent(uploadId, 'paused')
      this.dispatchProgressEvent(uploadId, {
        uploadId,
        fileName: file.name,
        progress: Math.round((persistedUpload.currentChunk / persistedUpload.session.totalChunks) * 100),
        uploadedChunks: persistedUpload.currentChunk,
        totalChunks: persistedUpload.session.totalChunks,
        uploadedSize: persistedUpload.uploadedBytes,
        totalSize: file.size,
        remainingSize: file.size - persistedUpload.uploadedBytes,
        estimatedTimeRemaining: 0,
        status: 'paused'
      })
      
      return true
    } catch (error) {
      console.error('Failed to restore upload from storage:', error)
      return false
    }
  }

  async getAllPersistedUploads(): Promise<string[]> {
    await this.init()
    
    try {
      const uploads = await filePersistenceService.getAllUploads()
      return uploads.map(upload => upload.uploadId)
    } catch (error) {
      console.error('Failed to get persisted uploads:', error)
      return []
    }
  }

  async restoreAndStartAllUploads(): Promise<void> {
    const persistedIds = await this.getAllPersistedUploads()
    
    for (const uploadId of persistedIds) {
      await this.restoreUploadFromStorage(uploadId)
    }
    
    // After restoring all uploads, start processing the queue and auto-resume paused uploads
    if (this.uploadQueue.length > 0) {
      // Small delay to ensure all restoration is complete
      setTimeout(() => {
        // First, resume all paused uploads (they were restored as paused)
        const pausedUploads = Array.from(this.queuedUploads.keys())
        for (const uploadId of pausedUploads) {
          this.dispatchStatusEvent(uploadId, 'uploading')
        }
        
        // Then process the queue
        this.processQueue()
      }, 100)
    }
  }
}

export const chunkedUploadService = new ChunkedUploadService()
