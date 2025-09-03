import axios, { AxiosResponse, CancelTokenSource } from 'axios'
import api from '@/api/axios'
import type { FileEntry } from './folderScannerService'

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
  }>()

  private queuedUploads = new Map<string, {
    session: UploadSession
    file: File
    relativePath: string
    cancelToken: CancelTokenSource
  }>()

  private maxConcurrentUploads = 3
  private uploadQueue: string[] = []

  async initializeUpload(file: File, relativePath: string = ''): Promise<UploadSession> {
    console.log(`Initializing upload for ${file.name} (${file.size} bytes) to ${relativePath}`)
    
    try {
      const formData = new FormData()
      formData.append('fileName', file.name)
      formData.append('fileSize', file.size.toString())
      formData.append('relativePath', relativePath)
      formData.append('chunkSize', (2 * 1024 * 1024).toString()) // 2MB chunks to match backend

      console.log('Sending initialization request to /upload/chunked/init')
      
      const response: AxiosResponse<{ success: boolean; data: UploadSession }> = 
        await api.post('/upload/chunked/init', formData)

      console.log('Initialization response:', response.data)

      if (!response.data.success) {
        throw new Error('Failed to initialize upload')
      }

      console.log(`Upload session created: ${response.data.data.uploadId}`)
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

      this.processQueue()

      return session.uploadId
    } catch (error: any) {
      console.error(`Failed to start upload for ${fileEntry.file.name}:`, error)
      
      // Generate a temporary uploadId for error state
      const errorUploadId = crypto.randomUUID()
      
      // Emit error event
      this.eventEmitter.emit('uploadError', {
        uploadId: errorUploadId,
        fileName: fileEntry.file.name,
        error: error.message || 'Failed to initialize upload'
      })

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
    const uploads = Array.from(this.activeUploads.values())
    const activeUploads = uploads.filter(upload => upload.currentChunk < upload.session.totalChunks && !upload.paused)
    const activeCount = activeUploads.length

    console.log(`processQueue: active=${activeCount}, max=${this.maxConcurrentUploads}, queued=${this.uploadQueue.length}`)
    console.log(`Upload states:`, uploads.map(u => ({ 
      name: u.file.name, 
      current: u.currentChunk, 
      total: u.session.totalChunks,
      active: u.currentChunk < u.session.totalChunks && !u.paused
    })))

    if (activeCount >= this.maxConcurrentUploads || this.uploadQueue.length === 0) {
      return
    }

    const uploadId = this.uploadQueue.shift()
    if (!uploadId || !this.queuedUploads.has(uploadId)) {
      this.processQueue()
      return
    }

    try {
      console.log(`DEBUG: About to get queued info for ${uploadId}`)
      const queuedInfo = this.queuedUploads.get(uploadId)!
      console.log(`DEBUG: Got queued info, creating upload info`)
      
      // Move from queued to active
      const uploadInfo = {
        ...queuedInfo,
        currentChunk: 0,
        startTime: Date.now(),
        lastProgressTime: Date.now(),
        uploadedBytes: 0,
        paused: false
      }
      
      console.log(`DEBUG: Upload info created, setting to active`)
      this.activeUploads.set(uploadId, uploadInfo)
      this.queuedUploads.delete(uploadId)

      console.log(`Starting upload for ${uploadInfo.file.name} (${uploadId})`)
      console.log(`DEBUG: After first log, about to log upload info`)
      console.log(`Upload info created:`, { uploadId, currentChunk: uploadInfo.currentChunk, totalChunks: uploadInfo.session.totalChunks })
      console.log(`DEBUG: Upload info logged, moving to start upload`)

      // Start upload in background without blocking processQueue
      this.startSingleUpload(uploadId)

      // Continue processing queue immediately
      console.log(`Processing next in queue after starting ${uploadId}`)
      this.processQueue()
    } catch (error) {
      console.error(`ERROR in processQueue for ${uploadId}:`, error)
      this.processQueue()
    }
  }

  private async startSingleUpload(uploadId: string): Promise<void> {
    try {
      console.log(`About to call uploadFileChunks for ${uploadId}`)
      await this.uploadFileChunks(uploadId)
      console.log(`uploadFileChunks completed for ${uploadId}`)
    } catch (error) {
      console.error(`Upload failed for ${uploadId}:`, error)
      this.handleUploadError(uploadId, error)
    }
  }

  private async uploadFileChunks(uploadId: string): Promise<void> {
    console.log(`Starting chunk upload for ${uploadId}`)
    
    const uploadInfo = this.activeUploads.get(uploadId)
    if (!uploadInfo) {
      console.error(`Upload info not found for ${uploadId}`)
      return
    }

    const { session, file, cancelToken } = uploadInfo
    console.log(`Uploading ${file.name}: ${session.totalChunks} chunks, ${session.chunkSize} bytes each`)

    while (uploadInfo.currentChunk < session.totalChunks && !uploadInfo.paused) {
      if (cancelToken.token.reason) {
        console.log(`Upload ${uploadId} cancelled by token`)
        break
      }

      const chunkIndex = uploadInfo.currentChunk
      const start = chunkIndex * session.chunkSize
      const end = Math.min(start + session.chunkSize, file.size)
      const chunk = file.slice(start, end)

      console.log(`Uploading chunk ${chunkIndex + 1}/${session.totalChunks} for ${file.name} (${chunk.size} bytes)`)

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
              this.updateProgress(uploadId, progressEvent.loaded, chunk.size)
            }
          }
        )

        if (response.data.success) {
          console.log(`Chunk ${chunkIndex + 1}/${session.totalChunks} uploaded successfully for ${file.name}`)
          console.log(`Backend response:`, { success: response.data.success, completed: response.data.completed })
          
          uploadInfo.currentChunk++
          uploadInfo.uploadedBytes += chunk.size

          if (response.data.completed) {
            console.log(`Upload completed for ${uploadInfo.file.name}`)
            this.completeUpload(uploadId)
            break
          } else {
            console.log(`Upload NOT completed - continuing loop. Current chunk: ${uploadInfo.currentChunk}, Total: ${session.totalChunks}`)
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
          console.log(`Upload ${uploadId} cancelled`)
          break
        }
        console.error(`Error uploading chunk ${chunkIndex + 1} for ${file.name}:`, {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        })
        throw error
      }

      await this.delay(10)
    }
  }

  private updateProgress(uploadId: string, chunkUploaded: number, chunkSize: number): void {
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
        uploadInfo.currentChunk = missingChunks.length > 0 ? Math.min(...missingChunks) : uploadInfo.session.totalChunks

        this.uploadQueue.unshift(uploadId)
        this.processQueue()
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
      cancelToken.cancel('Upload cancelled by user')
    }

    try {
      await api.delete(`/upload/chunked/cancel/${uploadId}`)
    } catch (error) {
      console.error('Failed to cancel upload on server:', error)
    }

    this.activeUploads.delete(uploadId)
    this.queuedUploads.delete(uploadId)
    this.dispatchStatusEvent(uploadId, 'cancelled')
  }

  async cancelAllUploads(): Promise<void> {
    try {
      // Cancel client-side tokens
      for (const [uploadId, info] of this.activeUploads.entries()) {
        try { info.cancelToken?.cancel('Upload cancelled by user') } catch {}
        this.dispatchStatusEvent(uploadId, 'cancelled')
      }
      for (const [, info] of this.queuedUploads.entries()) {
        try { info.cancelToken?.cancel('Upload cancelled by user') } catch {}
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

  async listActiveUploads(): Promise<ActiveUpload[]> {
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

    // Remove from activeUploads immediately to free up queue slot
    this.activeUploads.delete(uploadId)

    // Process next uploads in queue immediately
    this.processQueue()
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

    // Remove failed upload from active uploads to prevent blocking the queue
    this.activeUploads.delete(uploadId)
    
    // Also remove from queued uploads if it exists there
    this.queuedUploads.delete(uploadId)

    // Show user-friendly error notification
    if (typeof window !== 'undefined') {
      const errorMsg = error.message?.includes('Finalization failed') 
        ? `Failed to finalize upload for ${uploadInfo.file.name}. Please try again.`
        : `Upload failed for ${uploadInfo.file.name}: ${error.message}`;
      
      // Dispatch custom event for error notifications
      window.dispatchEvent(new CustomEvent('upload-error', {
        detail: { uploadId, fileName: uploadInfo.file.name, error: errorMsg }
      }))
    }
  }

  private dispatchProgressEvent(uploadId: string, progress: UploadProgress): void {
    console.log(`Dispatching progress event for ${uploadId}:`, { 
      progress: progress.progress, 
      status: progress.status,
      uploadedChunks: progress.uploadedChunks,
      totalChunks: progress.totalChunks
    })
    
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

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  getActiveUploadsCount(): number {
    return this.activeUploads.size
  }

  getQueueLength(): number {
    return this.queuedUploads.size
  }
}

export const chunkedUploadService = new ChunkedUploadService()
