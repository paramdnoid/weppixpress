<template>
  <div
    class="upload-drop-zone"
    :class="{
      'drag-over': isDragOver,
      'upload-active': hasActiveUploads,
      'disabled': disabled
    }"
    @drop="handleDrop"
    @dragenter="handleDragEnter"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
  >
    <!-- Drag overlay -->
    <div v-show="isDragOver" class="drag-overlay">
      <div class="drag-content">
        <Icon icon="tabler:cloud-upload" width="48" height="48" class="text-primary" />
        <h4 class="mt-2 mb-1">Drop files here</h4>
        <p class="text-muted">
          {{ allowFolders ? 'Drop files or folders to upload' : 'Drop files to upload' }}
        </p>
      </div>
    </div>

    <!-- Upload progress overlay -->
    <div v-show="hasActiveUploads && showProgressOverlay" class="upload-overlay">
      <!-- Toolbar buttons (top-right) -->
      <div class="toolbar-buttons">
        <button
          class="btn-toolbar"
          @click="toggleProgress"
          title="Minimize"
        >
          <Icon icon="tabler:minus" width="12" height="12" />
        </button>
        <button
          v-if="hasActiveUploads || hasPausedUploads"
          class="btn-toolbar"
          @click="hasAnyActiveUploads ? pauseAllUploads() : resumeAllUploads()"
          :title="hasAnyActiveUploads ? 'Pause All' : 'Resume All'"
        >
          <Icon
            :icon="hasAnyActiveUploads ? 'tabler:player-pause' : 'tabler:player-play'"
            width="12"
            height="12"
            :class="hasAnyActiveUploads ? 'text-warning' : 'text-success'"
          />
        </button>
        <button
          class="btn-toolbar"
          @click="cancelAllUploads"
          title="Cancel All"
        >
          <Icon icon="tabler:x" width="12" height="12" class="text-danger" />
        </button>
      </div>

      <div class="upload-progress-container">
        <div class="upload-stats">
          <h5 class="mb-2">
            <Icon icon="tabler:upload" width="16" height="16" class="me-2" />
            Uploading {{ activeBatches.length }} batch{{ activeBatches.length > 1 ? 'es' : '' }}
          </h5>
          <div class="progress mb-2" style="height: 8px;">
            <div
              class="progress-bar progress-bar-striped progress-bar-animated"
              :style="{ width: overallProgress + '%' }"
            ></div>
          </div>
          <div class="d-flex justify-content-between">
            <small class="text-muted">
              {{ completedFiles }}/{{ totalFiles }} files completed
            </small>
            <small class="text-muted">
              {{ Math.round(overallProgress) }}%
            </small>
          </div>
          <div class="d-flex justify-content-between">
            <small
              class="text-info cursor-pointer"
              @click="showActiveBatches = !showActiveBatches"
              :title="showActiveBatches ? 'Hide active batches' : 'Show active batches'"
            >
              <Icon :icon="showActiveBatches ? 'tabler:chevron-down' : 'tabler:chevron-right'" width="12" height="12" class="me-1" />
              {{ activeBatches.length }} active batch{{ activeBatches.length > 1 ? 'es' : '' }}
            </small>
            <small class="text-info">
              {{ uploadStore.running }} running
            </small>
          </div>
        </div>

        <!-- Active batches -->
        <div v-show="showActiveBatches" class="batch-list">
          <div
            v-for="batch in activeBatches.slice(0, 3)"
            :key="batch.id"
            class="batch-item mb-2"
          >
            <div class="d-flex justify-content-between align-items-center mb-1">
              <span class="batch-title">{{ getBatchTitle(batch) }}</span>
              <div class="batch-actions">
                <button
                  v-if="batch.status === 'active' || batch.status === 'paused'"
                  class="btn-toolbar me-1"
                  @click="batch.status === 'active' ? pauseBatch(batch.id) : resumeBatch(batch.id)"
                  :title="batch.status === 'active' ? 'Pause' : 'Resume'"
                >
                  <Icon
                    :icon="batch.status === 'active' ? 'tabler:player-pause' : 'tabler:player-play'"
                    width="14"
                    height="14"
                  />
                </button>
                <button
                  class="btn-toolbar"
                  @click="cancelBatch(batch.id)"
                  title="Cancel"
                >
                  <Icon icon="tabler:x" width="14" height="14" />
                </button>
              </div>
            </div>
            <div class="progress" style="height: 4px;">
              <div
                class="progress-bar"
                :class="{
                  'bg-success': batch.status === 'completed',
                  'bg-warning': batch.status === 'paused',
                  'bg-danger': batch.status === 'error'
                }"
                :style="{ width: getBatchProgress(batch) + '%' }"
              ></div>
            </div>
          </div>

          <!-- Completed batches (show briefly) -->
          <div
            v-for="batch in completedBatches.slice(0, 2)"
            :key="batch.id"
            class="batch-item mb-2 completed-batch"
          >
            <div class="d-flex justify-content-between align-items-center mb-1">
              <span class="batch-title text-success">✓ {{ getBatchTitle(batch) }} - Completed!</span>
              <div class="batch-actions">
                <button
                  class="btn btn-sm btn-outline-secondary"
                  @click="uploadStore.removeBatch(batch.id)"
                  title="Close"
                >
                  <Icon icon="tabler:x" width="16" height="16" />
                </button>
              </div>
            </div>
            <div class="progress" style="height: 4px;">
              <div
                class="progress-bar bg-success"
                style="width: 100%"
              ></div>
            </div>
          </div>

          <div v-if="activeBatches.length > 3" class="text-muted">
            <small>+ {{ activeBatches.length - 3 }} more batch{{ activeBatches.length - 3 > 1 ? 'es' : '' }}</small>
          </div>
        </div>

      </div>
    </div>

    <!-- Content slot -->
    <slot></slot>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useUploadStore } from '@/stores/upload'

