<template>
  <component
    :is="tag"
    :class="containerClass"
    :title="tooltip"
    :aria-label="ariaLabel"
    :aria-selected="isSelected"
    :tabindex="tabindex"
    v-bind="$attrs"
    @click="$emit('click', item, $event)"
    @dblclick="$emit('dblclick', item, $event)"
    @contextmenu="$emit('contextmenu', item, $event)"
  >
    <slot
      :item="item"
      :icon="icon"
      :color="color"
      :tooltip="tooltip"
    >
      <!-- Default slot content -->
      <FileIcon
        :item="item"
        :size="iconSize"
        class="file-icon"
      />
      <span
        class="file-name"
        :title="item.name"
        v-text="item.name"
      />
    </slot>
  </component>
</template>

<script setup>
import { computed } from 'vue'
import { getFileIcon, getFileColor } from '@/composables/useFileIcons'
import { useFileManager } from '@/composables/useFileManager'
import FileIcon from './FileIcon.vue'

const props = defineProps({
  item: {
    type: Object,
    required: true
  },
  isSelected: {
    type: Boolean,
    default: false
  },
  tag: {
    type: String,
    default: 'div'
  },
  iconSize: {
    type: [String, Number],
    default: 20
  },
  tabindex: {
    type: Number,
    default: -1
  }
})

const emit = defineEmits(['click', 'dblclick', 'contextmenu'])

const { getFileSize, getDateFormatted } = useFileManager()

// Computed properties
const icon = computed(() => getFileIcon(props.item))
const color = computed(() => getFileColor(props.item))

const tooltip = computed(() => {
  const parts = [props.item.name]
  if (props.item.size) {
    parts.push(`Size: ${getFileSize(props.item.size)}`)
  }
  if (props.item.modified) {
    parts.push(`Modified: ${new Date(props.item.modified).toLocaleString()}`)
  }
  return parts.join('\n')
})

const ariaLabel = computed(() => {
  const type = props.item.type === 'folder' ? 'Folder' : 'File'
  const selected = props.isSelected ? ', selected' : ''
  const size = props.item.size ? `, ${getFileSize(props.item.size)}` : ''
  const modified = props.item.modified ? `, modified ${getDateFormatted(props.item.modified)}` : ''
  return `${type}: ${props.item.name}${selected}${size}${modified}`
})

const containerClass = computed(() => {
  return {
    'file-item': true,
    'selected': props.isSelected
  }
})
</script>

<style scoped>
.file-item {
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.file-item:hover {
  background-color: var(--bs-gray-100);
}

.file-item.selected {
  background-color: var(--bs-primary-bg-subtle);
  border-color: var(--bs-primary);
}

.file-icon {
  flex-shrink: 0;
}

.file-name {
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}
</style>