<template>
  <div v-if="uploads.length > 0">
    <!-- Upload Toast (matching FolderScanModal design) -->
    <div
      class="toast-container position-fixed bottom-0 end-0 p-3"
      style="z-index: 1080"
    >
      <div
        class="toast show shadow-sm upload-toast"
        role="alert"
        aria-live="polite"
        aria-atomic="true"
      >
        <div
          class="toast-header d-flex align-items-center cursor-pointer"
          @click="toggleCollapsed"
        >
          <Icon
            icon="mdi:cloud-upload"
            width="20"
            height="20"
            class="me-2 text-primary"
          />
          <small class="me-auto">Uploads</small>
          <small
            v-if="hasActiveUploads"
            class="text-muted me-2"
          >{{ Math.round(getTotalProgress()) }}%</small>
          <div class="d-flex align-items-center gap-1">
            <button
              v-if="hasActiveUploads"
              type="button"
              class="btn btn-icon btn-sm"
              :class="{ 'btn-ghost-warning': !allPaused, 'btn-ghost-success': allPaused }"
              :title="allPaused ? 'Resume all' : 'Pause all'"
              @click.stop="toggleAllUploads"
            >
              <Icon
                :icon="allPaused ? 'mdi:play' : 'mdi:pause'"
                width="14"
                height="14"
              />
            </button>
            <button 
              type="button" 
              class="btn-close ms-1" 
              aria-label="Minimize"
              @click.stop="isCollapsed = true"
            />
          </div>
        </div>

        <div
          v-show="!isCollapsed"
          class="toast-body"
        >
          <div class="upload-info">
            <div
              v-for="upload in uploads"
              :key="upload.uploadId"
              class="upload-item"
            >
              <div class="info-row">
                <div class="file-info">
                  <Icon
                    :icon="getFileIcon(upload.fileName)"
                    width="16"
                    height="16"
                    class="me-2 text-primary"
                  />
                  <span
                    class="file-name text-truncate"
                    :title="upload.fileName"
                  >{{ upload.fileName }}</span>
                </div>
                <div class="upload-actions">
                  <small class="text-muted me-2">{{ Math.round(upload.progress) }}%</small>
                  <button
                    v-if="upload.status === 'uploading'"
                    type="button"
                    class="btn btn-icon btn-sm btn-ghost-warning"
                    title="Pause"
                    @click="pauseUpload(upload.uploadId)"
                  >
                    <Icon
                      icon="mdi:pause"
                      width="12"
                      height="12"
                    />
                  </button>
                  <button
                    v-else-if="upload.status === 'paused'"
                    type="button"
                    class="btn btn-icon btn-sm btn-ghost-success"
                    title="Resume"
                    @click="resumeUpload(upload.uploadId)"
                  >
                    <Icon
                      icon="mdi:play"
                      width="12"
                      height="12"
                    />
                  </button>
                  <button
                    v-if="upload.status !== 'completed'"
                    type="button"
                    class="btn btn-icon btn-sm btn-ghost-danger"
                    :title="upload.status === 'error' ? 'Remove' : 'Cancel'"
                    @click="cancelUpload(upload.uploadId)"
                  >
                    <Icon
                      icon="mdi:close"
                      width="12"
                      height="12"
                    />
                  </button>
                  <button
                    v-if="upload.status === 'completed'"
                    type="button"
                    class="btn btn-icon btn-sm btn-ghost-success"
                    title="Remove"
                    @click="removeCompleted(upload.uploadId)"
                  >
                    <Icon
                      icon="mdi:check"
                      width="12"
                      height="12"
                    />
                  </button>
                </div>
              </div>
              
              <div class="file-details">
                <small class="text-muted">
                  {{ formatFileSize(upload.totalSize) }}
                  <span v-if="upload.speed && upload.status === 'uploading'">
                    • {{ formatSpeed(upload.speed) }}
                  </span>
                  <span v-if="upload.eta && upload.status === 'uploading'">
                    • {{ upload.eta }} left
                  </span>
                  <span v-if="upload.status !== 'uploading'">
                    • {{ getStatusText(upload.status) }}
                  </span>
                </small>
              </div>

              <div
                class="progress mt-1"
                style="height: 4px;"
              >
                <div
                  class="progress-bar"
                  :class="{
                    'bg-success': upload.status === 'completed',
                    'bg-danger': upload.status === 'error',
                    'bg-warning': upload.status === 'paused',
                    'bg-primary': upload.status === 'uploading' || upload.status === 'initialized'
                  }"
                  :style="{ width: upload.progress + '%' }"
                  role="progressbar"
                />
              </div>
            </div>
          </div>

          <div class="d-flex justify-content-end align-items-center gap-2">
            <button
              type="button"
              class="btn btn-outline-secondary btn-sm"
              @click="clearAll"
            >
              Clear All
            </button>
            <button
              v-if="hasCompletedUploads"
              type="button"
              class="btn btn-outline-secondary btn-sm"
              @click="clearCompleted"
            >
              Clear Completed
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { UploadProgress } from '@/services/chunkedUploadService'

