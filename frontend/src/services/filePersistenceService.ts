interface PersistedUpload {
  uploadId: string
  fileName: string
  fileSize: number
  fileType: string
  relativePath: string
  fileData: ArrayBuffer
  session: {
    uploadId: string
    chunkSize: number
    totalChunks: number
    targetPath: string
  }
  currentChunk: number
  uploadedBytes: number
  createdAt: number
}

export class FilePersistenceService {
  private dbName = 'WepPixpress_Uploads'
  private dbVersion = 1
  private storeName = 'uploadFiles'
  private db: IDBDatabase | null = null

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'uploadId' })
          store.createIndex('fileName', 'fileName', { unique: false })
          store.createIndex('createdAt', 'createdAt', { unique: false })
        }
      }
    })
  }

  async storeUpload(
    uploadId: string, 
    file: File, 
    relativePath: string, 
    session: PersistedUpload['session'],
    currentChunk: number = 0,
    uploadedBytes: number = 0
  ): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    const fileData = await file.arrayBuffer()
    
    const uploadData: PersistedUpload = {
      uploadId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      relativePath,
      fileData,
      session,
      currentChunk,
      uploadedBytes,
      createdAt: Date.now()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.put(uploadData)

      request.onsuccess = () => resolve()
      request.onerror = () => {
        console.error('Failed to store upload:', request.error)
        reject(request.error)
      }
    })
  }

  async getUpload(uploadId: string): Promise<PersistedUpload | null> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.get(uploadId)

      request.onsuccess = () => {
        resolve(request.result || null)
      }
      request.onerror = () => {
        console.error('Failed to get upload:', request.error)
        reject(request.error)
      }
    })
  }

  async getAllUploads(): Promise<PersistedUpload[]> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.getAll()

      request.onsuccess = () => {
        resolve(request.result || [])
      }
      request.onerror = () => {
        console.error('Failed to get all uploads:', request.error)
        reject(request.error)
      }
    })
  }

  async updateUploadProgress(uploadId: string, currentChunk: number, uploadedBytes: number): Promise<void> {
    const upload = await this.getUpload(uploadId)
    if (!upload) return

    upload.currentChunk = currentChunk
    upload.uploadedBytes = uploadedBytes

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.put(upload)

      request.onsuccess = () => resolve()
      request.onerror = () => {
        console.error('Failed to update upload progress:', request.error)
        reject(request.error)
      }
    })
  }

  async removeUpload(uploadId: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.delete(uploadId)

      request.onsuccess = () => resolve()
      request.onerror = () => {
        console.error('Failed to remove upload:', request.error)
        reject(request.error)
      }
    })
  }

  async restoreFileFromUpload(persistedUpload: PersistedUpload): Promise<File> {
    const blob = new Blob([persistedUpload.fileData], { type: persistedUpload.fileType })
    return new File([blob], persistedUpload.fileName, { 
      type: persistedUpload.fileType,
      lastModified: persistedUpload.createdAt
    })
  }

  async clearOldUploads(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    // Clear uploads older than 7 days by default
    const cutoff = Date.now() - maxAgeMs
    const uploads = await this.getAllUploads()
    
    for (const upload of uploads) {
      if (upload.createdAt < cutoff) {
        await this.removeUpload(upload.uploadId)
      }
    }
  }

  async getStorageUsage(): Promise<{ used: number; quota: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate()
      return {
        used: estimate.usage || 0,
        quota: estimate.quota || 0
      }
    }
    return { used: 0, quota: 0 }
  }

  async cleanupCompletedUploads(): Promise<number> {
    if (!this.db) return 0

    const uploads = await this.getAllUploads()
    let cleanedCount = 0

    // Import api service dynamically to avoid circular imports
    const { default: api } = await import('@/api/axios')

    for (const upload of uploads) {
      // Remove uploads that are likely completed (no session on server means completed/expired)
      try {
        await api.get(`/upload/chunked/status/${upload.uploadId}`)
        // If we get here, upload session still exists on server, keep it
      } catch (error: any) {
        // If upload session not found on server (404) or unauthorized (401), remove it
        if (error.response?.status === 404 || error.response?.status === 401) {
          await this.removeUpload(upload.uploadId)
          cleanedCount++
        }
        // For other errors (network issues, etc), keep the upload
      }
    }

    return cleanedCount
  }
}

export const filePersistenceService = new FilePersistenceService()