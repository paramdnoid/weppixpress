<template>
  <div ref="containerRef" class="virtual-grid-container" @scroll="handleScroll">
    <div class="virtual-grid-spacer" :style="spacerStyle"></div>
    <div class="virtual-grid-viewport" :style="viewportStyle">
      <TransitionGroup name="grid-item" tag="div" class="virtual-grid">
        <div
          v-for="item in visibleItems"
          :key="item.path"
          class="grid-item"
          :class="{ 
            selected: isSelected(item),
            focused: isFocused(item)
          }"
          @click="handleClick(item, $event)"
          @dblclick="handleDoubleClick(item)"
          @contextmenu.prevent="handleContextMenu(item, $event)"
          @dragstart="(e) => handleDragStart(e, item)"
          @dragover.prevent="handleDragOver"
          @drop="(e) => handleDrop(e, item)"
          :draggable="true"
          :data-path="item.path"
          role="gridcell"
          :aria-selected="isSelected(item)"
          :tabindex="isFocused(item) ? 0 : -1"
        >
          <div class="item-thumbnail">
            <FileIcon 
              :item="item" 
              :size="thumbnailSize"
              :lazy="true"
            />
            <div v-if="item.hasThumbnail" class="item-preview">
              <img 
                :src="`/api/files/thumbnail/${item.thumbnailId}`"
                :alt="item.name"
                loading="lazy"
                @error="handleThumbnailError"
              />
            </div>
          </div>
          <div class="item-info">
            <div class="item-name" :title="item.name">
              {{ truncateName(item.name) }}
            </div>
            <div class="item-meta">
              <span class="item-size">{{ item.sizeFormatted }}</span>
              <span class="item-date">{{ formatDate(item.modified) }}</span>
            </div>
          </div>
          <div v-if="showCheckbox" class="item-checkbox">
            <input 
              type="checkbox" 
              :checked="isSelected(item)"
              @click.stop="toggleSelection(item)"
              class="form-check-input"
            />
          </div>
        </div>
      </TransitionGroup>
    </div>
    
    <!-- Context Menu -->
    <Teleport to="body">
      <div 
        v-if="contextMenu.visible"
        ref="contextMenuRef"
        class="context-menu"
        :style="contextMenuStyle"
        @click.stop
      >
        <div class="dropdown-menu show" role="menu">
          <template v-for="(action, i) in contextMenuActions" :key="action.id ?? `divider-${i}`">
            <hr v-if="action.type === 'divider'" class="dropdown-divider" role="separator" />
            <button
              v-else
              class="dropdown-item"
              :class="[{ disabled: action.disabled }, action.class]"
              :disabled="action.disabled"
              role="menuitem"
              @click="handleContextAction(action)"
            >
              <Icon v-if="action.icon" :icon="action.icon" class="me-2" />
              {{ action.label }}
              <kbd v-if="action.shortcut" class="ms-auto">{{ action.shortcut }}</kbd>
            </button>
          </template>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick, type CSSProperties } from 'vue';
import { useFileManager } from '@/composables/useFileManager';
import type { FileItem } from '../../types';
import FileIcon from './FileIcon.vue';

const props = defineProps<{
  items: FileItem[];
  selectedItems: Set<string>;
  thumbnailSize?: number;
  showCheckbox?: boolean;
  itemsPerRow?: number;
}>();

const emit = defineEmits<{
  (e: 'select', item: FileItem, event: MouseEvent): void;
  (e: 'open', item: FileItem): void;
  (e: 'contextAction', action: string, items: FileItem[]): void;
}>();

// Refs
const containerRef = ref<HTMLElement>();
const contextMenuRef = ref<HTMLElement>();

// Virtual scrolling setup
const {
  visibleItems,
  spacerStyle,
  viewportStyle,
  handleScroll,
  scrollToItem
} = useVirtualList({
  items: computed(() => props.items),
  container: containerRef,
  itemHeight: 120,
  itemsPerRow: props.itemsPerRow || 6,
  buffer: 2
});

// File manager setup
const { hasClipboard } = useFileManager()

// Context menu
const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  items: [] as FileItem[]
});

const contextMenuStyle = computed<CSSProperties>(() => ({
  position: 'fixed',
  left: `${contextMenu.value.x}px`,
  top: `${contextMenu.value.y}px`,
  zIndex: 9999
}));

const contextMenuActions = computed(() => [
  { 
    id: 'open', 
    label: 'Open', 
    icon: 'mdi:folder-open',
    shortcut: 'Enter',
    disabled: false 
  },
  { 
    id: 'rename', 
    label: 'Rename', 
    icon: 'mdi:rename-box',
    shortcut: 'F2',
    disabled: contextMenu.value.items.length !== 1 
  },
  { 
    id: 'copy', 
    label: 'Copy', 
    icon: 'mdi:content-copy',
    shortcut: 'Ctrl+C',
    disabled: false 
  },
  { 
    id: 'cut', 
    label: 'Cut', 
    icon: 'mdi:content-cut',
    shortcut: 'Ctrl+X',
    disabled: false 
  },
  { 
    id: 'paste', 
    label: 'Paste', 
    icon: 'mdi:content-paste',
    shortcut: 'Ctrl+V',
    disabled: !hasClipboard.value 
  },
  { type: 'divider' },
  { 
    id: 'delete', 
    label: 'Delete', 
    icon: 'mdi:delete',
    shortcut: 'Del',
    disabled: false,
    class: 'text-danger' 
  }
]);

// Simple focused item tracking
const focusedItem = ref<FileItem | null>(null)

// Simple drag state
const isDragging = ref(false)
const draggedItems = ref<FileItem[]>([])

function handleDragStart(event: DragEvent, item: FileItem) {
  isDragging.value = true
  draggedItems.value = [item]
}

