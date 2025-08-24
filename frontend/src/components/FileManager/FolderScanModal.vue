<template>
  <div v-if="isVisible" class="folder-scan-overlay">
    <div class="folder-scan-modal">
      <div class="scan-header">
        <Icon icon="mdi:folder-search" width="32" height="32" class="text-primary" />
        <h4 class="mb-0">Scanning Folder</h4>
      </div>

      <div class="scan-content">
        <div class="scan-info mb-3">
          <div class="info-row">
            <span class="label">Current:</span>
            <span class="value text-truncate" :title="currentPath">{{ currentPath || 'Preparing...' }}</span>
          </div>
          <div class="info-row">
            <span class="label">Progress:</span>
            <span class="value">{{ processedItems }} / {{ totalItems }} items</span>
          </div>
          <div class="info-row" v-if="scanResult">
            <span class="label">Files found:</span>
            <span class="value">{{ scanResult.totalFiles.toLocaleString() }}</span>
          </div>
          <div class="info-row" v-if="scanResult">
            <span class="label">Total size:</span>
            <span class="value">{{ formatFileSize(scanResult.totalSize) }}</span>
          </div>
        </div>

        <div class="progress-container mb-3">
          <div class="progress">
            <div 
              class="progress-bar progress-bar-striped progress-bar-animated"
              :style="`width: ${percentage}%`"
              :class="{ 'bg-success': percentage === 100 }"
            />
          </div>
          <div class="progress-text">{{ percentage }}%</div>
        </div>

        <div v-if="percentage === 100" class="scan-summary">
          <div class="summary-grid">
            <div class="summary-item">
              <Icon icon="mdi:file-multiple" class="summary-icon" />
              <div class="summary-details">
                <div class="summary-value">{{ scanResult?.totalFiles || 0 }}</div>
                <div class="summary-label">Files</div>
              </div>
            </div>
            <div class="summary-item">
              <Icon icon="mdi:folder" class="summary-icon" />
              <div class="summary-details">
                <div class="summary-value">{{ Object.keys(scanResult?.structure || {}).length }}</div>
                <div class="summary-label">Folders</div>
              </div>
            </div>
            <div class="summary-item">
              <Icon icon="mdi:database" class="summary-icon" />
              <div class="summary-details">
                <div class="summary-value">{{ formatFileSize(scanResult?.totalSize || 0) }}</div>
                <div class="summary-label">Total Size</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="scan-actions">
        <button 
          type="button" 
          class="btn btn-outline-secondary" 
          @click="onCancel"
          :disabled="percentage === 100"
        >
          {{ percentage === 100 ? 'Cancelled' : 'Cancel' }}
        </button>
        <button 
          v-if="percentage === 100" 
          type="button" 
          class="btn btn-primary ms-2" 
          @click="onStart"
        >
          Start Upload
        </button>
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

const emit = defineEmits<{
  cancel: []
  start: []
}>()

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

function onCancel() {
  emit('cancel')
}

function onStart() {
  emit('start')
}
</script>

<style scoped>
.folder-scan-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(4px);
}

.folder-scan-modal {
  background: var(--tblr-body-bg);
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 520px;
  max-height: 90vh;
  overflow: hidden;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.scan-header {
  padding: 1.5rem;
  border-bottom: 1px solid var(--tblr-border-color);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: var(--tblr-bg-surface);
}

.scan-content {
  padding: 1.5rem;
}

.scan-info {
  background: var(--tblr-bg-surface-secondary);
  border-radius: 8px;
  padding: 1rem;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.info-row:last-child {
  margin-bottom: 0;
}

.label {
  font-weight: 500;
  color: var(--tblr-text-muted);
  min-width: 80px;
}

.value {
  font-weight: 600;
  color: var(--tblr-text);
  text-align: right;
  max-width: 250px;
}

.progress-container {
  position: relative;
}

.progress {
  height: 8px;
  border-radius: 4px;
  overflow: hidden;
  background: var(--tblr-bg-surface-secondary);
}

.progress-bar {
  transition: width 0.3s ease;
}

.progress-text {
  position: absolute;
  top: 12px;
  right: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--tblr-text-muted);
}

.scan-summary {
  background: var(--tblr-bg-surface-secondary);
  border-radius: 8px;
  padding: 1rem;
  border: 2px solid var(--tblr-success);
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  text-align: center;
}

.summary-icon {
  width: 24px;
  height: 24px;
  color: var(--tblr-primary);
  flex-shrink: 0;
}

.summary-details {
  flex: 1;
}

.summary-value {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--tblr-text);
  line-height: 1;
}

.summary-label {
  font-size: 0.75rem;
  color: var(--tblr-text-muted);
  margin-top: 0.25rem;
}

.scan-actions {
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--tblr-border-color);
  background: var(--tblr-bg-surface);
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 576px) {
  .folder-scan-modal {
    width: 95%;
    margin: 1rem;
  }
  
  .summary-grid {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
  
  .scan-actions {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .scan-actions .btn {
    width: 100%;
  }
}
</style>