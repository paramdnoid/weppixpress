<template>
  <!-- Toast Container bottom-right -->
  <div v-if="isVisible" class="toast-container position-fixed bottom-0 end-0 p-3" style="z-index: 2100">
    <div class="toast show shadow-sm scan-toast" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="toast-header d-flex align-items-center">
        <Icon icon="mdi:folder-search" width="20" height="20" class="me-2 text-primary" />
        <strong class="me-auto">Scanning folder</strong>
        <small class="text-muted">{{ percentage }}%</small>
        <button
          type="button"
          class="btn-close ms-2"
          aria-label="Close"
          @click="onCancel"
          :disabled="percentage === 100"
        />
      </div>

      <div class="toast-body">
        <div class="scan-info mb-2">
          <div class="info-row">
            <span class="label">Current</span>
            <span class="value text-truncate" :title="currentPath">{{ currentPath || 'Preparing…' }}</span>
          </div>
          <div class="info-row">
            <span class="label">Progress</span>
            <span class="value">{{ processedItems }} / {{ totalItems }}</span>
          </div>
          <div class="info-row" v-if="scanResult">
            <span class="label">Files</span>
            <span class="value">{{ scanResult.totalFiles.toLocaleString() }}</span>
          </div>
          <div class="info-row" v-if="scanResult">
            <span class="label">Size</span>
            <span class="value">{{ formatFileSize(scanResult.totalSize) }}</span>
          </div>
        </div>

        <div class="progress" aria-label="Scan progress">
          <div
            class="progress-bar progress-bar-striped progress-bar-animated"
            :class="{ 'bg-success': percentage === 100 }"
            :style="`width: ${percentage}%`"
          />
        </div>

        <div class="d-flex justify-content-end align-items-center gap-2 mt-3">
          <button
            type="button"
            class="btn btn-outline-secondary btn-sm"
            @click="onCancel"
            :disabled="percentage === 100"
          >
            {{ percentage === 100 ? 'Cancelled' : 'Cancel' }}
          </button>
          <button
            v-if="percentage === 100"
            type="button"
            class="btn btn-primary btn-sm"
            @click="onStart"
          >
            Start upload
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FolderScanResult, FolderScanProgress } from '@/services/folderScannerService'

interface Props {
  isVisible: boolean
  progress: FolderScanProgress | null
  scanResult: FolderScanResult | null
}

const props = defineProps<Props>()

const emit = defineEmits<{ cancel: []; start: [] }>()

const totalItems = computed(() => props.progress?.totalItems || 0)
const processedItems = computed(() => props.progress?.processedItems || 0)
const currentPath = computed(() => props.progress?.currentPath || '')
const percentage = computed(() => props.progress?.percentage || 0)

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function onCancel() { emit('cancel') }
function onStart() { emit('start') }
</script>

<style scoped>
/* Keep it compact like a toast */
.scan-toast { width: 380px; max-width: 90vw; }
.toast-header { padding: .5rem .75rem; }
.toast-body { padding: .75rem; }

.scan-info { background: var(--tblr-bg-surface-secondary); border-radius: 6px; padding: .5rem .625rem; }
.info-row { display: flex; justify-content: space-between; align-items: center; gap: .5rem; margin-bottom: .25rem; }
.info-row:last-child { margin-bottom: 0; }
.label { font-weight: 500; color: var(--tblr-text-muted); }
.value { font-weight: 600; color: var(--tblr-text); max-width: 220px; text-align: right; }

.progress { height: 6px; border-radius: 3px; background: var(--tblr-bg-surface-secondary); overflow: hidden; }
.progress-bar { transition: width .25s ease; }

@media (max-width: 576px) {
  .scan-toast { width: 95vw; }
}
</style>