const props = defineProps({
  disabled: {
    type: Boolean,
    default: false
  },
  allowFolders: {
    type: Boolean,
    default: true
  },
  currentPath: {
    type: String,
    default: '/'
  },
  showProgress: {
    type: Boolean,
    default: true
  },
  maxFileSize: {
    type: Number,
    default: 500 * 1024 * 1024 // 500MB
  },
  allowedTypes: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['upload-started', 'upload-completed', 'upload-failed'])

const uploadStore = useUploadStore()

// Drag and drop state
const isDragOver = ref(false)
const dragCounter = ref(0)

// Progress state
const showProgressOverlay = ref(props.showProgress)
const showActiveBatches = ref(false) // Default: active batches hidden

// Track total files snapshot and completed files counter for consistent progress calculation
const totalFilesSnapshot = ref(0)
const completedFilesCounter = ref(0)

// Watch for batches changes to update total files snapshot
watch(() => uploadStore.batches.map(b => ({ id: b.id, tasks: b.tasks?.length || 0 })), () => {
  const currentTotal = uploadStore.batches.reduce((sum, batch) =>
    sum + (batch.tasks?.length || 0), 0)

  // Update snapshot only if it increases (new batches added) or resets to 0
  if (currentTotal === 0) {
    totalFilesSnapshot.value = 0
    completedFilesCounter.value = 0 // Reset completed files counter when all batches cleared
  } else if (currentTotal > totalFilesSnapshot.value) {
    totalFilesSnapshot.value = currentTotal
  }
  // Don't decrease snapshot during upload to keep progress calculation consistent
}, { immediate: true, deep: true })

// Watch for completed files and accumulate them
watch(() => {
  return uploadStore.batches.map(batch => ({
    id: batch.id,
    completed: batch.tasks?.filter(task => task.status === 'completed').length || 0
  }))
}, (newBatchesData, oldBatchesData) => {
  if (!oldBatchesData) return

  // Calculate new completed files since last update
  let newCompletedFiles = 0

  for (const newBatch of newBatchesData) {
    const oldBatch = oldBatchesData.find(b => b.id === newBatch.id)
    if (oldBatch && newBatch.completed > oldBatch.completed) {
      newCompletedFiles += newBatch.completed - oldBatch.completed
    } else if (!oldBatch && newBatch.completed > 0) {
      // New batch with already completed files
      newCompletedFiles += newBatch.completed
    }
  }

  // Accumulate completed files
  if (newCompletedFiles > 0) {
    completedFilesCounter.value += newCompletedFiles
  }
}, { immediate: true, deep: true })

// Computed properties
const activeBatches = computed(() =>
  uploadStore.batches.filter(batch =>
    batch.status === 'active' || batch.status === 'paused' || batch.status === 'error'
  )
)

// Auto-remove completed batches after a delay
const completedBatches = computed(() =>
  uploadStore.batches.filter(batch => batch.status === 'completed')
)

// Track batches that already have removal timeouts
const batchRemovalTimeouts = new Map()

// Watch for completed batches and remove them after 3 seconds
watch(completedBatches, (newCompleted, oldCompleted) => {
  const oldIds = new Set(oldCompleted?.map(b => b.id) || [])

  // Only set timeout for newly completed batches
  const newlyCompleted = newCompleted.filter(batch => !oldIds.has(batch.id))

  newlyCompleted.forEach(batch => {
    if (!batchRemovalTimeouts.has(batch.id)) {
      const timeoutId = setTimeout(() => {
        uploadStore.removeBatch(batch.id)
        batchRemovalTimeouts.delete(batch.id)
      }, 3000)
      batchRemovalTimeouts.set(batch.id, timeoutId)
    }
  })
})

const hasActiveUploads = computed(() => activeBatches.value.length > 0)

const hasPausedUploads = computed(() =>
  uploadStore.batches.some(batch => batch.status === 'paused')
)

const hasAnyActiveUploads = computed(() =>
  uploadStore.batches.some(batch => batch.status === 'active')
)

const overallProgress = computed(() => {
  // Use snapshot for consistent progress calculation
  const total = totalFilesSnapshot.value || totalFiles.value
  const completed = completedFilesCounter.value

  if (total === 0) return 0

  // Calculate progress based on completed files counter vs total files snapshot
  const progress = (completed / total) * 100

  return Math.min(progress, 100) // Ensure progress doesn't exceed 100%
})

const totalFiles = computed(() => {
  // Return snapshot if available, otherwise calculate dynamically
  if (totalFilesSnapshot.value > 0) {
    return totalFilesSnapshot.value
  }

  // Fallback: calculate dynamically for display purposes
  return uploadStore.batches.reduce((sum, batch) => sum + (batch.tasks?.length || 0), 0)
})

const completedFiles = computed(() => {
  // Return the accumulated completed files counter
  return completedFilesCounter.value
})

// Drag and drop handlers
function handleDragEnter(e) {
  e.preventDefault()
  e.stopPropagation()

  if (props.disabled) return

  dragCounter.value++
  isDragOver.value = true
}

function handleDragOver(e) {
  e.preventDefault()
  e.stopPropagation()

  if (props.disabled) return

  // Set dropEffect for visual feedback
  e.dataTransfer.dropEffect = 'copy'
}

function handleDragLeave(e) {
  e.preventDefault()
  e.stopPropagation()

  dragCounter.value--
  if (dragCounter.value === 0) {
    isDragOver.value = false
  }
}

async function handleDrop(e) {
  e.preventDefault()
  e.stopPropagation()

  dragCounter.value = 0
  isDragOver.value = false

  if (props.disabled) return

  const files = await processDroppedItems(e.dataTransfer.items)
  if (files.length > 0) {
    await uploadFiles(files)
  }
}

// Process dropped items (files and folders)
async function processDroppedItems(items) {
  const files = []

  for (const item of Array.from(items)) {
    if (item.kind === 'file') {
      const entry = item.webkitGetAsEntry()
      if (entry) {
        if (entry.isFile) {
          const file = item.getAsFile()
          if (validateFile(file)) {
            files.push(file)
          }
        } else if (entry.isDirectory && props.allowFolders) {
          const dirFiles = await processDirectory(entry, entry.name)
          files.push(...dirFiles)
        }
      }
    }
  }

  return files
}

// Process directory recursively
async function processDirectory(dirEntry, path = '') {
  const files = []

  return new Promise((resolve) => {
    const reader = dirEntry.createReader()

    const readEntries = () => {
      reader.readEntries(async (entries) => {
        if (entries.length === 0) {
          resolve(files)
          return
        }

        for (const entry of entries) {
          const entryPath = path ? `${path}/${entry.name}` : entry.name

          if (entry.isFile) {
            const file = await new Promise((resolve) => {
              entry.file(resolve)
            })

            if (validateFile(file)) {
              // Add relative path for folder structure
              Object.defineProperty(file, 'webkitRelativePath', {
                value: entryPath,
                writable: false
              })
              files.push(file)
            }
          } else if (entry.isDirectory) {
            const subFiles = await processDirectory(entry, entryPath)
            files.push(...subFiles)
          }
        }

        // Continue reading (directories might have more entries)
        readEntries()
      })
    }

    readEntries()
  })
}

// File validation
function validateFile(file) {
  // Check file size
  if (file.size > props.maxFileSize) {
    // File too large - silently reject
    return false
  }

  // Check file type if restricted
  if (props.allowedTypes.length > 0) {
    const fileType = file.type || ''
    const fileName = file.name || ''
    const fileExt = fileName.split('.').pop()?.toLowerCase()

    const isAllowed = props.allowedTypes.some(type => {
      if (type.includes('/')) {
        // MIME type check
        return fileType.match(new RegExp(type.replace('*', '.*')))
      } else {
        // Extension check
        return fileExt === type.toLowerCase()
      }
    })

    if (!isAllowed) {
      // File type not allowed - silently reject
      return false
    }
  }

  return true
}

// Upload files
async function uploadFiles(files) {
  try {
    emit('upload-started', { files, path: props.currentPath })

    const batch = await uploadStore.startBatch(files, props.currentPath)

    if (batch) {
    }
  } catch (error) {
    console.error('Upload failed:', error)
    emit('upload-failed', { error, files })
  }
}

// Batch control methods
function getBatchTitle(batch) {
  if (!batch.tasks || !Array.isArray(batch.tasks)) {
    return 'Loading...'
  }

  const fileCount = batch.tasks.length
  const folderCount = new Set(
    batch.tasks
      .map(task => task.relativePath?.split('/').slice(0, -1).join('/') || '')
      .filter(path => path)
  ).size

  if (folderCount > 0) {
    return `${fileCount} files in ${folderCount} folder${folderCount > 1 ? 's' : ''}`
  }

  return `${fileCount} file${fileCount > 1 ? 's' : ''}`
}

function getBatchProgress(batch) {
  if (!batch.tasks || !Array.isArray(batch.tasks)) {
    return 0
  }

  let totalBytes = 0
  let uploadedBytes = 0

  for (const task of batch.tasks) {
    totalBytes += task.size || 0
    uploadedBytes += task.uploaded || 0
  }

  return totalBytes > 0 ? (uploadedBytes / totalBytes) * 100 : 0
}

function pauseBatch(batchId) {
  uploadStore.pauseBatch(batchId)
}

function resumeBatch(batchId) {
  uploadStore.resumeBatch(batchId)
}

function cancelBatch(batchId) {
  uploadStore.cancelBatch(batchId)
}

function pauseAllUploads() {
  activeBatches.value.forEach(batch => {
    if (batch && batch.status === 'active') {
      uploadStore.pauseBatch(batch.id)
    }
  })
}

function resumeAllUploads() {
  uploadStore.batches.forEach(batch => {
    if (batch && batch.status === 'paused') {
      uploadStore.resumeBatch(batch.id)
    }
  })
}

function cancelAllUploads() {
  activeBatches.value.forEach(batch => {
    if (batch) {
      uploadStore.cancelBatch(batch.id)
    }
  })
}

function toggleProgress() {
  showProgressOverlay.value = !showProgressOverlay.value
}

// Global drag and drop prevention
function preventGlobalDrop(e) {
  e.preventDefault()
}

onMounted(() => {
  // Prevent default drag and drop behavior on window
  window.addEventListener('dragover', preventGlobalDrop)
  window.addEventListener('drop', preventGlobalDrop)
})

onUnmounted(() => {
  window.removeEventListener('dragover', preventGlobalDrop)
  window.removeEventListener('drop', preventGlobalDrop)

  // Clear any pending batch removal timeouts
  batchRemovalTimeouts.forEach(timeoutId => clearTimeout(timeoutId))
  batchRemovalTimeouts.clear()
})
</script>

<style scoped>
.upload-drop-zone {
  position: relative;
  min-height: 100%;
  transition: all 0.2s ease;
}

.upload-drop-zone.disabled {
  pointer-events: none;
  opacity: 0.6;
}

.drag-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(var(--tblr-primary-rgb), 0.1);
  border: 2px dashed var(--tblr-primary);
  border-radius: 8px;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: pulse 1.5s ease-in-out infinite;
}

