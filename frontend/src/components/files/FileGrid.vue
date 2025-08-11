<template>
  <div 
    class="explorer-grid" 
    role="grid" 
    :aria-label="`File grid with ${displayItems.length} items`"
    @keydown="handleKeyNavigation"
  >
    <!-- Grid Items -->
    <FileGridItem
      v-for="(item, index) in displayItems"
      :key="itemKey(item.raw)"
      :item="item.raw"
      :index="index"
      :is-selected="isSelected(item.raw)"
      :tab-index="index === 0 ? 0 : -1"
      @select="handleItemSelection(item, $event)"
      @dblclick="onItemDblClick(item)"
    />

    <!-- Empty State -->
    <div v-if="showEmptyState" class="empty-state col-span-full text-center py-5 text-muted">
      <Icon icon="tabler:folder-off" class="empty-icon mb-2" />
      <div>{{ emptyMessage || 'No files or folders found' }}</div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state col-span-full text-center py-5">
      <div class="spinner-border spinner-border-sm mb-2" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <div class="text-muted">Loading files...</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import FileGridItem from './FileGridItem.vue'
import { useFiles } from '@/composables/useFiles'
import { useGridLayout } from '@/composables/useGridLayout'
import { useGridNavigation } from '@/composables/useGridNavigation'
import { useGridSelection } from '@/composables/useGridSelection'

const { getFileIcon, getFileColor } = useFiles()

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
    default: 'name',
    validator: (key) => ['name', 'size', 'modified', ''].includes(key)
  },
  sortDir: { 
    type: String, 
    default: 'asc',
    validator: (dir) => ['asc', 'desc'].includes(dir)
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

const emit = defineEmits(['itemDblClick', 'itemSelect', 'selectionChange'])

// Composables
const { displayItems } = useGridLayout({
  items: computed(() => props.items),
  sortKey: props.sortKey,
  sortDir: props.sortDir,
  getIcon: getFileIcon,
  getIconClass: getFileColor
})

const { isSelected, handleSelection } = useGridSelection({
  selectedItems: props.selectedItems,
  getItemKey: (item) => item.path || item.name
})

const { handleKeyNavigation } = useGridNavigation({
  itemWidth: 140,
  onSelect: (index, event) => {
    const item = displayItems.value[index]
    if (item) {
      handleItemSelection(item, event)
    }
  },
  onActivate: (index) => {
    const item = displayItems.value[index]
    if (item) {
      onItemDblClick(item)
    }
  }
})

// Computed properties
const showEmptyState = computed(() => 
  !props.loading && displayItems.value.length === 0
)

// Event handlers
function handleItemSelection(item, event) {
  const selection = handleSelection(item.raw, event)
  emit('itemSelect', selection)
}

function onItemDblClick(item) {
  emit('itemDblClick', item.raw)
}

</script>

<style scoped>
.explorer-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 0.75rem;
  padding: 1rem;
  background: transparent;
  min-height: 200px;
  position: relative;
}

.empty-state,
.loading-state {
  grid-column: 1 / -1;
}

.empty-icon {
  font-size: 64px;
  color: var(--tblr-gray-300);
  display: block;
}

.spinner-border-sm {
  width: 1.5rem;
  height: 1.5rem;
}

/* Mobile optimizations */
@media (max-width: 768px) {
  .explorer-grid {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 0.5rem;
    padding: 0.5rem;
  }
}
</style>