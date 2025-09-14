<template>
  <!-- Virtual Grid Mode -->
  <div
    v-if="virtualizationMode === 'virtual'"
    class="virtual-grid-container"
    :style="{ height: containerHeight + 'px' }"
    @scroll="onScroll"
  >
    <div
      class="virtual-grid-spacer"
      :style="{ height: totalHeight + 'px' }"
    >
      <div
        class="virtual-grid-content"
        :style="{ transform: `translateY(${offsetY}px)` }"
      >
        <FileGridItem
          v-for="(item, index) in visibleItems"
          :key="getItemKey(item)"
          :item="item"
          :index="startIndex + index"
          :is-selected="isSelected(item)"
          @double-click="$emit('itemDoubleClick', item)"
        />
      </div>
    </div>
  </div>

  <!-- Optimized Grid Mode (RecycleScroller) -->
  <div
    v-else-if="virtualizationMode === 'optimized'"
    class="optimized-grid"
    :style="{ height: containerHeight + 'px' }"
  >
    <RecycleScroller
      v-slot="{ item, index }"
      class="scroller"
      :items="items"
      :item-size="itemSize"
      key-field="path"
    >
      <FileGridItem
        :item="item"
        :index="index"
        :is-selected="isSelected(item)"
        @double-click="$emit('itemDoubleClick', item)"
      />
    </RecycleScroller>
  </div>

  <!-- Standard Grid Mode -->
  <div 
    v-else
    ref="gridContainer"
    class="explorer-grid" 
    role="grid" 
    :aria-label="`File grid with ${displayItems.length} items`"
    @keydown="handleKeyNavigation"
    @mousedown="handleMouseDown"
  >
    <!-- Grid Items -->
    <FileGridItem
      v-for="(item, index) in displayItems"
      :key="itemKey(item.raw)"
      :item="item.raw"
      :index="index"
      :is-selected="isSelected(item.raw)"
      :tab-index="index === 0 ? 0 : -1"
      @double-click="$emit('itemDoubleClick', item.raw)"
    />

    <!-- Empty State -->
    <div
      v-if="showEmptyState"
      class="empty-state col-span-full text-center py-5 text-muted"
    >
      <Icon
        icon="tabler:folder-off"
        class="empty-icon mb-2"
      />
      <div v-text="emptyMessage || 'No files or folders found'" />
    </div>

    <!-- Loading State -->
    <div
      v-if="loading"
      class="loading-state col-span-full text-center py-5"
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

    <!-- Selection Box -->
    <div 
      v-if="isDragging && selectionBox"
      class="selection-box"
      :style="selectionBoxStyle"
    />
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { RecycleScroller } from 'vue-virtual-scroller'
import FileGridItem from './FileGridItem.vue'
import { useFileManager } from '@/composables/useFileManager'
import { useVirtualScroll } from '@/composables/useVirtualScroll'

const { getFileIcon, getFileColor } = useFileManager()

// Refs
const gridContainer = ref(null)
const isDragging = ref(false)
const selectionBox = ref(null)
const dragStart = ref({ x: 0, y: 0 })
const dragEnd = ref({ x: 0, y: 0 })

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
  breadcrumbs: { 
    type: Array, 
    required: true 
  },
  sortKey: { 
    type: String, 
    default: 'name',
    validator: (key) => typeof key === 'string'
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
  },
  // Virtualization props
  virtualizationMode: {
    type: String,
    default: 'standard',
    validator: (mode) => ['standard', 'optimized', 'virtual'].includes(mode)
  },
  itemSize: {
    type: Number,
    default: 120
  },
  containerHeight: {
    type: Number,
    default: 600
  },
  itemHeight: {
    type: Number,
    default: 120
  },
  getItemKey: {
    type: Function,
    default: (item) => item.path || item.name
  }
})

const emit = defineEmits(['itemDoubleClick', 'selectionChange', 'navigate'])

