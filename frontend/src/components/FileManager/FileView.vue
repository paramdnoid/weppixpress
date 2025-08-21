<template>
  <main class="resizable-grid border-start" tabindex="0" @keydown="handleKeydown">
    <!-- File Content Area -->
    <div class="d-flex flex-column position-relative file-view">
      <div class="content-scroll overflow-auto flex-grow-1">

        <!-- Loading State -->
        <div v-if="isLoading" class="text-center text-muted py-6">
          <div class="spinner-border spinner-border-sm mb-2" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
          <div>Loading files...</div>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="text-center text-danger py-6">
          <Icon icon="mdi:alert-circle" class="empty-icon mb-2" />
          <div>{{ error }}</div>
          <button type="button" class="btn btn-sm btn-outline-primary mt-2" @click="$emit('retry')">
            <Icon icon="mdi:refresh" width="16" height="16" class="me-1" />
            Try Again
          </button>
        </div>

        <!-- Empty State -->
        <div v-else-if="items.length === 0" class="text-center text-muted py-6">
          <Icon icon="tabler:folder-off" class="empty-icon mb-2" />
          <div>{{ emptyMessage }}</div>
          <div v-if="searchQuery" class="small mt-1">
            <button type="button" class="btn btn-link btn-sm p-0" @click="clearSearch">
              Clear search to see all files
            </button>
          </div>
        </div>

        <!-- Upload Progress Overlay -->
        <div v-if="isUploading" class="upload-overlay">
          <div class="card shadow-lg">
            <div class="card-body text-center">
              <div class="mb-2">
                <Icon icon="mdi:upload" width="32" height="32" class="text-primary" />
              </div>
              <div class="mb-2">Uploading files...</div>
              <div class="progress mb-2">
                <div class="progress-bar progress-bar-striped progress-bar-animated"
                  :style="`width: ${uploadProgress}%`" />
              </div>
              <div class="small text-muted">{{ uploadProgress }}% complete</div>
            </div>
          </div>
        </div>

        <!-- Grid View -->
        <FileGrid v-if="viewMode === 'grid' && !isLoading && !error && items.length > 0" :items="items"
          :itemKey="itemKey" :breadcrumbs="breadcrumbs" :sortKey="sortKey" :sortDir="sortDir" :selectedItems="selectedItems" :loading="isLoading"
          :emptyMessage="emptyMessage" @itemSelect="(item, event) => $emit('item-select', item, event)"
          @itemDoubleClick="item => $emit('item-dbl-click', item)" @navigate="item => $emit('navigate', item)"
          @selectionChange="(items, additive) => $emit('selection-change', items, additive)" />

        <!-- Table View -->
        <FileTable v-else-if="(viewMode === 'list' || viewMode === 'table') && !isLoading && !error && items.length > 0"
          :items="items" :itemKey="itemKey" :sortKey="sortKey" :sortDir="sortDir" :selectedItems="selectedItems"
          :loading="isLoading" :emptyMessage="emptyMessage"
          @itemSelect="(item, event) => $emit('item-select', item, event)"
          @itemDoubleClick="item => $emit('item-dbl-click', item)" @sort="$emit('sort', $event)" />
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, computed } from 'vue'
import FileGrid from './FileGrid.vue'
import FileTable from './FileTable.vue'

const props = defineProps({
  items: { type: Array, required: true },
  itemKey: { type: Function, default: item => item.id || item.name },
  breadcrumbs: { type: Array, required: true },
  searchValue: { type: String, default: '' },
  viewMode: { type: String, default: 'grid' },
  sortKey: { type: String, default: 'name' },
  sortDir: { type: String, default: 'asc' },
  selectedItems: { type: Set, default: () => new Set() },
  isLoading: { type: Boolean, default: false },
  error: { type: String, default: '' },
  isUploading: { type: Boolean, default: false },
  uploadProgress: { type: Number, default: 0 },
  emptyMessage: { type: String, default: 'This folder is empty' }
})

const emit = defineEmits([
  'navigate',
  'search',
  'retry',
  'item-select',
  'item-dbl-click',
  'sort',
  'delete-selected',
  'selection-change'
])

const searchQuery = computed(() => props.searchValue)

function clearSearch() {
  emit('search', '')
}


function handleKeydown(event) {
  // Only handle keyboard shortcuts if not focused on input elements
  if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.target.isContentEditable) {
    return
  }

  switch (event.key) {
    case 'Delete':
    case 'Backspace':
      if (props.selectedItems.size > 0) {
        event.preventDefault()
        emit('delete-selected')
      }
      break
    case 'Escape':
      // Escape handling can be added here if needed
      break
    case 'a':
    case 'A':
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault()
        // Select all - would need to emit this event if we want to support it
      }
      break
  }
}
</script>

<style scoped>
.file-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

.resizable-grid {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
}

.content-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
}

.empty-icon {
  font-size: 64px;
  color: var(--tblr-gray-300);
  margin-bottom: 1rem;
}

.upload-overlay {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1050;
}

.content-scroll::-webkit-scrollbar {
  width: 8px;
}

.content-scroll::-webkit-scrollbar-track {
  background: var(--tblr-gray-50);
}

.content-scroll::-webkit-scrollbar-thumb {
  background: var(--tblr-gray-300);
  border-radius: 4px;
}

.content-scroll::-webkit-scrollbar-thumb:hover {
  background: var(--tblr-gray-400);
}
</style>