interface Props {
  uploads: UploadProgress[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  pause: [uploadId: string]
  resume: [uploadId: string] 
  cancel: [uploadId: string]
  remove: [uploadId: string]
  pauseAll: []
  resumeAll: []
  clearCompleted: []
  clearAll: []
}>()

const isCollapsed = ref(false)

const activeUploadsCount = computed(() => 
  props.uploads.filter(u => !['completed', 'cancelled'].includes(u.status)).length
)

const hasActiveUploads = computed(() => 
  props.uploads.some(u => ['uploading', 'paused', 'error'].includes(u.status))
)

const hasCompletedUploads = computed(() =>
  props.uploads.some(u => u.status === 'completed')
)

const allPaused = computed(() => {
  const controllable = props.uploads.filter(u => u.status === 'uploading' || u.status === 'paused')
  return controllable.length > 0 && controllable.every(u => u.status === 'paused')
})

function toggleCollapsed() {
  isCollapsed.value = !isCollapsed.value
}

function toggleAllUploads() {
  if (allPaused.value) {
    emit('resumeAll')
  } else {
    emit('pauseAll')
  }
}

function pauseUpload(uploadId: string) {
  emit('pause', uploadId)
}

function resumeUpload(uploadId: string) {
  emit('resume', uploadId)
}

function cancelUpload(uploadId: string) {
  emit('cancel', uploadId)
}

function removeCompleted(uploadId: string) {
  emit('remove', uploadId)
}

function clearCompleted() {
  emit('clearCompleted')
}

function clearAll() {
  emit('clearAll')
}

function getFileIcon(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase()
  
  const iconMap: Record<string, string> = {
    // Images
    jpg: 'mdi:file-image',
    jpeg: 'mdi:file-image',
    png: 'mdi:file-image',
    gif: 'mdi:file-image',
    svg: 'mdi:file-image',
    webp: 'mdi:file-image',
    // Videos
    mp4: 'mdi:file-video',
    avi: 'mdi:file-video',
    mov: 'mdi:file-video',
    mkv: 'mdi:file-video',
    webm: 'mdi:file-video',
    // Documents
    pdf: 'mdi:file-pdf-box',
    doc: 'mdi:file-word',
    docx: 'mdi:file-word',
    xls: 'mdi:file-excel',
    xlsx: 'mdi:file-excel',
    ppt: 'mdi:file-powerpoint',
    pptx: 'mdi:file-powerpoint',
    txt: 'mdi:file-document',
    // Archives
    zip: 'mdi:folder-zip',
    rar: 'mdi:folder-zip',
    '7z': 'mdi:folder-zip',
    tar: 'mdi:folder-zip',
    gz: 'mdi:folder-zip',
    // Code
    js: 'mdi:language-javascript',
    ts: 'mdi:language-typescript',
    html: 'mdi:language-html5',
    css: 'mdi:language-css3',
    vue: 'mdi:vuejs',
    py: 'mdi:language-python',
    java: 'mdi:language-java',
    cpp: 'mdi:language-cpp',
    php: 'mdi:language-php',
    // Default
    default: 'mdi:file'
  }

  return iconMap[ext || ''] || iconMap.default
}

function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    initialized: 'Initializing...',
    uploading: 'Uploading...',
    paused: 'Paused',
    completed: 'Completed',
    error: 'Failed',
    cancelled: 'Cancelled'
  }
  
  return statusMap[status] || status
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function formatSpeed(bytesPerSecond: number): string {
  return `${formatFileSize(bytesPerSecond)}/s`
}

function getTotalProgress(): number {
  const activeUploads = props.uploads.filter(u => u.status !== 'completed' && u.status !== 'cancelled')
  if (activeUploads.length === 0) return 100
  return activeUploads.reduce((sum, upload) => sum + upload.progress, 0) / activeUploads.length
}
</script>

<style scoped>
/* Keep it compact like a toast - matching FolderScanModal */
.upload-toast { 
  width: 380px; 
  max-width: 90vw; 
}

.toast-header { 
  padding: .5rem .75rem; 
}

.toast-body { 
  padding: 0; 
}

.cursor-pointer {
  cursor: pointer;
}

.upload-info { 
  background: var(--tblr-bg-surface-secondary); 
  border-radius: 6px; 
  padding: .5rem .625rem;
  max-height: 35vh;
  overflow-y: auto;
  overflow-x: hidden;
}

.upload-item {
  margin-bottom: .75rem;
}

.upload-item:last-child {
  margin-bottom: 0;
}

.info-row { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  gap: .5rem; 
  margin-bottom: .25rem; 
}

.file-info {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.file-name {
  font-weight: 500;
  color: var(--tblr-text);
  max-width: 200px;
}

.upload-actions {
  display: flex;
  align-items: center;
  gap: .25rem;
  flex-shrink: 0;
}

.file-details {
  margin-top: .25rem;
  padding-left: 2rem;
}

.progress { 
  height: 4px; 
  border-radius: 3px; 
  background: var(--tblr-bg-surface-secondary); 
  overflow: hidden; 
  margin-left: 2rem;
}

.progress-bar { 
  transition: width .25s ease; 
}

/* Custom scrollbar for upload info */
.upload-info::-webkit-scrollbar {
  width: 4px;
}

.upload-info::-webkit-scrollbar-track {
  background: transparent;
}

.upload-info::-webkit-scrollbar-thumb {
  background: var(--tblr-border-color);
  border-radius: 2px;
}

.upload-info::-webkit-scrollbar-thumb:hover {
  background: var(--tblr-border-color-dark);
}

@media (max-width: 576px) {
  .upload-toast { 
    width: 95vw; 
  }
  
  .file-name {
    max-width: 150px;
  }
  
  .upload-info {
    max-height: 40vh;
  }
}
</style>
