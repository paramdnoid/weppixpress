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
    <div
      v-show="isDragOver"
      class="drag-overlay"
    >
      <div class="drag-content">
        <Icon
          icon="tabler:cloud-upload"
          width="48"
          height="48"
          class="text-primary"
        />
        <h4 class="mt-2 mb-1">
          Drop files here
        </h4>
        <p class="text-muted">
          {{ allowFolders ? 'Drop files or folders to upload' : 'Drop files to upload' }}
        </p>
      </div>
    </div>


    <!-- Content slot -->
    <slot />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
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
  maxFileSize: {
    type: Number,
    default: 500 * 1024 * 1024 // 500MB
  },
  allowedTypes: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['upload-started', 'upload-completed', 'upload-failed', 'batch-started'])

const uploadStore = useUploadStore()

// Computed properties
const hasActiveUploads = computed(() => uploadStore.hasActiveUploads)

// Drag and drop state
const isDragOver = ref(false)
const dragCounter = ref(0)

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
      emit('batch-started', batch)
    }
  } catch (error) {
    console.error('Upload failed:', error)
    emit('upload-failed', { error, files })
  }
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