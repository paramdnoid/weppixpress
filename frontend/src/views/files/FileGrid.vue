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
        <!-- Grid Item (Virtual Mode) -->
        <div
          v-for="(item, index) in visibleItems"
          :key="getItemKey(item)"
          class="explorer-item file-grid-item"
          role="gridcell"
          :tabindex="-1"
          :data-index="startIndex + index"
          :title="getTooltip(item)"
          :aria-label="getAriaLabel(item)"
          :aria-selected="isSelected(item)"
          :class="{
            selected: isSelected(item),
            'long-pressing': isLongPressing && longPressItem === item
          }"
          @dblclick="$emit('itemDoubleClick', item)"
          @contextmenu.prevent="$emit('itemContextMenu', item, $event)"
          @mousedown="(event) => handleMouseDown(item, event)"
          @mouseup="(event) => handleMouseUp(item, event)"
          @mouseleave="() => handleMouseLeave(item)"
          @touchstart.passive="(event) => handleTouchStart(item, event)"
          @touchend="() => handleTouchEnd(item)"
          @touchmove.passive="() => handleTouchMove(item)"
        >
          <div class="icon-wrap">
            <Icon
              :icon="getFileIcon(item)"
              class="explorer-icon"
              :class="`text-${getFileColor(item)}`"
            />
          </div>
          <div
            class="explorer-label"
            v-text="item.name"
          />
        </div>
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
      <!-- Grid Item (Optimized Mode) -->
      <div
        class="explorer-item file-grid-item"
        role="gridcell"
        :tabindex="-1"
        :data-index="index"
        :title="getTooltip(item)"
        :aria-label="getAriaLabel(item)"
        :aria-selected="isSelected(item)"
        :class="{
          selected: isSelected(item),
          'long-pressing': isLongPressing && longPressItem === item
        }"
        @dblclick="$emit('itemDoubleClick', item)"
        @contextmenu.prevent="$emit('itemContextMenu', item, $event)"
        @mousedown="(event) => handleMouseDown(item, event)"
        @mouseup="(event) => handleMouseUp(item, event)"
        @mouseleave="() => handleMouseLeave(item)"
        @touchstart.passive="(event) => handleTouchStart(item, event)"
        @touchend="() => handleTouchEnd(item)"
        @touchmove.passive="() => handleTouchMove(item)"
      >
        <div class="icon-wrap">
          <Icon
            :icon="getFileIcon(item)"
            class="explorer-icon"
            :class="`text-${getFileColor(item)}`"
          />
        </div>
        <div
          class="explorer-label"
          v-text="item.name"
        />
      </div>
    </RecycleScroller>
  </div>

  <!-- Standard Grid Mode with Breadcrumb -->
  <div
    v-else
    class="file-grid-with-breadcrumb d-flex flex-column h-100"
  >
    <!-- Breadcrumb Navigation -->
    <div class="nav-scroller bg-body p-1 border-bottom">
      <nav
        class="nav me-1"
        aria-label="Secondary navigation"
      >
        <AppBreadcrumb
          :items="breadcrumbs"
          @navigate="$emit('navigate', $event)"
        />
      </nav>
    </div>

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
      class="loading-state d-flex flex-column justify-content-center align-items-center text-center flex-grow-1"
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

    <!-- Grid Container -->
    <div
      v-else
      ref="gridContainer"
      class="explorer-grid content-scroll"
      role="grid"
      :aria-label="`File grid with ${items.length} items`"
      @keydown="handleKeyNavigation"
      @mousedown="handleGridMouseDown"
    >
      <!-- Grid Items -->
      <div
        v-for="(item, index) in items"
        :key="itemKey(item)"
        class="explorer-item file-grid-item"
        role="gridcell"
        :tabindex="index === 0 ? 0 : -1"
        :data-index="index"
        :title="getTooltip(item)"
        :aria-label="getAriaLabel(item)"
        :aria-selected="isSelected(item)"
        :class="{
          selected: isSelected(item),
          'long-pressing': isLongPressing && longPressItem === item
        }"
        @dblclick="$emit('itemDoubleClick', item)"
        @contextmenu.prevent="$emit('itemContextMenu', item, $event)"
        @mousedown="(event) => handleMouseDown(item, event)"
        @mouseup="(event) => handleMouseUp(item, event)"
        @mouseleave="() => handleMouseLeave(item)"
        @touchstart.passive="(event) => handleTouchStart(item, event)"
        @touchend="() => handleTouchEnd(item)"
        @touchmove.passive="() => handleTouchMove(item)"
        @click="(event) => handleItemClick(item, event)"
      >
        <div class="icon-wrap">
          <Icon
            :icon="getFileIcon(item)"
            class="explorer-icon"
            :class="`text-${getFileColor(item)}`"
          />
        </div>
        <div
          class="explorer-label"
          v-text="item.name"
        />
      </div>


      <!-- Selection Box -->
      <div
        v-if="isDragging && selectionBox"
        class="selection-box"
        :style="selectionBoxStyle"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { RecycleScroller } from 'vue-virtual-scroller'
