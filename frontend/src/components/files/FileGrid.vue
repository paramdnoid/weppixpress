<template>
  <div 
    class="explorer-grid" 
    role="grid" 
    :aria-label="`File grid with ${displayItems.length} items`"
    @keydown="handleKeyNavigation"
  >
    <div 
      v-for="(item, index) in displayItems" 
      :key="itemKey(item.raw)"
      class="explorer-item" 
      role="gridcell"
      :tabindex="index === 0 ? 0 : -1"
      :data-index="index"
      @click="selectItem(item, $event)"
      @dblclick="onItemDblClick(item)" 
      @keydown.enter="onItemDblClick(item)"
      @keydown.space.prevent="selectItem(item, $event)"
      :title="getItemTooltip(item)"
      :aria-label="getItemAriaLabel(item)"
      :aria-selected="isSelected(item.raw)"
      :class="{ selected: isSelected(item.raw) }"
    >
      <div class="icon-wrap">
        <Icon :icon="item.icon" class="explorer-icon" :class="item.iconClass" />
      </div>
      <div class="explorer-label">{{ item.name }}</div>
    </div>

    <!-- Empty State -->
    <div v-if="displayItems.length === 0" class="empty-state col-span-full text-center py-5 text-muted">
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
import { computed, ref, nextTick } from 'vue'
import { Icon } from '@iconify/vue'
import { getFileComparator, getFileIcon, getFileColor, formatFileSize } from '@/composables/useFiles'

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

// Memoized sorted items for better performance
const sortedItems = computed(() => {
  if (!props.items?.length) return []
  return [...props.items].sort(getFileComparator(props.sortKey, props.sortDir))
})

const displayItems = computed(() => {
  return sortedItems.value.map(item => ({
    raw: item,
    icon: getFileIcon(item),
    iconClass: getFileColor(item),
    name: item.name
  }))
})

// Selection management
const focusedIndex = ref(0)

function isSelected(item) {
  return props.selectedItems.has(item.path || item.name)
}

function selectItem(item, event) {
  const isCtrlOrCmd = event.ctrlKey || event.metaKey
  const isShift = event.shiftKey
  
  if (isCtrlOrCmd) {
    // Toggle selection
    emit('itemSelect', { item: item.raw, mode: 'toggle' })
  } else if (isShift) {
    // Range selection
    emit('itemSelect', { item: item.raw, mode: 'range' })
  } else {
    // Single selection
    emit('itemSelect', { item: item.raw, mode: 'single' })
  }
}

function onItemDblClick(item) {
  emit('itemDblClick', item.raw)
}

// Keyboard navigation
async function handleKeyNavigation(event) {
  const currentElement = event.target
  const currentIndex = parseInt(currentElement.dataset.index || '0')
  const gridItems = Array.from(event.currentTarget.children).filter(el => 
    el.classList.contains('explorer-item')
  )
  
  let nextIndex = currentIndex
  const itemsPerRow = Math.floor(event.currentTarget.offsetWidth / 140) // Approximate items per row
  
  switch (event.key) {
    case 'ArrowRight':
      nextIndex = Math.min(currentIndex + 1, gridItems.length - 1)
      break
    case 'ArrowLeft':
      nextIndex = Math.max(currentIndex - 1, 0)
      break
    case 'ArrowDown':
      nextIndex = Math.min(currentIndex + itemsPerRow, gridItems.length - 1)
      break
    case 'ArrowUp':
      nextIndex = Math.max(currentIndex - itemsPerRow, 0)
      break
    case 'Home':
      nextIndex = 0
      break
    case 'End':
      nextIndex = gridItems.length - 1
      break
    default:
      return
  }
  
  if (nextIndex !== currentIndex) {
    event.preventDefault()
    
    // Update tabindex
    gridItems.forEach((item, idx) => {
      item.tabIndex = idx === nextIndex ? 0 : -1
    })
    
    // Focus new item
    await nextTick()
    gridItems[nextIndex]?.focus()
    focusedIndex.value = nextIndex
  }
}

// Utility functions
function getItemTooltip(item) {
  const parts = [item.name]
  if (item.raw.size) {
    parts.push(`Size: ${formatFileSize(item.raw.size)}`)
  }
  if (item.raw.updated) {
    parts.push(`Modified: ${new Date(item.raw.updated).toLocaleString()}`)
  }
  return parts.join('\n')
}

function getItemAriaLabel(item) {
  const type = item.raw.type === 'folder' ? 'Folder' : 'File'
  const selected = isSelected(item.raw) ? ', selected' : ''
  return `${type}: ${item.name}${selected}`
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

.explorer-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  outline: none;
  cursor: pointer;
  transition: all 0.15s ease;
  border-radius: 8px;
  padding: 12px 8px 8px;
  position: relative;
  border: 2px solid transparent;
  background: transparent;
}

.explorer-item:focus {
  outline: 2px solid var(--tblr-primary);
  outline-offset: 2px;
  border-color: var(--tblr-primary);
}

.explorer-item:hover {
  background-color: var(--tblr-gray-50);
  transform: translateY(-1px);
}

.explorer-item.selected {
  background-color: var(--tblr-primary-lt);
  border-color: var(--tblr-primary);
}

.explorer-item.selected:focus {
  background-color: var(--tblr-primary-lt);
}

.icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 64px;
  width: 64px;
  margin-bottom: 8px;
}

.explorer-icon {
  font-size: 48px;
  width: 48px;
  height: 48px;
  display: block;
  transition: transform 0.15s ease;
  pointer-events: none;
}

.explorer-item:hover .explorer-icon {
  transform: scale(1.05);
}

.explorer-label {
  width: 100%;
  text-align: center;
  font-size: 0.875rem;
  font-weight: 400;
  color: var(--tblr-dark);
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
  line-height: 1.3;
  user-select: none;
  pointer-events: none;
}

/* File type colors */
.folder { color: #f59e0b; }
.xml { color: #10b981; }
.rtf { color: #ef4444; }
.txt { color: #3b82f6; }
.file { color: var(--tblr-primary); }

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

/* High contrast mode support */
@media (prefers-contrast: high) {
  .explorer-item {
    border-color: var(--tblr-dark);
  }
  
  .explorer-item:focus {
    border-color: var(--tblr-primary);
    background-color: var(--tblr-primary-lt);
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .explorer-item,
  .explorer-icon {
    transition: none;
  }
  
  .explorer-item:hover {
    transform: none;
  }
  
  .explorer-item:hover .explorer-icon {
    transform: none;
  }
}

/* Mobile optimizations */
@media (max-width: 768px) {
  .explorer-grid {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 0.5rem;
    padding: 0.5rem;
  }
  
  .explorer-item {
    padding: 8px 4px 4px;
  }
  
  .icon-wrap {
    height: 48px;
    width: 48px;
    margin-bottom: 6px;
  }
  
  .explorer-icon {
    font-size: 36px;
    width: 36px;
    height: 36px;
  }
  
  .explorer-label {
    font-size: 0.75rem;
  }
}
</style>