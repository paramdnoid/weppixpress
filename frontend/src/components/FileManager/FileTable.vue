<template>
  <div class="file-table-container content-scroll">
    <!-- Error State -->
    <ErrorState
      v-if="error"
      :message="error"
      @retry="$emit('retry')"
    />

    <!-- Empty State -->
    <EmptyState
      v-else-if="showEmptyState"
      :message="emptyMessage || 'No files or folders found'"
      :action-text="searchQuery ? 'Clear search to see all files' : ''"
      :action-visible="!!searchQuery"
      @action="$emit('clearSearch')"
    />

    <!-- Loading State -->
    <div
      v-else-if="loading"
      class="text-center py-5"
    >
      <div
        class="spinner-border spinner-border-sm mb-2"
        role="status"
      >
        <span class="visually-hidden">Loading...</span>
      </div>
      <div class="text-muted">
        Loading files...
      </div>
    </div>

    <!-- Table -->
    <div
      v-else
      class="table-responsive"
    >
      <table
        class="table table-hover table-nowrap"
        role="table"
        aria-label="Files and folders"
        @keydown="handleKeyNavigation"
      >
        <thead>
          <tr role="row">
            <!-- Name Column Header -->
            <th
              scope="col"
              class="py-0 sortable-header text-start"
            >
              <button
                class="btn btn-action p-0 d-flex align-items-center"
                :aria-label="`Sort by Name ${sortKey === 'name' && sortDir === 'asc' ? 'descending' : 'ascending'}`"
                type="button"
                @click="onSort('name')"
              >
                <Icon
                  icon="mdi:file-outline"
                  class="me-2"
                  width="16"
                  height="16"
                />
                <span>Name</span>
                <Icon
                  v-if="sortKey === 'name'"
                  :icon="sortDir === 'asc' ? 'mdi:arrow-up' : 'mdi:arrow-down'"
                  width="16"
                  height="16"
                  class="ms-2"
                  aria-hidden="true"
                />
              </button>
            </th>

            <!-- Modified Column Header -->
            <th
              scope="col"
              class="py-0 w-0 sortable-header"
            >
              <button
                class="btn btn-action p-0 d-flex align-items-center"
                :aria-label="`Sort by Modified ${sortKey === 'modified' && sortDir === 'asc' ? 'descending' : 'ascending'}`"
                type="button"
                @click="onSort('modified')"
              >
                <Icon
                  icon="mdi:clock-outline"
                  class="me-2"
                  width="16"
                  height="16"
                />
                <span>Modified</span>
                <Icon
                  v-if="sortKey === 'modified'"
                  :icon="sortDir === 'asc' ? 'mdi:arrow-up' : 'mdi:arrow-down'"
                  width="16"
                  height="16"
                  class="ms-2"
                  aria-hidden="true"
                />
              </button>
            </th>

            <!-- Size Column Header -->
            <th
              scope="col"
              class="py-0 text-end w-0 sortable-header"
            >
              <button
                class="btn btn-action p-0 d-flex align-items-center justify-content-end"
                :aria-label="`Sort by Size ${sortKey === 'size' && sortDir === 'asc' ? 'descending' : 'ascending'}`"
                type="button"
                @click="onSort('size')"
              >
                <Icon
                  icon="mdi:database-outline"
                  class="me-2"
                  width="16"
                  height="16"
                />
                <span>Size</span>
                <Icon
                  v-if="sortKey === 'size'"
                  :icon="sortDir === 'asc' ? 'mdi:arrow-up' : 'mdi:arrow-down'"
                  width="16"
                  height="16"
                  class="ms-2"
                  aria-hidden="true"
                />
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          <!-- File/Folder Rows -->
          <tr
            v-for="(item, index) in sortedItems"
            :key="itemKey(item)"
            class="file-row cursor-pointer"
            role="row"
            :class="{
              'table-active': isSelected(item),
              'table-focus': index === focusedRowIndex
            }"
            :tabindex="index === 0 ? 0 : -1"
            :data-index="index"
            :aria-label="getAriaLabel(item)"
            :aria-selected="isSelected(item)"
            @click="$emit('itemSelect', item, $event)"
            @dblclick="$emit('itemDoubleClick', item)"
            @keydown.space.prevent="$emit('itemSelect', item, $event)"
          >
            <td class="file-name-cell text-start">
              <div class="d-flex align-items-center">
                <Icon
                  :icon="getFileIcon(item)"
                  :class="getFileTypeClass(item)"
                  width="20"
                  height="20"
                  class="me-2 flex-shrink-0"
                  aria-hidden="true"
                />
                <span
                  class="file-name text-truncate"
                  :title="item.name"
                  v-text="item.name"
                />
              </div>
            </td>
            <td class="w-0 text-muted file-date-cell">
              <time
                v-if="item.modified"
                :datetime="item.modified"
                :title="getFullDateString(item)"
              >
                <span v-text="getDateFormatted(item.modified)" />
              </time>
              <span v-else>-</span>
            </td>
            <td class="text-end text-muted file-size-cell">
              <span
                :title="getSizeTooltip(item)"
                v-text="getFormattedSize(item)"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useFileManager } from '@/composables/useFileManager'
