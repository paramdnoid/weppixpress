<template>
  <div v-if="uploads.length > 0">
    <!-- Toast (Tabler UI) -->
    <div class="toast-container position-fixed bottom-0 end-0 p-3" style="z-index:1080">
      <div class="toast show shadow upload-toast" role="status" aria-live="polite" aria-atomic="true">
        <div class="toast-header" @click="toggleCollapsed">
          <Icon icon="mdi:cloud-upload" width="18" height="18" class="me-2" />
          <strong class="me-auto">Uploads ({{ activeUploadsCount }})</strong>
          <div class="d-flex align-items-center gap-2 ms-2">
            <button
              v-if="hasActiveUploads"
              type="button"
              class="btn btn-icon"
              :class="{ 'btn-ghost-warning': !allPaused, 'btn-ghost-success': allPaused }"
              @click.stop="toggleAllUploads"
              :title="allPaused ? 'Resume all' : 'Pause all'"
              aria-label="Toggle all uploads"
            >
              <Icon :icon="allPaused ? 'mdi:play' : 'mdi:pause'" width="16" height="16" />
            </button>
            <button type="button" class="btn-close" aria-label="Close" @click.stop="isCollapsed = true"></button>
          </div>
        </div>

        <div class="toast-body p-0">
          <div v-show="!isCollapsed" class="queue-content">
            <div class="upload-items">
              <div
                v-for="upload in uploads"
                :key="upload.uploadId"
                class="upload-item list-group-item"
                :class="{
                  'bg-success-lt': upload.status === 'completed',
                  'bg-danger-lt': upload.status === 'error',
                  'bg-warning-lt': upload.status === 'paused'
                }"
              >
                <div class="upload-info">
                  <div class="file-icon text-primary">
                    <Icon :icon="getFileIcon(upload.fileName)" width="20" height="20" />
                  </div>
                  <div class="file-details">
                    <div class="file-name" :title="upload.fileName">{{ upload.fileName }}</div>
                    <div class="file-stats text-secondary">
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
                  <div class="progress" style="height: 4px; width: 100%">
                    <div
                      class="progress-bar"
                      :class="{
                        'bg-success': upload.status === 'completed',
                        'bg-danger': upload.status === 'error',
                        'bg-warning': upload.status === 'paused',
                        'bg-primary': upload.status === 'uploading' || upload.status === 'initialized'
                      }"
                      role="progressbar"
                      :style="{ width: upload.progress + '%' }"
                      :aria-valuenow="Math.round(upload.progress)"
                      aria-valuemin="0"
                      aria-valuemax="100"
                    ></div>
                  </div>
                  <div class="progress-text">{{ Math.round(upload.progress) }}%</div>
                </div>

                <div class="upload-actions">
                  <button
                    v-if="upload.status === 'uploading'"
                    type="button"
                    class="btn btn-icon btn-ghost-warning"
                    @click="pauseUpload(upload.uploadId)"
                    title="Pause upload"
                    aria-label="Pause upload"
                  >
                    <Icon icon="mdi:pause" width="14" height="14" />
                  </button>
                  <button
                    v-else-if="upload.status === 'paused'"
                    type="button"
                    class="btn btn-icon btn-ghost-success"
                    @click="resumeUpload(upload.uploadId)"
                    title="Resume upload"
                    aria-label="Resume upload"
                  >
                    <Icon icon="mdi:play" width="14" height="14" />
                  </button>
                  <button
                    v-if="upload.status !== 'completed'"
                    type="button"
                    class="btn btn-icon btn-ghost-danger"
                    @click="cancelUpload(upload.uploadId)"
                    :title="upload.status === 'error' ? 'Remove' : 'Cancel upload'"
                    aria-label="Cancel or remove upload"
                  >
                    <Icon icon="mdi:close" width="14" height="14" />
                  </button>
                  <button
                    v-if="upload.status === 'completed'"
                    type="button"
                    class="btn btn-icon btn-ghost-success"
                    @click="removeCompleted(upload.uploadId)"
                    title="Remove from list"
                    aria-label="Remove from list"
                  >
                    <Icon icon="mdi:check" width="14" height="14" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="border-top p-2 text-end" v-if="hasCompletedUploads">
            <button type="button" class="btn btn-outline-secondary btn-sm" @click="clearCompleted">
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
.upload-toast {
  width: 360px;
  max-width: 360px;
}
@media (max-width: 576px) {
  .upload-toast {
    width: calc(100vw - 1.25rem);
    max-width: calc(100vw - 1.25rem);
  }
}

.queue-content {
  display: flex;
  flex-direction: column;
  max-height: 40vh;
}
@media (max-width: 576px) {
  .queue-content { max-height: 50vh; }
}

.upload-items {
  flex: 1;
  overflow-y: auto;
}

.upload-item {
  padding: 0.75rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  border-bottom: 1px solid var(--tblr-border-color-translucent);
}
.upload-item:last-child { border-bottom: none; }

.upload-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}

.file-details { flex: 1; min-width: 0; }
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
.separator { opacity: 0.5; }

.upload-progress {
  width: 100px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
}
@media (max-width: 576px) {
  .upload-progress { width: 72px; }
}
.progress-text {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--tblr-text-muted);
  line-height: 1;
}

.upload-actions { display: flex; align-items: center; gap: 0.25rem; flex-shrink: 0; }
.upload-actions .btn { width: 28px; height: 28px; padding: 0; }
</style>