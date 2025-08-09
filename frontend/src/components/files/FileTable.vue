<template>
  <div class="file-table-container">
    <!-- Loading State -->
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border spinner-border-sm mb-2" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <div class="text-muted">Loading files...</div>
    </div>

    <!-- Empty State -->
    <div v-else-if="sortedItems.length === 0" class="text-center py-5 text-muted">
      <Icon icon="tabler:folder-off" class="empty-icon mb-2" />
      <div>{{ emptyMessage || 'No files or folders found' }}</div>
    </div>

    <!-- Table -->
    <div v-else class="table-responsive">
      <table 
        class="table table-hover table-nowrap" 
        role="table"
        aria-label="Files and folders"
        @keydown="handleKeyNavigation"
      >
        <thead>
          <tr role="row">
            <th scope="col" class="sortable-header">
              <button 
                class="btn btn-action p-0 d-flex align-items-center" 
                @click="onSort('name')"
                :aria-label="getSortAriaLabel('name')"
                type="button"
              >
                <Icon icon="mdi:file-outline" class="me-2" width="16" height="16" />
                Name
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
            <th scope="col" class="w-0 sortable-header">
              <button 
                class="btn btn-action p-0 d-flex align-items-center" 
                @click="onSort('modified')"
                :aria-label="getSortAriaLabel('modified')"
                type="button"
              >
                <Icon icon="mdi:clock-outline" class="me-2" width="16" height="16" />
                Modified
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
            <th scope="col" class="text-end w-0 sortable-header">
              <button 
                class="btn btn-action p-0 d-flex align-items-center justify-content-end" 
                @click="onSort('size')"
                :aria-label="getSortAriaLabel('size')"
                type="button"
              >
                <Icon icon="mdi:database-outline" class="me-2" width="16" height="16" />
                Size
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
          <tr 
            v-for="(item, index) in sortedItems" 
            :key="itemKey(item)" 
            class="file-row"
            role="row"
            :class="{ 
              'table-active': isSelected(item),
              'table-focus': index === focusedRowIndex 
            }"
            :tabindex="index === 0 ? 0 : -1"
            :data-index="index"
            @click="selectItem(item, $event)"
            @dblclick="onItemDblClick(item)"
            @keydown.enter="onItemDblClick(item)"
            @keydown.space.prevent="selectItem(item, $event)"
            :aria-label="getItemAriaLabel(item)"
            :aria-selected="isSelected(item)"
          >
            <td class="file-name-cell">
              <div class="d-flex align-items-center">
                <Icon 
                  :icon="getFileIcon(item)"
                  :class="getFileTypeClass(item)"
                  width="20" 
                  height="20"
                  class="me-2 flex-shrink-0" 
                  aria-hidden="true"
                />
                <span class="file-name text-truncate" :title="item.name">
                  {{ item.name }}
                </span>
              </div>
            </td>
            <td class="w-0 text-muted file-date-cell">
              <time 
                v-if="item.updated" 
                :datetime="item.updated"
                :title="new Date(item.updated).toLocaleString()"
              >
                {{ formatDate(item.updated) }}
              </time>
              <span v-else>-</span>
            </td>
            <td class="text-end text-muted file-size-cell">
              <span :title="item.size ? `${item.size} bytes` : 'No size information'">
                {{ formatSize(item.size) }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, nextTick } from 'vue'
import { getDateFormated, getFileComparator, getFileIcon, getFileColor, formatFileSize } from '@/composables/useFiles'
import { Icon } from '@iconify/vue'

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
  emptyMessage: { 
    type: String, 
    default: null 
  }
})

const emit = defineEmits(['itemDblClick', 'itemSelect', 'sort'])

// State
const focusedRowIndex = ref(0)

// Computed properties
const sortedItems = computed(() => {
  if (!props.items?.length) return []
  return [...props.items].sort(getFileComparator(props.sortKey, props.sortDir))
})

// Selection management
function isSelected(item) {
  return props.selectedItems.has(item.path || item.name)
}

function selectItem(item, event) {
  const isCtrlOrCmd = event.ctrlKey || event.metaKey
  const isShift = event.shiftKey
  
  if (isCtrlOrCmd) {
    // Toggle selection
    emit('itemSelect', { item, mode: 'toggle' })
  } else if (isShift) {
    // Range selection
    emit('itemSelect', { item, mode: 'range' })
  } else {
    // Single selection
    emit('itemSelect', { item, mode: 'single' })
  }
}

function onItemDblClick(item) {
  emit('itemDblClick', item)
}

function onSort(key) {
  emit('sort', key)
}

// Keyboard navigation for table
async function handleKeyNavigation(event) {
  if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return
  
  const rows = Array.from(event.currentTarget.querySelectorAll('.file-row'))
  let nextIndex = focusedRowIndex.value
  
  switch (event.key) {
    case 'ArrowDown':
      nextIndex = Math.min(focusedRowIndex.value + 1, rows.length - 1)
      break
    case 'ArrowUp':
      nextIndex = Math.max(focusedRowIndex.value - 1, 0)
      break
    case 'Home':
      nextIndex = 0
      break
    case 'End':
      nextIndex = rows.length - 1
      break
  }
  
  if (nextIndex !== focusedRowIndex.value) {
    event.preventDefault()
    
    // Update tabindex
    rows.forEach((row, idx) => {
      row.tabIndex = idx === nextIndex ? 0 : -1
    })
    
    // Focus new row
    await nextTick()
    rows[nextIndex]?.focus()
    focusedRowIndex.value = nextIndex
  }
}

// Utility functions
function formatDate(date) {
  return getDateFormated(date)
}

function formatSize(size) {
  return size ? formatFileSize(size) : '-'
}

function getFileTypeClass(item) {
  if (item.type === 'folder') return 'text-warning'
  return `text-${getFileColor(item)}`
}

function getItemAriaLabel(item) {
  const type = item.type === 'folder' ? 'Folder' : 'File'
  const selected = isSelected(item) ? ', selected' : ''
  const size = item.size ? `, ${formatFileSize(item.size)}` : ''
  const modified = item.updated ? `, modified ${formatDate(item.updated)}` : ''
  return `${type}: ${item.name}${selected}${size}${modified}`
}

function getSortAriaLabel(column) {
  const currentSort = props.sortKey === column
  const direction = currentSort && props.sortDir === 'asc' ? 'descending' : 'ascending'
  return `Sort by ${column} ${direction}`
}
</script>