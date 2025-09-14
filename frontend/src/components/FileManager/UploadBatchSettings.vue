<template>
  <div class="upload-batch-settings">
    <div class="card">
      <div class="card-header d-flex justify-content-between align-items-center">
        <h6 class="mb-0">
          <Icon
            icon="tabler:settings"
            width="16"
            height="16"
            class="me-2"
          />
          Upload Batch Settings
        </h6>
        <button
          type="button"
          class="btn btn-sm btn-outline-secondary"
          @click="resetToDefaults"
        >
          Reset Defaults
        </button>
      </div>
      <div class="card-body">
        <div class="row g-3">
          <div class="col-md-6">
            <label
              for="batchSize"
              class="form-label"
            >
              Files per Batch
              <small class="text-muted">(for large uploads)</small>
            </label>
            <input
              id="batchSizeRange"
              type="range"
              class="form-range mb-2"
              :value="localBatchSize"
              min="10"
              max="1000"
              step="10"
              @input="updateBatchSize(($event.target as HTMLInputElement).value)"
            >
            <input
              id="batchSize"
              type="number"
              class="form-control form-control-sm"
              :value="localBatchSize"
              min="10"
              max="1000"
              @input="updateBatchSize(($event.target as HTMLInputElement).value)"
            >
            <div class="form-text">
              Current: <strong>{{ localBatchSize }}</strong> files per batch
              <br>
              <small>1000 files will create {{ Math.ceil(1000 / localBatchSize) }} batches</small>
            </div>
          </div>

          <div class="col-md-6">
            <label
              for="registrationChunk"
              class="form-label"
            >
              Registration Chunk Size
              <small class="text-muted">(API requests)</small>
            </label>
            <input
              id="registrationChunkRange"
              type="range"
              class="form-range mb-2"
              :value="localRegistrationChunk"
              min="50"
              max="1000"
              step="50"
              @input="updateRegistrationChunk(($event.target as HTMLInputElement).value)"
            >
            <input
              id="registrationChunk"
              type="number"
              class="form-control form-control-sm"
              :value="localRegistrationChunk"
              min="50"
              max="1000"
              @input="updateRegistrationChunk(($event.target as HTMLInputElement).value)"
            >
            <div class="form-text">
              Current: <strong>{{ localRegistrationChunk }}</strong> files per request
              <br>
              <small>Reduces API calls for large uploads</small>
            </div>
          </div>
        </div>

        <hr class="my-3">

        <!-- Batch Statistics -->
        <div class="row g-3">
          <div class="col-md-4">
            <div class="text-center">
              <div class="fs-4 text-primary">
                {{ batchStats.total }}
              </div>
              <div class="small text-muted">
                Total Batches
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="text-center">
              <div class="fs-4 text-success">
                {{ batchStats.active }}
              </div>
              <div class="small text-muted">
                Active
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="text-center">
              <div class="fs-4 text-info">
                {{ batchStats.totalFiles }}
              </div>
              <div class="small text-muted">
                Total Files
              </div>
            </div>
          </div>
        </div>

        <div
          v-if="batchStats.totalFiles > 0"
          class="mt-3"
        >
          <div class="d-flex justify-content-between mb-1">
            <small class="text-muted">Overall Progress</small>
            <small class="text-muted">{{ batchStats.completedFiles }}/{{ batchStats.totalFiles }}</small>
          </div>
          <div
            class="progress"
            style="height: 6px;"
          >
            <div
              class="progress-bar"
              :style="{ width: batchStats.progress + '%' }"
            />
          </div>
        </div>

        <div class="mt-3">
          <div class="d-flex gap-2">
            <button
              type="button"
              class="btn btn-sm btn-outline-warning"
              :disabled="batchStats.active === 0"
              @click="pauseAll"
            >
              Pause All
            </button>
            <button
              type="button"
              class="btn btn-sm btn-outline-success"
              :disabled="batchStats.paused === 0"
              @click="resumeAll"
            >
              Resume All
            </button>
            <button
              type="button"
              class="btn btn-sm btn-outline-secondary"
              :disabled="batchStats.completed === 0"
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
import { ref, computed, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { useUploadStore } from '@/stores/upload'

const uploadStore = useUploadStore()

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
  localBatchSize.value = 50
  localRegistrationChunk.value = 1000
  uploadStore.setBatchSize(50)
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
</script>

<style scoped>
.upload-batch-settings {
  margin-bottom: 1rem;
}

.form-range::-webkit-slider-thumb {
  background: var(--bs-primary);
}

.form-range::-moz-range-thumb {
  background: var(--bs-primary);
}

.progress {
  background-color: rgba(var(--bs-primary-rgb), 0.1);
}

.progress-bar {
  background: linear-gradient(45deg, var(--bs-primary), var(--bs-info));
}
</style>