import { useFileManager } from '@/composables/useFileManager'
import { useVirtualScroll } from '@/composables/useVirtualScroll'
import AppBreadcrumb from '@/components/base/AppBreadcrumb.vue'
import EmptyState from '@/components/base/EmptyState.vue'
import ErrorState from '@/components/base/ErrorState.vue'

const {
  getFileIcon,
  getFileColor,
  getFileSize,
  handleMouseDown,
  handleMouseUp,
  handleMouseLeave,
  handleTouchStart,
  handleTouchEnd,
  handleTouchMove,
  isLongPressing,
  longPressItem
} = useFileManager()

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

const emit = defineEmits(['itemDoubleClick', 'selectionChange', 'navigate', 'itemContextMenu', 'itemSelect', 'retry', 'clearSearch'])

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

// Helper functions for grid items
function getTooltip(item) {
  const parts = [item.name]
  if (item.size) {
    parts.push(`Size: ${getFileSize(item.size)}`)
  }
  if (item.updated || item.modified) {
    const date = item.updated || item.modified
    parts.push(`Modified: ${new Date(date).toLocaleString()}`)
  }
  return parts.join('\n')
}

function getAriaLabel(item) {
  const type = item.type === 'folder' ? 'Folder' : 'File'
  const selected = isSelected(item) ? ', selected' : ''
  const size = item.size ? `, ${getFileSize(item.size)}` : ''
  return `${type}: ${item.name}${selected}${size}`
}

// Selection logic
const isSelected = (item) => {
  const itemId = props.itemKey ? props.itemKey(item) : (item.path || item.name)
  return props.selectedItems?.has(itemId) || false
}

// Handle item click for selection
function handleItemClick(item, event) {
  // Don't handle if it's a drag operation
  if (isDragging.value) return

  // Emit selection event
  emit('itemSelect', item, event)
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

// Mouse drag selection for grid area
const handleGridMouseDown = (event) => {
  // Start selection if clicking in grid area (including on items)
  if (event.target === gridContainer.value || event.target.closest('.explorer-grid') === gridContainer.value) {
    // Don't start drag on right click
    if (event.button === 2) {
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

      if (index < props.items.length) {
        intersecting.push(props.items[index])
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
  !props.loading && !props.error && props.items.length === 0
)
</script>

<style scoped>
/* Navigation bar styling */
.nav-scroller {
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 2;
  overflow-y: hidden;
  gap: 1rem;
  flex: 0 0 auto;
  height: 40.5px;
  background: var(--tblr-body-bg, #fff);
}

/* Standard Grid */
.explorer-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  grid-auto-rows: max-content;
  gap: 0.75rem;
  padding: 1rem;
  background: transparent;
  position: relative;
  min-height: 100%;
  flex: 1;
  align-content: start;
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

/* Grid Item Styles */
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
  border: 1px solid transparent;
  background: transparent;
}

.explorer-item.selected {
  background: var(--tblr-gray-100);
  border-color: var(--tblr-gray-200);
}

.explorer-item.long-pressing {
  background: var(--tblr-primary-lt);
  border-color: var(--tblr-primary);
  transform: scale(0.98);
  box-shadow: 0 0 0 2px rgba(0, 84, 166, 0.2);
}

.explorer-item:hover {
  background-color: var(--tblr-gray-50);
  transform: translateY(-1px);
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
}

/* File type colors */
.text-folder { color: #f59e0b; }
.text-xml { color: #10b981; }
.text-rtf { color: #ef4444; }
.text-txt { color: #3b82f6; }
.text-file { color: var(--tblr-primary); }

/* Common styles */
.empty-state,
.loading-state {
  grid-column: 1 / -1;
}

/* Empty state specific styles */
.explorer-grid .empty-state {
  min-height: 400px;
  height: 100%;
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

/* Content scroll styles */
.content-scroll {
  flex: 1 1 0;
  min-height: 0;
  overflow: auto;
  height: 0;
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

/* Mobile optimizations */
@media (max-width: 768px) {
  .explorer-grid,
  .virtual-grid-content {
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