.drag-content {
  text-align: center;
  pointer-events: none;
}

.upload-overlay {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 350px;
  background: rgba(var(--tblr-bg-surface-rgb), 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(var(--tblr-border-color-rgb), 0.3);
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  z-index: 1001;
  max-height: calc(100vh - 140px);
  overflow-y: auto;
}

.batch-item {
  padding: 0.5rem;
  background: var(--tblr-bg-surface-secondary);
  border-radius: 4px;
  border: 1px solid var(--tblr-border-color-light);
}

.batch-title {
  font-size: 0.875rem;
  font-weight: 500;
}

.batch-actions {
  display: flex;
  gap: 0.25rem;
}


@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.02);
  }
}

/* Responsive design */
@media (max-width: 768px) {
  .upload-overlay {
    position: fixed;
    top: 10px;
    left: 10px;
    right: 10px;
    width: auto;
    max-height: 50vh;
  }
}

/* Upload zone states */
.upload-drop-zone.drag-over {
  background: rgba(var(--tblr-primary-rgb), 0.05);
}

.upload-drop-zone.upload-active::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 4px;
  height: 100%;
  background: var(--tblr-success);
  animation: uploadPulse 2s ease-in-out infinite;
  z-index: 1;
}

@keyframes uploadPulse {
  0%, 100% {
    opacity: 0.5;
  }
  50% {
    opacity: 1;
  }
}

.completed-batch {
  background-color: rgba(var(--tblr-success-rgb), 0.1) !important;
  border-color: var(--tblr-success) !important;
  animation: fadeIn 0.5s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.cursor-pointer {
  cursor: pointer;
  user-select: none;
}

.cursor-pointer:hover {
  opacity: 0.8;
}

/* Action buttons styling */
.btn-action {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.btn-action:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Toolbar buttons */
.toolbar-buttons {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 2px;
  z-index: 1;
}

.btn-toolbar {
  width: 28px;
  height: 28px;
  border: none;
  background: rgba(var(--tblr-gray-600-rgb), 0.1);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
  color: var(--tblr-gray-600);
}

.btn-toolbar:hover {
  background: rgba(var(--tblr-gray-600-rgb), 0.15);
  color: var(--tblr-gray-700);
  transform: scale(1.05);
}

.btn-toolbar:active {
  background: rgba(var(--tblr-gray-600-rgb), 0.2);
  transform: scale(0.95);
}
</style>