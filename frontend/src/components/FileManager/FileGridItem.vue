<template>
  <div 
    class="explorer-item file-grid-item" 
    role="gridcell"
    :tabindex="tabIndex"
    :data-index="index"
    @dblclick="handleDoubleClick"
    @mousedown="(event) => handleMouseDown(props.item, event)"
    @mouseup="(event) => handleMouseUp(props.item, event)"
    @mouseleave="() => handleMouseLeave(props.item)"
    @touchstart.passive="(event) => handleTouchStart(props.item, event)"
    @touchend="() => handleTouchEnd(props.item)"
    @touchmove.passive="() => handleTouchMove(props.item)"
    :title="tooltip"
    :aria-label="ariaLabel"
    :aria-selected="isSelected"
    :class="{ 
      selected: isSelected,
      'long-pressing': isLongPressing && longPressItem === props.item
    }"
  >
    <div class="icon-wrap">
      <Icon :icon="icon" class="explorer-icon" :class="`text-${iconClass}`" />
    </div>
    <div class="explorer-label" v-text="name"></div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useFileManager } from '@/composables/useFileManager'

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

const props = defineProps({
  item: { type: Object, required: true },
  index: { type: Number, required: true },
  isSelected: { type: Boolean, default: false },
  tabIndex: { type: Number, default: -1 }
})

const emit = defineEmits(['doubleClick'])

const handleDoubleClick = (event) => {
  emit('doubleClick', props.item, event)
}

const icon = computed(() => getFileIcon(props.item))
const iconClass = computed(() => getFileColor(props.item))
const name = computed(() => props.item.name)

const tooltip = computed(() => {
  const parts = [props.item.name]
  if (props.item.size) {
    parts.push(`Size: ${getFileSize(props.item.size)}`)
  }
  if (props.item.updated) {
    parts.push(`Modified: ${new Date(props.item.updated).toLocaleString()}`)
  }
  return parts.join('\n')
})

const ariaLabel = computed(() => {
  const type = props.item.type === 'folder' ? 'Folder' : 'File'
  const selected = props.isSelected ? ', selected' : ''
  return `${type}: ${props.item.name}${selected}`
})
</script>

<style scoped>
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
.folder { color: #f59e0b; }
.xml { color: #10b981; }
.rtf { color: #ef4444; }
.txt { color: #3b82f6; }
.file { color: var(--tblr-primary); }

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