<template>
  <div v-if="uploads.length > 0" class="upload-queue">
    <div class="queue-header" @click="toggleCollapsed">
      <div class="queue-title">
        <Icon icon="mdi:cloud-upload" width="20" height="20" />
        <span>Uploads ({{ activeUploadsCount }})</span>
      </div>
      <div class="queue-controls">
        <button 
          v-if="hasActiveUploads"
          type="button" 
          class="btn-icon" 
          :class="{ 'btn-pause': !allPaused, 'btn-resume': allPaused }"
          @click.stop="toggleAllUploads"
          :title="allPaused ? 'Resume all' : 'Pause all'"
        >
          <Icon :icon="allPaused ? 'mdi:play' : 'mdi:pause'" width="16" height="16" />
        </button>
        <button 
          type="button" 
          class="btn-icon btn-toggle" 
          :class="{ 'rotated': !isCollapsed }"
        >
          <Icon icon="mdi:chevron-up" width="16" height="16" />
        </button>
      </div>
    </div>

    <div v-show="!isCollapsed" class="queue-content">
      <div class="upload-items">
        <div 
          v-for="upload in uploads" 
          :key="upload.uploadId"
          class="upload-item"
          :class="{ 
            'completed': upload.status === 'completed',
            'error': upload.status === 'error',
            'paused': upload.status === 'paused'
          }"
        >
          <div class="upload-info">
            <div class="file-icon">
              <Icon :icon="getFileIcon(upload.fileName)" width="20" height="20" />
            </div>
            <div class="file-details">
              <div class="file-name" :title="upload.fileName">{{ upload.fileName }}</div>
              <div class="file-stats">
                <span class="file-size">{{ formatFileSize(upload.totalSize) }}</span>
                <span class="separator">•</span>
                <span class="upload-speed" v-if="upload.speed && upload.status === 'uploading'">
                  {{ formatSpeed(upload.speed) }}
                </span>
                <span class="upload-eta" v-if="upload.eta && upload.status === 'uploading'">
                  {{ upload.eta }} left
                </span>
                <span class="upload-status" v-if="upload.status !== 'uploading'">
                  {{ getStatusText(upload.status) }}
                </span>
              </div>
            </div>
          </div>

          <div class="upload-progress">
            <div class="progress-bar-container">
              <div 
                class="progress-bar"
                :class="`progress-${upload.status}`"
                :style="`width: ${upload.progress}%`"
              />
            </div>
            <div class="progress-text">{{ Math.round(upload.progress) }}%</div>
          </div>

          <div class="upload-actions">
            <button 
              v-if="upload.status === 'uploading'"
              type="button" 
              class="btn-icon btn-pause"
              @click="pauseUpload(upload.uploadId)"
              title="Pause upload"
            >
              <Icon icon="mdi:pause" width="14" height="14" />
            </button>
            <button 
              v-else-if="upload.status === 'paused'"
              type="button" 
              class="btn-icon btn-resume"
              @click="resumeUpload(upload.uploadId)"
              title="Resume upload"
            >
              <Icon icon="mdi:play" width="14" height="14" />
            </button>
            <button 
              v-if="upload.status !== 'completed'"
              type="button" 
              class="btn-icon btn-cancel"
              @click="cancelUpload(upload.uploadId)"
              :title="upload.status === 'error' ? 'Remove' : 'Cancel upload'"
            >
              <Icon icon="mdi:close" width="14" height="14" />
            </button>
            <button 
              v-if="upload.status === 'completed'"
              type="button" 
              class="btn-icon btn-remove"
              @click="removeCompleted(upload.uploadId)"
              title="Remove from list"
            >
              <Icon icon="mdi:check" width="14" height="14" />
            </button>
          </div>
        </div>
      </div>

      <div v-if="hasCompletedUploads" class="queue-footer">
        <button 
          type="button" 
          class="btn btn-sm btn-outline-secondary"
          @click="clearCompleted"
        >
          Clear Completed
        </button>
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

const allPaused = computed(() => 
  props.uploads.every(u => u.status !== 'uploading' || u.status === 'paused')
)

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
</script>

<style scoped>
.upload-queue {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 420px;
  max-width: calc(100vw - 40px);
  background: var(--tblr-body-bg);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  border: 1px solid var(--tblr-border-color);
  z-index: 1000;
  animation: slideUp 0.3s ease-out;
  max-height: 60vh;
  display: flex;
  flex-direction: column;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.queue-header {
  padding: 0.875rem 1rem;
  border-bottom: 1px solid var(--tblr-border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  background: var(--tblr-bg-surface);
  border-radius: 12px 12px 0 0;
  user-select: none;
}

.queue-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  color: var(--tblr-text);
}

.queue-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-icon {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--tblr-text-muted);
}

.btn-icon:hover {
  background: var(--tblr-bg-surface-secondary);
  color: var(--tblr-text);
}

.btn-toggle.rotated {
  transform: rotate(180deg);
}

.btn-pause {
  color: var(--tblr-warning);
}

.btn-resume {
  color: var(--tblr-success);
}

.btn-cancel {
  color: var(--tblr-danger);
}

.btn-remove {
  color: var(--tblr-success);
}

.queue-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.upload-items {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem 0;
}

.upload-item {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--tblr-border-color-translucent);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  transition: background-color 0.2s;
}

.upload-item:last-child {
  border-bottom: none;
}

.upload-item:hover {
  background: var(--tblr-bg-surface-secondary);
}

.upload-item.completed {
  background: rgba(var(--tblr-success-rgb), 0.1);
}

.upload-item.error {
  background: rgba(var(--tblr-danger-rgb), 0.1);
}

.upload-item.paused {
  background: rgba(var(--tblr-warning-rgb), 0.1);
}

.upload-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}

.file-icon {
  flex-shrink: 0;
  color: var(--tblr-primary);
}

.file-details {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-weight: 500;
  color: var(--tblr-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
}

.file-stats {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  color: var(--tblr-text-muted);
  margin-top: 0.25rem;
  white-space: nowrap;
  overflow: hidden;
}

.separator {
  opacity: 0.5;
}

.upload-progress {
  width: 80px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
}

.progress-bar-container {
  width: 100%;
  height: 4px;
  background: var(--tblr-bg-surface-secondary);
  border-radius: 2px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: var(--tblr-primary);
  border-radius: 2px;
  transition: width 0.3s ease;
}

.progress-bar.progress-completed {
  background: var(--tblr-success);
}

.progress-bar.progress-error {
  background: var(--tblr-danger);
}

.progress-bar.progress-paused {
  background: var(--tblr-warning);
}

.progress-text {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--tblr-text-muted);
  line-height: 1;
}

.upload-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
}

.upload-actions .btn-icon {
  width: 28px;
  height: 28px;
}

.queue-footer {
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--tblr-border-color);
  background: var(--tblr-bg-surface);
  border-radius: 0 0 12px 12px;
  display: flex;
  justify-content: center;
}

.upload-items::-webkit-scrollbar {
  width: 4px;
}

.upload-items::-webkit-scrollbar-track {
  background: transparent;
}

.upload-items::-webkit-scrollbar-thumb {
  background: var(--tblr-border-color);
  border-radius: 2px;
}

@media (max-width: 576px) {
  .upload-queue {
    right: 10px;
    bottom: 10px;
    width: calc(100vw - 20px);
    max-height: 50vh;
  }
  
  .upload-progress {
    width: 60px;
  }
  
  .file-stats {
    display: none;
  }
}
</style>