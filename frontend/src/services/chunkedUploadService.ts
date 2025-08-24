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

  private maxConcurrentUploads = 3
  private uploadQueue: string[] = []

  async initializeUpload(file: File, relativePath: string = ''): Promise<UploadSession> {
    try {
      const formData = new FormData()
      formData.append('fileName', file.name)
      formData.append('fileSize', file.size.toString())
      formData.append('relativePath', relativePath)
      formData.append('chunkSize', (2 * 1024 * 1024).toString()) // 2MB chunks to match backend

      const response: AxiosResponse<{ success: boolean; data: UploadSession }> = 
        await api.post('/chunked-upload/init', formData)

      if (!response.data.success) {
        throw new Error('Failed to initialize upload')
      }

      return response.data.data
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error('Authentication required. Please log in to upload files.')
      }
      throw error
    }
  }

  async startUpload(fileEntry: FileEntry): Promise<string> {
    const session = await this.initializeUpload(fileEntry.file, fileEntry.relativePath)
    const cancelToken = axios.CancelToken.source()

    const uploadInfo = {
      session,
      file: fileEntry.file,
      relativePath: fileEntry.relativePath,
      currentChunk: 0,
      cancelToken,
      startTime: Date.now(),
      lastProgressTime: Date.now(),
      uploadedBytes: 0,
      paused: false
    }

    this.activeUploads.set(session.uploadId, uploadInfo)
    this.uploadQueue.push(session.uploadId)

    this.processQueue()

    return session.uploadId
  }

  private async processQueue(): Promise<void> {
    const activeCount = Array.from(this.activeUploads.values())
      .filter(upload => upload.currentChunk < upload.session.totalChunks && !upload.paused).length

    if (activeCount >= this.maxConcurrentUploads || this.uploadQueue.length === 0) {
      return
    }

    const uploadId = this.uploadQueue.shift()
    if (!uploadId || !this.activeUploads.has(uploadId)) {
      this.processQueue()
      return
    }

    const uploadInfo = this.activeUploads.get(uploadId)!
    if (uploadInfo.paused) {
      this.processQueue()
      return
    }

    try {
      await this.uploadFileChunks(uploadId)
    } catch (error) {
      console.error(`Upload failed for ${uploadId}:`, error)
      this.handleUploadError(uploadId, error)
    }

    this.processQueue()
  }

  private async uploadFileChunks(uploadId: string): Promise<void> {
    const uploadInfo = this.activeUploads.get(uploadId)
    if (!uploadInfo) return

    const { session, file, cancelToken } = uploadInfo

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
          `/chunked-upload/chunk/${session.uploadId}`,
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
          uploadInfo.currentChunk++
          uploadInfo.uploadedBytes += chunk.size

          if (response.data.completed) {
            this.completeUpload(uploadId)
            break
          }
        } else {
          throw new Error(response.data.message || 'Chunk upload failed')
        }

      } catch (error) {
        if (axios.isCancel(error)) {
          break
        }
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
      await api.post(`/chunked-upload/pause/${uploadId}`)
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
      const response = await api.post(`/chunked-upload/resume/${uploadId}`)
      
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
    if (!uploadInfo) return

    uploadInfo.cancelToken.cancel('Upload cancelled by user')

    try {
      await api.delete(`/chunked-upload/cancel/${uploadId}`)
    } catch (error) {
      console.error('Failed to cancel upload on server:', error)
    }

    this.activeUploads.delete(uploadId)
    this.dispatchStatusEvent(uploadId, 'cancelled')
  }

  async getUploadStatus(uploadId: string): Promise<UploadProgress | null> {
    try {
      const response = await api.get(`/chunked-upload/status/${uploadId}`)
      
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
      const response = await api.get('/chunked-upload/active')
      return response.data.success ? response.data.data : []
    } catch (error) {
      console.error('Failed to list active uploads:', error)
      return []
    }
  }

  private completeUpload(uploadId: string): void {
    const uploadInfo = this.activeUploads.get(uploadId)
    if (!uploadInfo) return

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

    setTimeout(() => {
      this.activeUploads.delete(uploadId)
    }, 5000)
  }

  private handleUploadError(uploadId: string, error: any): void {
    const uploadInfo = this.activeUploads.get(uploadId)
    if (!uploadInfo) return

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

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  getActiveUploadsCount(): number {
    return this.activeUploads.size
  }

  getQueueLength(): number {
    return this.uploadQueue.length
  }
}

export const chunkedUploadService = new ChunkedUploadService()