function handleDragOver(event: DragEvent) {
  event.preventDefault()
}

function handleDrop(event: DragEvent, target: FileItem) {
  event.preventDefault()
  isDragging.value = false
  if (draggedItems.value.length > 0) {
    emit('contextAction', 'move', [...draggedItems.value, target])
  }
  draggedItems.value = []
}

// Methods
function isSelected(item: FileItem): boolean {
  return props.selectedItems.has(item.path);
}

function isFocused(item: FileItem): boolean {
  return focusedItem.value?.path === item.path;
}

function handleClick(item: FileItem, event: MouseEvent) {
  emit('select', item, event);
  focusedItem.value = item;
}

function handleDoubleClick(item: FileItem) {
  emit('open', item);
}

function handleContextMenu(item: FileItem, event: MouseEvent) {
  // Select item if not already selected
  if (!isSelected(item)) {
    emit('select', item, event);
  }
  
  // Show context menu
  contextMenu.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY,
    items: isSelected(item) 
      ? Array.from(props.selectedItems).map(path => 
          props.items.find(i => i.path === path)!
        )
      : [item]
  };
}

function handleContextAction(action: any) {
  if (!action.disabled) {
    emit('contextAction', action.id, contextMenu.value.items);
  }
  contextMenu.value.visible = false;
}

function toggleSelection(item: FileItem) {
  const event = new MouseEvent('click', { ctrlKey: true });
  emit('select', item, event);
}

function truncateName(name: string): string {
  const maxLength = 25;
  if (name.length <= maxLength) return name;
  
  const ext = name.lastIndexOf('.');
  if (ext === -1) {
    return name.substring(0, maxLength - 3) + '...';
  }
  
  const baseName = name.substring(0, ext);
  const extension = name.substring(ext);
  const maxBase = maxLength - extension.length - 3;
  
  if (baseName.length > maxBase) {
    return baseName.substring(0, maxBase) + '...' + extension;
  }
  
  return name;
}

function formatDate(date: string): string {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) {
    return d.toLocaleTimeString(undefined, { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  } else if (days < 7) {
    return `${days} day${days === 1 ? '' : 's'} ago`;
  } else {
    return d.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric' 
    });
  }
}

function handleThumbnailError(event: Event) {
  const img = event.target as HTMLImageElement;
  img.style.display = 'none';
}

// Click outside to close context menu
function handleClickOutside(event: MouseEvent) {
  if (contextMenuRef.value && !contextMenuRef.value.contains(event.target as Node)) {
    contextMenu.value.visible = false;
  }
}

// Lifecycle
onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  document.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  document.removeEventListener('keydown', handleKeyDown);
});
</script>

<style scoped lang="scss">
.virtual-grid-container {
  position: relative;
  height: 100%;
  overflow: auto;
  scroll-behavior: smooth;
  
  // Custom scrollbar
  &::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }
  
  &::-webkit-scrollbar-track {
    background: var(--tblr-gray-100);
    border-radius: 5px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: var(--tblr-gray-400);
    border-radius: 5px;
    
    &:hover {
      background: var(--tblr-gray-500);
    }
  }
}

.virtual-grid-spacer {
  position: absolute;
  top: 0;
  left: 0;
  width: 1px;
  pointer-events: none;
}

.virtual-grid-viewport {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
}

.virtual-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 1rem;
  padding: 1rem;
}

.grid-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.75rem;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
  
  &:hover {
    background-color: var(--tblr-gray-100);
    transform: translateY(-2px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
  
  &.selected {
    background-color: var(--tblr-primary-lt);
    border: 2px solid var(--tblr-primary);
  }
  
  &.focused {
    outline: 2px solid var(--tblr-primary);
    outline-offset: 2px;
  }
  
  &[draggable="true"] {
    cursor: move;
  }
  
  &.drag-over {
    background-color: var(--tblr-primary-lt);
    border: 2px dashed var(--tblr-primary);
  }
}

.item-thumbnail {
  position: relative;
  width: 64px;
  height: 64px;
  margin-bottom: 0.5rem;
  
  .item-preview {
    position: absolute;
    inset: 0;
    border-radius: 0.25rem;
    overflow: hidden;
    
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }
}

.item-info {
  width: 100%;
  text-align: center;
  
  .item-name {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--tblr-body-color);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-bottom: 0.25rem;
  }
  
  .item-meta {
    display: flex;
    justify-content: center;
    gap: 0.5rem;
    font-size: 0.75rem;
    color: var(--tblr-muted);
    
    .item-size,
    .item-date {
      white-space: nowrap;
    }
  }
}

.item-checkbox {
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
  
  .form-check-input {
    width: 1rem;
    height: 1rem;
    border-radius: 0.25rem;
  }
}

// Grid item transitions
.grid-item-enter-active,
.grid-item-leave-active {
  transition: all 0.3s ease;
}

.grid-item-enter-from {
  opacity: 0;
  transform: scale(0.8);
}

.grid-item-leave-to {
  opacity: 0;
  transform: scale(0.8);
}

.grid-item-move {
  transition: transform 0.3s ease;
}

// Context menu styling
.context-menu {
  .dropdown-menu {
    min-width: 200px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    
    .dropdown-item {
      display: flex;
      align-items: center;
      padding: 0.5rem 1rem;
      
      &:hover:not(.disabled) {
        background-color: var(--tblr-gray-100);
      }
      
      &.disabled {
        opacity: 0.5;
        pointer-events: none;
      }
      
      kbd {
        margin-left: auto;
        padding: 0.125rem 0.375rem;
        font-size: 0.75rem;
        background-color: var(--tblr-gray-200);
        border-radius: 0.25rem;
      }
    }
  }
}
</style>