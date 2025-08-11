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
            @select="selectItem(item, $event)"
            @dblclick="onItemDblClick(item)"
          />
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import SortableHeader from './SortableHeader.vue'
import FileTableRow from './FileTableRow.vue'
import { useTableSort } from '@/composables/useTableSort'
import { useTableNavigation } from '@/composables/useTableNavigation'

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

// Composables
const { sortedItems } = useTableSort({
  items: computed(() => props.items),
  sortKey: props.sortKey,
  sortDir: props.sortDir
})

const { focusedRowIndex, handleKeyNavigation } = useTableNavigation({
  onSelect: (index, event) => {
    if (sortedItems.value[index]) {
      selectItem(sortedItems.value[index], event)
    }
  },
  onActivate: (index) => {
    if (sortedItems.value[index]) {
      onItemDblClick(sortedItems.value[index])
    }
  }
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
</script>