// Virtual scroll setup for 'virtual' mode
const {
  visibleItems,
  totalHeight,
  offsetY,
  onScroll,
  startIndex
} = props.virtualizationMode === 'virtual' 
  ? useVirtualScroll(props.items, {
      itemHeight: props.itemHeight,
      containerHeight: props.containerHeight,
      overscan: 3
    })
  : {
      visibleItems: ref([]),
      totalHeight: ref(0),
      offsetY: ref(0),
      onScroll: () => {},
      startIndex: ref(0)
    }

// Grid display logic
const displayItems = computed(() => {
  return props.items.map(item => ({
    raw: item,
    icon: getFileIcon(item),
    iconClass: getFileColor(item)
  }))
})

// Selection logic
const isSelected = (item) => {
  const itemId = props.itemKey ? props.itemKey(item) : (item.path || item.name)
  return props.selectedItems?.has(itemId) || false
}

// Keyboard navigation
const handleKeyNavigation = (event) => {
  // Basic keyboard navigation
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    const focusedElement = document.activeElement
    if (focusedElement) {
      focusedElement.click()
    }
  }
}

// Mouse drag selection
const handleMouseDown = (event) => {
  // Only start selection if clicking on empty area (not on grid items)
  if (event.target === gridContainer.value || event.target.closest('.explorer-grid') === gridContainer.value) {
    // Don't start drag on right click or if clicking on an item
    if (event.button === 2 || event.target.closest('.file-grid-item')) {
      return
    }
    
    event.preventDefault()
    isDragging.value = true
    
    const rect = gridContainer.value.getBoundingClientRect()
    dragStart.value = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    }
    dragEnd.value = { ...dragStart.value }
    
    // Clear existing selection if not holding Ctrl/Cmd
    if (!event.ctrlKey && !event.metaKey) {
      emit('selectionChange', [])
    }
    
    // Add document-level event listeners
    document.addEventListener('mousemove', handleDocumentMouseMove, { passive: false })
    document.addEventListener('mouseup', handleDocumentMouseUp, { passive: false })
    
    // Disable text selection while dragging
    document.body.style.userSelect = 'none'
  }
}

const handleDocumentMouseMove = (event) => {
  if (!isDragging.value || !gridContainer.value) return
  
  event.preventDefault()
  const rect = gridContainer.value.getBoundingClientRect()
  
  // Calculate position relative to grid container, allowing negative values for outside selections
  dragEnd.value = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  }
  
  // Update selection box
  updateSelectionBox()
  
  // Find intersecting items
  const intersectingItems = findIntersectingItems()
  emit('selectionChange', intersectingItems, event.ctrlKey || event.metaKey)
}

const handleDocumentMouseUp = (_event) => {
  if (!isDragging.value) return
  
  isDragging.value = false
  selectionBox.value = null
  
  // Remove document-level event listeners
  document.removeEventListener('mousemove', handleDocumentMouseMove)
  document.removeEventListener('mouseup', handleDocumentMouseUp)
  
  // Restore text selection
  document.body.style.userSelect = ''
}

const updateSelectionBox = () => {
  if (!isDragging.value || !gridContainer.value) return
  
  const gridRect = gridContainer.value.getBoundingClientRect()
  
  // Calculate selection box bounds (can extend outside grid container)
  const startX = Math.min(dragStart.value.x, dragEnd.value.x)
  const startY = Math.min(dragStart.value.y, dragEnd.value.y)
  const endX = Math.max(dragStart.value.x, dragEnd.value.x)
  const endY = Math.max(dragStart.value.y, dragEnd.value.y)
  
  // Clamp the visible selection box to grid boundaries for display
  const visibleStartX = Math.max(0, startX)
  const visibleStartY = Math.max(0, startY)
  const visibleEndX = Math.min(gridRect.width, endX)
  const visibleEndY = Math.min(gridRect.height, endY)
  
  selectionBox.value = {
    // Full selection bounds for intersection calculation
    fullLeft: startX,
    fullTop: startY,
    fullWidth: endX - startX,
    fullHeight: endY - startY,
    
    // Visible bounds for display
    left: visibleStartX,
    top: visibleStartY,
    width: Math.max(0, visibleEndX - visibleStartX),
    height: Math.max(0, visibleEndY - visibleStartY)
  }
}

