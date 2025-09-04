import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useFileStore } from '@/stores/files'
import { chunkedUploadService, type UploadProgress } from '@/services/chunkedUploadService'
import { FolderScannerService, type FileEntry, type FolderScanProgress, type FolderScanResult } from '@/services/folderScannerService'

export function useChunkedUpload() {
  const uploads = ref<UploadProgress[]>([])
  const isScanning = ref(false)
  const scanProgress = ref<FolderScanProgress | null>(null)
  const scanResult = ref<FolderScanResult | null>(null)
  const folderScanner = ref<FolderScannerService | null>(null)
  const fileStore = useFileStore()
  
  // Debounce refresh to prevent excessive API calls when multiple uploads complete
  let refreshTimeout: NodeJS.Timeout | null = null
  
  function debouncedRefresh() {
    if (refreshTimeout) {
      clearTimeout(refreshTimeout)
    }
    
    refreshTimeout = setTimeout(() => {
      try {
        fileStore.refreshCurrentPath()
        const treeRoot = document.getElementById('menu')
        if (treeRoot) {
          const targetPath = (fileStore as any)?.state?.value?.currentPath || '/'
          treeRoot.dispatchEvent(new CustomEvent('tree:reorganize', { detail: { targetPath } }))
        }
      } catch {}
      refreshTimeout = null
    }, 1500) // Wait 1.5 seconds after last completion
  }

  // Load persisted uploads on mount
  onMounted(async () => {
    await loadPersistedUploads()
    setupEventListeners()
  })

  onUnmounted(() => {
    removeEventListeners()
  })

  async function loadPersistedUploads() {
    try {
      const activeUploads = await chunkedUploadService.listActiveUploads()
      const restoredIds = new Set<string>()
      
      // First, restore all uploads from IndexedDB (both queued and active)
      await chunkedUploadService.restoreAndStartAllUploads()
      
      // Get the list of restored upload IDs to avoid duplicates
      const persistedIds = await chunkedUploadService.getAllPersistedUploads()
      persistedIds.forEach(id => restoredIds.add(id))
      
      // Add restored uploads to UI (they are now in the queue)
      for (const uploadId of persistedIds) {
        // Check if already in uploads array
        const existingUpload = uploads.value.find(u => u.uploadId === uploadId)
        if (!existingUpload) {
          const status = await chunkedUploadService.getUploadStatus(uploadId)
          if (status) {
            // Check if upload is actively processing or just queued
            const isActivelyUploading = chunkedUploadService.hasActiveUpload(uploadId)
            status.status = isActivelyUploading ? 'uploading' : 'paused'
            uploads.value.push(status)
          }
        }
      }
      
      // Only load server uploads that weren't restored from IndexedDB
      for (const upload of activeUploads) {
        if (restoredIds.has(upload.uploadId)) {
          // Skip uploads that were restored from IndexedDB (already handled above)
          continue
        }
        
        const status = await chunkedUploadService.getUploadStatus(upload.uploadId)
        if (status) {
          // Server-only upload without local file data
          status.status = 'error'
          const existingUpload = uploads.value.find(u => u.uploadId === upload.uploadId)
          if (!existingUpload) {
            uploads.value.push(status)
          }
        }
      }
    } catch (error) {
      console.error('Failed to load persisted uploads:', error)
    }
  }

  function setupEventListeners() {
    window.addEventListener('upload-progress', handleUploadProgress as EventListener)
    window.addEventListener('upload-status-change', handleStatusChange as EventListener)
    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('visibilitychange', handleVisibilityChange)
  }

  function removeEventListeners() {
    window.removeEventListener('upload-progress', handleUploadProgress as EventListener)
    window.removeEventListener('upload-status-change', handleStatusChange as EventListener)
    window.removeEventListener('beforeunload', handleBeforeUnload)
    window.removeEventListener('visibilitychange', handleVisibilityChange)
  }

  function handleUploadProgress(event: CustomEvent) {
    const { uploadId, progress } = event.detail
    updateUploadProgress(uploadId, progress)
  }

  function handleStatusChange(event: CustomEvent) {
    const { uploadId, status } = event.detail
    updateUploadStatus(uploadId, status)

    // Auto-remove completed/cancelled uploads after a short delay
    if (status === 'completed' || status === 'cancelled') {
      setTimeout(() => {
        removeUpload(uploadId)
        // Use debounced refresh to prevent excessive API calls
        if (status === 'completed') {
          debouncedRefresh()
        }
      }, 1000)
    }
  }

  function handleBeforeUnload(event: BeforeUnloadEvent) {
    const hasActiveUploads = uploads.value.some(u => 
      ['uploading', 'paused'].includes(u.status)
    )

    if (hasActiveUploads) {
      event.preventDefault()
      event.returnValue = 'You have active uploads. Are you sure you want to leave?'
      return event.returnValue
    }
  }

  function handleVisibilityChange() {
    if (!document.hidden) {
      // Page became visible, refresh upload statuses
      refreshUploadStatuses()
    }
  }

  async function refreshUploadStatuses() {
    for (const upload of uploads.value) {
      if (['uploading', 'paused'].includes(upload.status)) {
        try {
          const status = await chunkedUploadService.getUploadStatus(upload.uploadId)
          if (status) {
            updateUploadProgress(upload.uploadId, status)
          }
        } catch (error) {
          console.error(`Failed to refresh status for upload ${upload.uploadId}:`, error)
        }
      }
    }
  }

  function updateUploadProgress(uploadId: string, progress: UploadProgress) {
    const index = uploads.value.findIndex(u => u.uploadId === uploadId)
    
    if (index !== -1) {
      uploads.value[index] = { ...progress }
    } else {
      uploads.value.push(progress)
    }
  }

  function updateUploadStatus(uploadId: string, status: UploadProgress['status']) {
    const upload = uploads.value.find(u => u.uploadId === uploadId)
    if (upload) {
      upload.status = status
    }
  }

  async function uploadFiles(items: FileSystemEntry[] | DataTransferItemList | FileList) {
    // Start folder scanning
    isScanning.value = true
    scanProgress.value = null
    scanResult.value = null

    folderScanner.value = new FolderScannerService((progress) => {
      scanProgress.value = progress
    })

    try {
      const result = await folderScanner.value.scanFiles(items)
      scanResult.value = result
      
      // Scanning completed successfully
      return result
    } catch (error) {
      console.error('Folder scanning failed:', error)
      isScanning.value = false
      scanProgress.value = null
      scanResult.value = null
      throw error
    }
  }

  async function startUploads(basePath?: string) {
    if (!scanResult.value) return

    isScanning.value = false
    
    // Process files sequentially to avoid overwhelming the server
    for (const fileEntry of scanResult.value.files) {
      // Skip 0-byte files
      if (fileEntry.file.size === 0) {
        continue
      }
      
      try {
        const uploadId = await chunkedUploadService.startUpload(fileEntry, basePath)
        
        // Add initial progress entry (check for duplicates first)
        const existingUpload = uploads.value.find(u => u.uploadId === uploadId)
        if (!existingUpload) {
          uploads.value.push({
            uploadId,
            fileName: fileEntry.file.name,
            progress: 0,
            uploadedChunks: 0,
            totalChunks: 0,
            uploadedSize: 0,
            totalSize: fileEntry.file.size,
            remainingSize: fileEntry.file.size,
            estimatedTimeRemaining: 0,
            status: 'initialized'
          })
        }

      } catch (error: any) {
        console.error(`Failed to start upload for ${fileEntry.file.name}:`, error)
        
        // Show user-friendly error message
        if (error.message.includes('Authentication required')) {
          alert('Please log in to upload files. You will be redirected to the login page.')
          // Redirect to login if needed
          window.location.href = '/auth/login'
        } else {
          alert(`Failed to start upload for ${fileEntry.file.name}: ${error.message}`)
        }
      }
    }
    
    // Reset scanning state
    scanProgress.value = null
    scanResult.value = null
  }

  function cancelScanning() {
    if (folderScanner.value) {
      folderScanner.value.cancel()
    }
    
    isScanning.value = false
    scanProgress.value = null
    scanResult.value = null
  }

  async function pauseUpload(uploadId: string) {
    try {
      await chunkedUploadService.pauseUpload(uploadId)
    } catch (error) {
      console.error(`Failed to pause upload ${uploadId}:`, error)
    }
  }

  async function resumeUpload(uploadId: string) {
    try {
      // Check if upload exists in service's active uploads (has file data)
      let hasFileData = chunkedUploadService.hasActiveUpload(uploadId)
      
      if (!hasFileData) {
        // Try to restore from IndexedDB
        hasFileData = await chunkedUploadService.restoreUploadFromStorage(uploadId)
      }
      
      if (!hasFileData) {
        // Upload cannot be resumed - no file data available
        const upload = uploads.value.find(u => u.uploadId === uploadId)
        if (upload) {
          upload.status = 'error'
          alert(`Cannot resume upload "${upload.fileName}" - file data not available. Please restart the upload.`)
        }
        return
      }
      
      await chunkedUploadService.resumeUpload(uploadId)
    } catch (error) {
      console.error(`Failed to resume upload ${uploadId}:`, error)
    }
  }

  async function cancelUpload(uploadId: string) {
    try {
      await chunkedUploadService.cancelUpload(uploadId)
      removeUpload(uploadId)
    } catch (error) {
      console.error(`Failed to cancel upload ${uploadId}:`, error)
    }
  }

  function removeUpload(uploadId: string) {
    const index = uploads.value.findIndex(u => u.uploadId === uploadId)
    if (index !== -1) {
      uploads.value.splice(index, 1)
    }
  }

  async function pauseAllUploads() {
    const activeUploads = uploads.value.filter(u => u.status === 'uploading')
    const promises = activeUploads.map(u => pauseUpload(u.uploadId))
    await Promise.allSettled(promises)
  }

  async function resumeAllUploads() {
    const pausedUploads = uploads.value.filter(u => u.status === 'paused')
    const promises = pausedUploads.map(u => resumeUpload(u.uploadId))
    await Promise.allSettled(promises)
  }

  function clearCompleted() {
    uploads.value = uploads.value.filter(u => u.status !== 'completed')
  }

  async function clearAllUploads() {
    try {
      await chunkedUploadService.cancelAllUploads()
    } catch (error) {
      console.error('Failed to clear all uploads:', error)
    } finally {
      uploads.value = []
    }
  }

  // Helper functions
  function getActiveUploadsCount(): number {
    return uploads.value.filter(u => !['completed', 'cancelled'].includes(u.status)).length
  }

  function getTotalProgress(): number {
    if (uploads.value.length === 0) return 0
    
    const totalProgress = uploads.value.reduce((sum, upload) => sum + upload.progress, 0)
    return totalProgress / uploads.value.length
  }

  function getTotalSize(): number {
    return uploads.value.reduce((sum, upload) => sum + upload.totalSize, 0)
  }

  function getUploadedSize(): number {
    return uploads.value.reduce((sum, upload) => sum + upload.uploadedSize, 0)
  }

  return {
    // State
    uploads,
    isScanning,
    scanProgress,
    scanResult,

    // Actions
    uploadFiles,
    startUploads,
    cancelScanning,
    pauseUpload,
    resumeUpload,
    cancelUpload,
    removeUpload,
    pauseAllUploads,
    resumeAllUploads,
    clearCompleted,
    clearAllUploads,

    // Computed helpers
    getActiveUploadsCount,
    getTotalProgress,
    getTotalSize,
    getUploadedSize
  }
}
