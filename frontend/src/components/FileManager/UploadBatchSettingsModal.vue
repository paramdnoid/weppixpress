<template>
  <!-- Modal Backdrop -->
  <div v-if="isVisible" class="modal-backdrop show" @click="hide"></div>
  <!-- Modal Structure -->
  <div v-if="isVisible" class="modal modal-blur show d-block" id="uploadBatchSettingsModal" tabindex="-1" role="dialog" aria-hidden="false">
    <div class="modal-dialog modal-lg modal-dialog-centered" role="document" @click.stop>
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">
            <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-settings me-2" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
              <path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            Upload Batch Settings
          </h5>
          <button type="button" class="btn-close" @click="hide" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <div class="row g-4">
            <div class="col-md-6">
              <label for="batchSizeRange" class="form-label">
                <strong>Files per Batch</strong>
                <span class="form-label-description">
                  Split large uploads into smaller batches
                </span>
              </label>
              <div class="mb-3">
                <input
                  type="range"
                  class="form-range"
                  id="batchSizeRange"
                  :value="localBatchSize"
                  min="10"
                  max="1000"
                  step="10"
                  @input="updateBatchSize(($event.target as HTMLInputElement).value)"
                />
                <div class="d-flex justify-content-between small text-muted mt-1">
                  <span>10</span>
                  <span>{{ localBatchSize }}</span>
                  <span>1000</span>
                </div>
              </div>
              <div class="input-group mb-2">
                <input
                  type="number"
                  class="form-control"
                  :value="localBatchSize"
                  min="10"
                  max="1000"
                  @input="updateBatchSize(($event.target as HTMLInputElement).value)"
                />
                <span class="input-group-text">files</span>
              </div>
              <div class="form-text">
                <small class="text-muted">
                  Example: 1000 files → <strong>{{ Math.ceil(1000 / localBatchSize) }} batches</strong>
                </small>
              </div>
            </div>

            <div class="col-md-6">
              <label for="registrationChunkRange" class="form-label">
                <strong>Registration Chunk Size</strong>
                <span class="form-label-description">
                  Files registered per API call
                </span>
              </label>
              <div class="mb-3">
                <input
                  type="range"
                  class="form-range"
                  id="registrationChunkRange"
                  :value="localRegistrationChunk"
                  min="50"
                  max="1000"
                  step="50"
                  @input="updateRegistrationChunk(($event.target as HTMLInputElement).value)"
                />
                <div class="d-flex justify-content-between small text-muted mt-1">
                  <span>50</span>
                  <span>{{ localRegistrationChunk }}</span>
                  <span>1000</span>
                </div>
              </div>
              <div class="input-group mb-2">
                <input
                  type="number"
                  class="form-control"
                  :value="localRegistrationChunk"
                  min="50"
                  max="1000"
                  @input="updateRegistrationChunk(($event.target as HTMLInputElement).value)"
                />
                <span class="input-group-text">files</span>
              </div>
              <div class="form-text">
                <small class="text-muted">
                  Larger chunks are faster but may timeout
                </small>
              </div>
            </div>
          </div>

          <!-- Stats Cards -->
          <div class="row g-3 mt-3">
            <div class="col-4">
              <div class="card card-sm">
                <div class="card-body">
                  <div class="row align-items-center">
                    <div class="col-auto">
                      <span class="bg-primary text-white avatar">
                        <svg xmlns="http://www.w3.org/2000/svg" class="icon" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
                          <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                          <rect x="3" y="12" width="6" height="8" rx="1"/>
                          <rect x="9" y="8" width="6" height="12" rx="1"/>
                          <rect x="15" y="4" width="6" height="16" rx="1"/>
                          <line x1="4" y1="20" x2="18" y2="20"/>
                        </svg>
                      </span>
                    </div>
                    <div class="col">
                      <div class="font-weight-medium">Total Batches</div>
                      <div class="text-muted">{{ batchStats.total }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="col-4">
              <div class="card card-sm">
                <div class="card-body">
                  <div class="row align-items-center">
                    <div class="col-auto">
                      <span class="bg-green text-white avatar">
                        <svg xmlns="http://www.w3.org/2000/svg" class="icon" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
                          <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                          <path d="M7 10l5 5l5 -5"/>
                          <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                      </span>
                    </div>
                    <div class="col">
                      <div class="font-weight-medium">Active</div>
                      <div class="text-muted">{{ batchStats.active }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="col-4">
              <div class="card card-sm">
                <div class="card-body">
                  <div class="row align-items-center">
                    <div class="col-auto">
                      <span class="bg-info text-white avatar">
                        <svg xmlns="http://www.w3.org/2000/svg" class="icon" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
                          <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                          <path d="M14 3v4a1 1 0 0 0 1 1h4"/>
                          <path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z"/>
                        </svg>
                      </span>
                    </div>
                    <div class="col">
                      <div class="font-weight-medium">Total Files</div>
                      <div class="text-muted">{{ batchStats.totalFiles }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Progress Bar -->
          <div v-if="batchStats.totalFiles > 0" class="mt-4">
            <div class="d-flex justify-content-between mb-2">
              <span class="text-muted">Overall Progress</span>
              <span class="text-muted">
                <strong>{{ batchStats.completedFiles }}</strong> / {{ batchStats.totalFiles }} files
              </span>
            </div>
            <div class="progress" style="height: 8px;">
              <div
                class="progress-bar progress-bar-striped progress-bar-animated"
                :style="{ width: batchStats.progress + '%' }"
              ></div>
            </div>
          </div>

          <!-- Alert Info -->
          <div class="alert alert-info mt-4">
            <div class="d-flex">
              <div>
                <svg xmlns="http://www.w3.org/2000/svg" class="icon alert-icon" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
                  <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                  <circle cx="12" cy="12" r="9"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <div>
                <h4 class="alert-title">Optimized for Large Uploads</h4>
                <div class="text-muted">
                  Your files will be automatically split into batches for improved performance, reliability, and progress tracking.
                </div>
              </div>
            </div>
          </div>

          <!-- Batch Control Buttons -->
          <div v-if="batchStats.total > 0" class="mt-4">
            <div class="d-flex gap-2">
              <button
                type="button"
                class="btn btn-warning"
                :disabled="batchStats.active === 0"
                @click="pauseAll"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-player-pause me-2" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
                  <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                  <rect x="6" y="5" width="4" height="14" rx="1"/>
                  <rect x="14" y="5" width="4" height="14" rx="1"/>
                </svg>
                Pause All
              </button>
              <button
                type="button"
                class="btn btn-success"
                :disabled="batchStats.paused === 0"
                @click="resumeAll"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-player-play me-2" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
                  <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                  <path d="M7 4v16l13 -8z"/>
                </svg>
                Resume All
              </button>
              <button
                type="button"
                class="btn btn-outline-secondary ms-auto"
                :disabled="batchStats.completed === 0"
                @click="clearCompleted"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-trash me-2" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
                  <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                  <line x1="4" y1="7" x2="20" y2="7"/>
                  <line x1="10" y1="11" x2="10" y2="17"/>
                  <line x1="14" y1="11" x2="14" y2="17"/>
                  <path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12"/>
                  <path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3"/>
                </svg>
                Clear Completed
              </button>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-link link-secondary" @click="resetToDefaults">
            Reset to Defaults
          </button>
          <button type="button" class="btn btn-secondary ms-auto" @click="hide">
            Close
          </button>
          <button type="button" class="btn btn-primary" @click="hide">
            <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-check me-2" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Apply Settings
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useUploadStore } from '@/stores/upload'

const uploadStore = useUploadStore()

// Modal visibility state
const isVisible = ref(false)

// Local reactive values for immediate UI updates
const localBatchSize = ref(uploadStore.maxFilesPerBatch)
const localRegistrationChunk = ref(uploadStore.maxRegistrationChunk)

// Computed stats
const batchStats = computed(() => uploadStore.getBatchStats())

// Update functions with debouncing
let batchSizeTimeout: number | null = null
let registrationTimeout: number | null = null

function updateBatchSize(value: string | number) {
  const numValue = parseInt(value.toString(), 10)
  if (numValue >= 10 && numValue <= 1000) {
    localBatchSize.value = numValue

    if (batchSizeTimeout) clearTimeout(batchSizeTimeout)
    batchSizeTimeout = window.setTimeout(() => {
      uploadStore.setBatchSize(numValue)
    }, 500)
  }
}

function updateRegistrationChunk(value: string | number) {
  const numValue = parseInt(value.toString(), 10)
  if (numValue >= 50 && numValue <= 1000) {
    localRegistrationChunk.value = numValue

    if (registrationTimeout) clearTimeout(registrationTimeout)
    registrationTimeout = window.setTimeout(() => {
      uploadStore.setRegistrationChunkSize(numValue)
    }, 500)
  }
}

function resetToDefaults() {
  localBatchSize.value = 1000
  localRegistrationChunk.value = 1000
  uploadStore.setBatchSize(1000)
  uploadStore.setRegistrationChunkSize(1000)
}

// Batch management functions
function pauseAll() {
  uploadStore.batches.forEach(batch => {
    if (batch.status === 'active') {
      uploadStore.pauseBatch(batch.id)
    }
  })
}

function resumeAll() {
  uploadStore.batches.forEach(batch => {
    if (batch.status === 'paused') {
      uploadStore.resumeBatch(batch.id)
    }
  })
}

function clearCompleted() {
  uploadStore.clearCompleted()
}

// Watch for external changes to store values
watch(() => uploadStore.maxFilesPerBatch, (newValue) => {
  localBatchSize.value = newValue
})

watch(() => uploadStore.maxRegistrationChunk, (newValue) => {
  localRegistrationChunk.value = newValue
})

// Simple show/hide methods
function show() {
  isVisible.value = true
}

function hide() {
  isVisible.value = false
}

defineExpose({
  show,
  hide
})
</script>

<style scoped>
.form-range::-webkit-slider-thumb {
  background: var(--tblr-primary);
}

.form-range::-moz-range-thumb {
  background: var(--tblr-primary);
}

.progress-bar {
  background: var(--tblr-primary);
}

.card-sm .card-body {
  padding: 0.75rem;
}

.avatar {
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--tblr-border-radius);
}

.modal-lg {
  max-width: 800px;
}
</style>