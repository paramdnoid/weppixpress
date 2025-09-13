import { defineStore } from 'pinia'
import { ref, shallowRef, readonly } from 'vue'
import { uploadApi } from '@/api/upload'

export type UploadStatus = 'queued' | 'uploading' | 'paused' | 'completed' | 'error' | 'canceled' | 'waiting_files'

export interface UploadTask {
  id: string
  file: File | null
  relativePath: string
  size: number
  uploaded: number
  status: UploadStatus
  error?: string
  sessionId: string
  fileId: string
  startedAt?: number
  updatedAt?: number
}

export interface UploadBatch {
  id: string
  sessionId: string
  targetPath: string
  tasks: UploadTask[]
  status: 'active' | 'paused' | 'completed' | 'error'
  createdAt: number
}

export const useUploadStore = defineStore('upload', () => {
  const batches = shallowRef<UploadBatch[]>([])
  const concurrency = ref<number>(
    // Auto-adjust based on connection and CPU capabilities
    navigator.hardwareConcurrency > 4 ? 8 : 6
  )
  const chunkSize = ref<number>(2 * 1024 * 1024) // 2MB - smaller chunks for faster processing
  const running = ref<number>(0)
  const integrity = ref<{ enabled: boolean; algorithm: 'sha-256' | 'none' }>({
    enabled: false,
    algorithm: 'sha-256'
  })

  let hashWorker: Worker | null = null
  let persistTimeout: number | null = null

  function getWorker() {
    if (!hashWorker) {
      try {
        // @ts-ignore
        hashWorker = new Worker(new URL('@/workers/hashWorker.ts', import.meta.url), { type: 'module' })
      } catch (error) {
        console.warn('Hash worker not available:', error)
      }
    }
    return hashWorker
  }

  function findTask(taskId: string): { batch: UploadBatch, task: UploadTask } | null {
    for (const b of batches.value) {
      const t = b.tasks.find(t => t.id === taskId)
      if (t) return { batch: b, task: t }
    }
    return null
  }

  function enqueueNext() {
    // Start up to concurrency limit
    if (running.value >= concurrency.value) return
    const available = concurrency.value - running.value

    const queued: UploadTask[] = []
    for (const b of batches.value) {
      if (b.status !== 'active') continue
      for (const t of b.tasks) {
        if (t.status === 'queued') {
          queued.push(t)
        }
      }
    }

    const toStart = queued.slice(0, available)
    toStart.forEach(task => startTask(task))
  }

  async function startTask(task: UploadTask) {
    if (task.status === 'uploading') return
    task.status = 'uploading'
    task.startedAt = task.startedAt || Date.now()
    running.value++

    try {
      if (!task.file) {
        task.status = 'waiting_files'
        return
      }

      // Optimize for small files - skip offset check if file is small and this is the first attempt
      const isSmallFile = task.size <= chunkSize.value
      let offset = 0

      if (!isSmallFile || task.uploaded > 0) {
        // Only check offset for large files or resumed uploads
        const offsetRes = await uploadApi.getFileOffset(task.sessionId, task.fileId)
        offset = Math.max(0, offsetRes.received || 0)
      }

      task.uploaded = offset
      let lastUpdateTime = Date.now()

      while (task.status === 'uploading' && offset < task.size) {
        const end = Math.min(task.size, offset + chunkSize.value)
        const chunk = task.file.slice(offset, end)

        // Skip integrity checking for performance (can be enabled later if needed)
        await uploadApi.uploadChunk(task.sessionId, task.fileId, offset, chunk)
        offset = end
        task.uploaded = offset
        task.updatedAt = Date.now()

        // Reduce reactivity updates frequency - only update every 100ms or on completion
        const now = Date.now()
        if (isSmallFile || now - lastUpdateTime > 100 || offset >= task.size) {
          batches.value = [...batches.value]
          lastUpdateTime = now
        }
      }

      if (task.status === 'uploading') {
        // Finalize
        await uploadApi.completeFile(task.sessionId, task.fileId)
        task.status = 'completed'
        task.updatedAt = Date.now()

        // Force reactivity update after task completion
        batches.value = [...batches.value]

        // Check if batch is complete - do this BEFORE finally block
        const batch = batches.value.find(b => b.id === task.sessionId)
        if (batch) {
          const completedTasks = batch.tasks.filter(t => t.status === 'completed')
          const failedTasks = batch.tasks.filter(t => t.status === 'error' || t.status === 'canceled')
          const totalFinished = completedTasks.length + failedTasks.length
          const allFinished = totalFinished === batch.tasks.length


          if (allFinished && batch.status !== 'completed') {
            batch.status = 'completed'

            // Complete session on backend
            try {
              await uploadApi.completeSession(task.sessionId)

              // Emit completion event
              const completionEvent = new CustomEvent('upload-batch-completed', {
                detail: { batch, tasks: batch.tasks }
              })
              window.dispatchEvent(completionEvent)
            } catch (error) {
              console.error('❌ Failed to complete session:', error)
            }

            // Force another reactivity update for completed batch
            batches.value = [...batches.value]
          }
        }
      }
    } catch (e: any) {
      task.status = 'error'
      task.error = e?.response?.data?.error || e?.message || 'Upload failed'
    } finally {
      running.value = Math.max(0, running.value - 1)
      // Try starting more tasks
      enqueueNext()
    }
  }

  async function startBatch(files: File[], currentPath: string) {
    if (!files || files.length === 0) return null

    // Check if user is authenticated
    const token = localStorage.getItem('accessToken')
    if (!token) {
      throw new Error('Authentication required. Please log in to upload files.')
    }

    let session
    try {
      // Create session first
      session = await uploadApi.createSession(currentPath || '/')
    } catch (error: any) {
      console.error('Failed to create upload session:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
        url: error.config?.url,
        headers: error.config?.headers
      })
      throw error
    }

    // Prepare file descriptors
    const inputs = files.map(f => ({
      path: (f as any).webkitRelativePath && (f as any).webkitRelativePath.length > 0
        ? (f as any).webkitRelativePath.replace(/^\/+/, '')
        : f.name,
      size: f.size
    }))

    // Register in chunks to avoid large JSON bodies - increased batch size for better performance
    const byPath = new Map<string, string>()
    const chunkBatch = 2000
    for (let i = 0; i < inputs.length; i += chunkBatch) {
      const slice = inputs.slice(i, i + chunkBatch)
      const reg = await uploadApi.registerFiles(session.id, slice)
      for (const r of reg.files) byPath.set(r.path, r.fileId)
    }

    const batch: UploadBatch = {
      id: session.id,
      sessionId: session.id,
      targetPath: currentPath,
      createdAt: Date.now(),
      status: 'active',
      tasks: files.map((f) => {
        const rel = (f as any).webkitRelativePath && (f as any).webkitRelativePath.length > 0
          ? (f as any).webkitRelativePath.replace(/^\/+/, '')
          : f.name
        const fileId = byPath.get(rel)!
        return {
          id: `${session.id}:${fileId}`,
          file: f,
          relativePath: rel,
          size: f.size,
          uploaded: 0,
          status: 'queued' as UploadStatus,
          sessionId: session.id,
          fileId,
        }
      })
    }

    batches.value = [batch, ...batches.value]
    persistImmediate() // Persist immediately for new batches

    // Start initial tasks
    enqueueNext()
    return batch
  }

  function pauseTask(taskId: string) {
    const found = findTask(taskId)
    if (!found) return
    found.task.status = 'paused'
    debouncedPersist()
  }

  function resumeTask(taskId: string) {
    const found = findTask(taskId)
    if (!found || found.task.status !== 'paused') return
    found.task.status = 'queued'
    debouncedPersist()
    enqueueNext()
  }

  function cancelTask(taskId: string) {
    const found = findTask(taskId)
    if (!found) return
    found.task.status = 'canceled'
    debouncedPersist()
  }

  function pauseBatch(batchId: string) {
    const batch = batches.value.find(b => b.id === batchId)
    if (!batch) return

    batch.status = 'paused'
    if (batch.tasks && Array.isArray(batch.tasks)) {
      batch.tasks.forEach(task => {
        if (task.status === 'uploading' || task.status === 'queued') {
          task.status = 'paused'
        }
      })
    }

    // Trigger reactivity
    batches.value = [...batches.value]
    debouncedPersist()
  }

  function resumeBatch(batchId: string) {
    const batch = batches.value.find(b => b.id === batchId)
    if (!batch || batch.status !== 'paused') return

    batch.status = 'active'
    if (batch.tasks && Array.isArray(batch.tasks)) {
      batch.tasks.forEach(task => {
        if (task.status === 'paused') {
          task.status = 'queued'
        }
      })
    }

    // Trigger reactivity
    batches.value = [...batches.value]
    debouncedPersist()
    enqueueNext()
  }

  function cancelBatch(batchId: string) {
    const batch = batches.value.find(b => b.id === batchId)
    if (!batch) return

    batch.status = 'error'
    if (batch.tasks && Array.isArray(batch.tasks)) {
      batch.tasks.forEach(task => {
        if (task.status !== 'completed') {
          task.status = 'canceled'
        }
      })
    }

    // Trigger reactivity
    batches.value = [...batches.value]
    debouncedPersist()
  }

  function removeBatch(batchId: string) {
    const index = batches.value.findIndex(b => b.id === batchId)
    if (index >= 0) {
      batches.value.splice(index, 1)
      debouncedPersist()
    }
  }

  function clearCompleted() {
    batches.value = batches.value.filter(batch =>
      batch.status !== 'completed' &&
      !batch.tasks.every(task => task.status === 'completed' || task.status === 'canceled')
    )
    debouncedPersist()
  }

  function debouncedPersist() {
    // Debounce persistence to avoid frequent localStorage writes
    if (persistTimeout) {
      clearTimeout(persistTimeout)
    }
    persistTimeout = window.setTimeout(() => {
      persistImmediate()
      persistTimeout = null
    }, 500) // Wait 500ms before persisting
  }

  function persistImmediate() {
    try {
      // Only persist incomplete batches and essential data to avoid quota issues
      const incompleteBatches = batches.value.filter(batch =>
        batch.status === 'active' || batch.status === 'paused'
      )

      // Limit to recent batches and reduce data size
      const recentBatches = incompleteBatches
        .filter(batch => Date.now() - batch.createdAt < 2 * 60 * 60 * 1000) // Only last 2 hours
        .slice(0, 5) // Maximum 5 batches

      const persistData = recentBatches.map(batch => ({
        id: batch.id,
        sessionId: batch.sessionId,
        targetPath: batch.targetPath,
        status: batch.status,
        createdAt: batch.createdAt,
        tasks: batch.tasks.map(task => ({
          id: task.id,
          relativePath: task.relativePath,
          size: task.size,
          uploaded: task.uploaded,
          status: task.status,
          sessionId: task.sessionId,
          fileId: task.fileId,
          // Don't persist File objects or error messages to save space
        }))
      }))

      const jsonData = JSON.stringify(persistData)

      // Check size before storing (aim for under 2MB to be safe)
      if (jsonData.length > 2 * 1024 * 1024) {
        // If still too large, only persist batch metadata
        const minimalData = recentBatches.map(batch => ({
          id: batch.id,
          sessionId: batch.sessionId,
          targetPath: batch.targetPath,
          status: batch.status,
          createdAt: batch.createdAt,
          taskCount: batch.tasks.length
        }))
        localStorage.setItem('upload_batches', JSON.stringify(minimalData))
      } else {
        localStorage.setItem('upload_batches', jsonData)
      }
    } catch (error) {
      // If still failing, clear the storage and try with minimal data
      if (error.name === 'QuotaExceededError') {
        try {
          localStorage.removeItem('upload_batches')
          console.warn('Cleared upload state due to quota exceeded. Upload resume may not work.')
        } catch (e) {
          console.warn('Failed to clear upload state:', e)
        }
      } else {
        console.warn('Failed to persist upload state:', error)
      }
    }
  }

  function loadPersisted() {
    try {
      const stored = localStorage.getItem('upload_batches')
      if (stored) {
        const data = JSON.parse(stored)
        // Filter out old or invalid batches
        const validBatches = data.filter((batch: any) =>
          batch.id &&
          batch.createdAt &&
          Date.now() - batch.createdAt < 24 * 60 * 60 * 1000 // 24 hours
        )
        batches.value = validBatches
      }
    } catch (error) {
      console.warn('Failed to load persisted upload state:', error)
    }
  }

  // Load persisted state on initialization
  loadPersisted()

  return {
    batches: readonly(batches),
    concurrency,
    chunkSize,
    running: readonly(running),
    integrity,
    startBatch,
    pauseTask,
    resumeTask,
    cancelTask,
    pauseBatch,
    resumeBatch,
    cancelBatch,
    removeBatch,
    clearCompleted,
    persistImmediate // Export for critical saves
  }
})