const findIntersectingItems = () => {
  if (!selectionBox.value || !gridContainer.value) return []
  
  const intersecting = []
  const gridRect = gridContainer.value.getBoundingClientRect()
  
  // Get all grid item elements
  const itemElements = gridContainer.value.querySelectorAll('.file-grid-item')
  
  itemElements.forEach((element, index) => {
    const itemRect = element.getBoundingClientRect()
    const relativeItemRect = {
      left: itemRect.left - gridRect.left,
      top: itemRect.top - gridRect.top,
      right: itemRect.right - gridRect.left,
      bottom: itemRect.bottom - gridRect.top
    }
    
    // Use full selection bounds for intersection (including area outside container)
    const selectionLeft = selectionBox.value.fullLeft
    const selectionTop = selectionBox.value.fullTop
    const selectionRight = selectionLeft + selectionBox.value.fullWidth
    const selectionBottom = selectionTop + selectionBox.value.fullHeight
    
    if (selectionLeft < relativeItemRect.right &&
        selectionRight > relativeItemRect.left &&
        selectionTop < relativeItemRect.bottom &&
        selectionBottom > relativeItemRect.top) {
      
      if (index < displayItems.value.length) {
        intersecting.push(displayItems.value[index].raw)
      }
    }
  })
  
  return intersecting
}

// Selection box style
const selectionBoxStyle = computed(() => {
  if (!selectionBox.value) return {}
  
  return {
    left: `${selectionBox.value.left}px`,
    top: `${selectionBox.value.top}px`,
    width: `${selectionBox.value.width}px`,
    height: `${selectionBox.value.height}px`
  }
})

// Lifecycle hooks
onMounted(() => {
  // Add escape key handler
  document.addEventListener('keydown', handleEscapeKey)
})

onUnmounted(() => {
  // Clean up event listeners
  document.removeEventListener('mousemove', handleDocumentMouseMove)
  document.removeEventListener('mouseup', handleDocumentMouseUp)
  document.removeEventListener('keydown', handleEscapeKey)
  
  // Restore text selection if component is unmounted during drag
  if (isDragging.value) {
    document.body.style.userSelect = ''
  }
})

// Handle escape key to cancel selection
const handleEscapeKey = (event) => {
  if (event.key === 'Escape' && isDragging.value) {
    isDragging.value = false
    selectionBox.value = null
    
    // Remove document-level event listeners
    document.removeEventListener('mousemove', handleDocumentMouseMove)
    document.removeEventListener('mouseup', handleDocumentMouseUp)
    
    // Restore text selection
    document.body.style.userSelect = ''
  }
}

// Computed properties
const showEmptyState = computed(() => 
  !props.loading && displayItems.value.length === 0
)
</script>

<style scoped>
/* Standard Grid */
.explorer-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 0.75rem;
  padding: 1rem;
  background: transparent;
  position: relative;
}

/* Virtual Grid */
.virtual-grid-container {
  width: 100%;
  overflow-y: auto;
  overflow-x: hidden;
}

.virtual-grid-spacer {
  position: relative;
}

.virtual-grid-content {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 0.75rem;
  padding: 1rem;
}

/* Optimized Grid (RecycleScroller) */
.optimized-grid {
  width: 100%;
  overflow: hidden;
}

.scroller {
  height: 100%;
  width: 100%;
}

/* Common styles */
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

/* Selection box */
.selection-box {
  position: absolute;
  border: 2px solid var(--tblr-primary, #0054a6);
  background: rgba(0, 84, 166, 0.1);
  pointer-events: none;
  z-index: 1000;
  border-radius: 2px;
  overflow: visible;
}

/* Prevent text selection during drag */
.explorer-grid {
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

/* Mobile optimizations */
@media (max-width: 768px) {
  .explorer-grid,
  .virtual-grid-content {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 0.5rem;
    padding: 0.5rem;
  }
}
</style>