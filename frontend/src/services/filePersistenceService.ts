interface PersistedUpload {
  uploadId: string
  fileName: string
  fileSize: number
  fileType: string
  relativePath: string
  fileData: ArrayBuffer
  fileHash?: string
  session: {
    uploadId: string
    chunkSize: number
    totalChunks: number
    targetPath: string
  }
  currentChunk: number
  uploadedBytes: number
  createdAt: number
  isPreStored?: boolean
}

export class FilePersistenceService {
  private dbName = 'WepPixpress_Uploads'
  private dbVersion = 1
  private storeName = 'uploadFiles'
  private db: IDBDatabase | null = null
  private initPromise: Promise<void> | null = null

  async init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error)
        this.initPromise = null
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        
        // Handle database close/version change events
        this.db.onclose = () => {
          console.warn('IndexedDB connection closed unexpectedly')
          this.db = null
          this.initPromise = null
        }
        
        this.db.onversionchange = () => {
          console.warn('IndexedDB version change detected, closing connection')
          this.db?.close()
          this.db = null
          this.initPromise = null
        }
        
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

    return this.initPromise
  }

  async storeUpload(
    uploadId: string, 
    file: File, 
    relativePath: string, 
    session: PersistedUpload['session'],
    currentChunk: number = 0,
    uploadedBytes: number = 0,
    isPreStored: boolean = false
  ): Promise<void> {
    return this.retryWithBackoff(async () => {
      if (!this.db) {
        await this.init()
      }

      // Check storage quota before storing large files
      if (file.size > 10 * 1024 * 1024) { // 10MB threshold
        const hasSpace = await this.checkStorageQuota(file.size)
        if (!hasSpace) {
          throw new Error('Insufficient storage quota available')
        }
      }

      const fileData = await file.arrayBuffer()
      const fileHash = await this.calculateFileHash(file)
      
      const uploadData: PersistedUpload = {
        uploadId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        relativePath,
        fileData,
        fileHash,
        session,
        currentChunk,
        uploadedBytes,
        createdAt: Date.now(),
        isPreStored
      }

      return new Promise<void>((resolve, reject) => {
        const transaction = this.db!.transaction([this.storeName], 'readwrite')
        const store = transaction.objectStore(this.storeName)
        const request = store.put(uploadData)

        request.onsuccess = () => resolve()
        request.onerror = () => {
          console.error('Failed to store upload:', request.error)
          reject(request.error)
        }
      })
    })
  }

  async getUpload(uploadId: string): Promise<PersistedUpload | null> {
    return this.retryWithBackoff(async () => {
      if (!this.db) {
        await this.init()
      }

      return new Promise<PersistedUpload | null>((resolve, reject) => {
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

  async updateUploadSession(uploadId: string, uploadData: PersistedUpload): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.put(uploadData)

      request.onsuccess = () => resolve()
      request.onerror = () => {
        console.error('Failed to update upload session:', request.error)
        reject(request.error)
      }
    })
  }

  async removeUpload(uploadId: string): Promise<void> {
    return this.retryWithBackoff(async () => {
      if (!this.db) {
        await this.init()
      }

      return new Promise<void>((resolve, reject) => {
        const transaction = this.db!.transaction([this.storeName], 'readwrite')
        const store = transaction.objectStore(this.storeName)
        const request = store.delete(uploadId)

        request.onsuccess = () => {
          console.log(`🗑️ Successfully removed upload ${uploadId} from IndexedDB`)
          resolve()
        }
        request.onerror = () => {
          console.error('❌ Failed to remove upload:', request.error)
          reject(request.error)
        }
      })
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

  async clearPreStoredUploads(): Promise<number> {
    // Clear pre-stored uploads that were never converted to actual uploads
    const uploads = await this.getAllUploads()
    let cleanedCount = 0
    
    // Pre-stored uploads older than 1 hour should be cleaned up
    const cutoff = Date.now() - (60 * 60 * 1000) // 1 hour
    
    for (const upload of uploads) {
      if (upload.isPreStored && upload.createdAt < cutoff) {
        await this.removeUpload(upload.uploadId)
        cleanedCount++
      }
    }
    
    return cleanedCount
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

  async cleanup(): Promise<void> {
    if (this.db) {
      this.db.close()
      this.db = null
      this.initPromise = null
    }
  }

  private async retryWithBackoff<T>(
    operation: () => Promise<T>, 
    maxRetries = 3, 
    baseDelay = 1000
  ): Promise<T> {
    let lastError: Error | null = null
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error
        
        if (attempt === maxRetries) {
          throw lastError
        }
        
        // Exponential backoff with jitter
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000
        await new Promise(resolve => setTimeout(resolve, delay))
        
        // If database was closed, try to reinitialize
        if (!this.db) {
          try {
            await this.init()
          } catch (initError) {
            console.warn('Failed to reinitialize database:', initError)
          }
        }
      }
    }
    
    throw lastError
  }

  async calculateFileHash(file: File): Promise<string> {
    // Calculate SHA-256 hash of first 1MB for fast but unique identification
    const chunkSize = Math.min(file.size, 1024 * 1024) // 1MB max
    const chunk = file.slice(0, chunkSize)
    const buffer = await chunk.arrayBuffer()
    
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    
    return `${hashHex}-${file.size}` // Include file size for additional uniqueness
  }

  async findPreStoredByHash(fileHash: string): Promise<PersistedUpload | null> {
    const uploads = await this.getAllUploads()
    return uploads.find(upload => 
      upload.isPreStored && upload.fileHash === fileHash
    ) || null
  }

  async checkStorageQuota(requiredSpace: number): Promise<boolean> {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate()
        const available = (estimate.quota || 0) - (estimate.usage || 0)
        return available >= requiredSpace
      }
      return true // Assume OK if can't check
    } catch (error) {
      console.warn('Failed to check storage quota:', error)
      return true // Assume OK on error
    }
  }
}

export const filePersistenceService = new FilePersistenceService()