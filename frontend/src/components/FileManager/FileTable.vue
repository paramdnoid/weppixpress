<template>
  <div class="file-table-container">
    <!-- Loading State -->
    <div
      v-if="loading"
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

    <!-- Empty State -->
    <div
      v-else-if="sortedItems.length === 0"
      class="text-center py-5 text-muted"
    >
      <Icon
        icon="tabler:folder-off"
        class="empty-icon mb-2"
      />
      <div v-text="emptyMessage || 'No files or folders found'" />
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
            <SortableHeader
              sort-key="name"
              :current-sort-key="sortKey"
              :sort-dir="sortDir"
              label="Name"
              icon="mdi:file-outline"
              @sort="onSort"
            />
            <SortableHeader
              sort-key="modified"
              :current-sort-key="sortKey"
              :sort-dir="sortDir"
              label="Modified"
              icon="mdi:clock-outline"
              th-class="w-0 sortable-header"
              @sort="onSort"
            />
            <SortableHeader
              sort-key="size"
              :current-sort-key="sortKey"
              :sort-dir="sortDir"
              label="Size"
              icon="mdi:database-outline"
              th-class="text-end w-0 sortable-header"
              button-class="justify-content-end"
              @sort="onSort"
            />
          </tr>
        </thead>
        <tbody>
          <FileTableRow
            v-for="(item, index) in sortedItems"
            :key="itemKey(item)"
            :item="item"
            :index="index"
            :is-selected="isSelected(item)"
            :is-focused="index === focusedRowIndex"
            :tab-index="index === 0 ? 0 : -1"
            @select="$emit('itemSelect', item, $event)"
            @double-click="$emit('itemDoubleClick', item)"
          />
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import SortableHeader from './SortableHeader.vue'
import FileTableRow from './FileTableRow.vue'
import { useFileManager } from '@/composables/useFileManager'

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

const emit = defineEmits(['itemSelect', 'itemDoubleClick', 'sort'])

// File manager composable
const { getFileComparator } = useFileManager()

// Sort items using the file comparator
const sortedItems = computed(() => {
  const items = [...props.items]
  const comparator = getFileComparator(props.sortKey, props.sortDir)
  return items.sort(comparator)
})

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
</script>