import EmptyState from '@/components/base/EmptyState.vue'
import ErrorState from '@/components/base/ErrorState.vue'

const props = defineProps({
  items: {
    type: Array,
    required: true,
    validator: (items) => Array.isArray(items)
  },
  itemKey: {
    type: Function,
    default: item => item.id || item.name
  },
  sortKey: {
    type: String,
    default: 'name'
  },
  sortDir: {
    type: String,
    default: 'asc'
  },
  selectedItems: {
    type: Set,
    default: () => new Set()
  },
  loading: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: ''
  },
  emptyMessage: {
    type: String,
    default: null
  },
  searchQuery: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['itemSelect', 'itemDoubleClick', 'sort', 'retry', 'clearSearch'])

// File manager composable
const { getFileIcon, getFileColor, getDateFormatted, getFileSize, getFileComparator } = useFileManager()

// Sort items using the file comparator
const sortedItems = computed(() => {
  const items = [...props.items]
  const comparator = getFileComparator(props.sortKey, props.sortDir)
  return items.sort(comparator)
})

// Computed properties
const showEmptyState = computed(() =>
  !props.loading && !props.error && sortedItems.value.length === 0
)

// Simple keyboard navigation
const focusedRowIndex = ref(0)

function handleKeyNavigation(event) {
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      focusedRowIndex.value = Math.min(focusedRowIndex.value + 1, sortedItems.value.length - 1)
      break
    case 'ArrowUp':
      event.preventDefault()
      focusedRowIndex.value = Math.max(focusedRowIndex.value - 1, 0)
      break
    case 'Enter':
    case ' ':
      event.preventDefault()
      if (sortedItems.value[focusedRowIndex.value]) {
        emit('itemSelect', sortedItems.value[focusedRowIndex.value], event)
      }
      break
  }
}

// Selection management
function isSelected(item) {
  return props.selectedItems.has(item.path || item.name)
}

function onSort(key) {
  emit('sort', key)
}

// Helper functions for file display
function getFileTypeClass(item) {
  if (item.type === 'folder') return 'text-warning'
  return `text-${getFileColor(item)}`
}

function getFormattedSize(item) {
  return item.size ? getFileSize(item.size) : '-'
}

function getSizeTooltip(item) {
  return item.size ? `${item.size} bytes` : 'No size information'
}

function getFullDateString(item) {
  return item.modified ? new Date(item.modified).toLocaleString() : ''
}

function getAriaLabel(item) {
  const type = item.type === 'folder' ? 'Folder' : 'File'
  const selected = isSelected(item) ? ', selected' : ''
  const size = item.size ? `, ${getFileSize(item.size)}` : ''
  const modified = item.modified ? `, modified ${getDateFormatted(item.modified)}` : ''
  return `${type}: ${item.name}${selected}${size}${modified}`
}
</script>

<style scoped>
.file-table-container {
  height: 100%;
}

.content-scroll {
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
}

.content-scroll::-webkit-scrollbar {
  width: 6px;
}

.content-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.content-scroll::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

.content-scroll::-webkit-scrollbar-thumb:hover {
  background-color: rgba(0, 0, 0, 0.4);
}

.table {
  margin-bottom: 0;
}

.file-row {
  transition: background-color 0.15s ease-in-out;
}

.file-row:hover {
  background-color: var(--bs-gray-100);
}

.file-row.table-active {
  background-color: var(--bs-primary-bg-subtle);
}

.file-row.table-focus {
  outline: 2px solid var(--bs-primary);
  outline-offset: -2px;
}

.file-name-cell {
  min-width: 200px;
}

.file-date-cell {
  white-space: nowrap;
}

.file-size-cell {
  white-space: nowrap;
  min-width: 100px;
}

.sortable-header .btn-action {
  width: 100%;
  text-align: left;
  border: none;
  background: none;
  padding: 0.5rem 0.75rem;
  color: inherit;
  font-weight: 500;
  justify-content: flex-start;
}

.sortable-header.text-end .btn-action {
  justify-content: flex-end;
}

.sortable-header .btn-action:hover {
  background-color: var(--bs-gray-100);
}

</style>