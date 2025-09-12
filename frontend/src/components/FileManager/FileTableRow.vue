<template>
  <tr 
    class="file-row cursor-pointer"
    role="row"
    :class="{ 
      'table-active': isSelected,
      'table-focus': isFocused 
    }"
    :tabindex="tabIndex"
    :data-index="index"
    :aria-label="ariaLabel"
    :aria-selected="isSelected"
    @dblclick="handleDoubleClick"
    @keydown.space.prevent="$emit('select', $event)"
  >
    <td class="file-name-cell">
      <div class="d-flex align-items-center">
        <Icon 
          :icon="fileIcon"
          :class="fileTypeClass"
          width="20" 
          height="20"
          class="me-2 flex-shrink-0" 
          aria-hidden="true"
        />
        <span
          class="file-name text-truncate"
          :title="item.name"
          v-text="item.name"
        />
      </div>
    </td>
    <td class="w-0 text-muted file-date-cell">
      <time 
        v-if="item.modified" 
        :datetime="item.modified"
        :title="fullDateString"
      >
        <span v-text="formattedDate" />
      </time>
      <span v-else>-</span>
    </td>
    <td class="text-end text-muted file-size-cell">
      <span
        :title="sizeTooltip"
        v-text="formattedSize"
      />
    </td>
  </tr>
</template>

<script setup>
import { computed } from 'vue'
import { useFileManager } from '@/composables/useFileManager'

const { getFileIcon, getFileColor, getDateFormatted, getFileSize } = useFileManager()

const props = defineProps({
  item: { type: Object, required: true },
  index: { type: Number, required: true },
  isSelected: { type: Boolean, default: false },
  isFocused: { type: Boolean, default: false },
  tabIndex: { type: Number, default: -1 }
})

const emit = defineEmits(['select', 'doubleClick'])

const handleDoubleClick = () => {
  emit('doubleClick', props.item)
}

const fileIcon = computed(() => getFileIcon(props.item))
const fileTypeClass = computed(() => {
  if (props.item.type === 'folder') return 'text-warning'
  return `text-${getFileColor(props.item)}`
})

const formattedDate = computed(() => getDateFormatted(props.item.modified))
const fullDateString = computed(() => 
  props.item.modified ? new Date(props.item.modified).toLocaleString() : ''
)

const formattedSize = computed(() => {
  return props.item.size ? getFileSize(props.item.size) : '-'
})

const sizeTooltip = computed(() => {
  return props.item.size ? `${props.item.size} bytes` : 'No size information'
})

const ariaLabel = computed(() => {
  const type = props.item.type === 'folder' ? 'Folder' : 'File'
  const selected = props.isSelected ? ', selected' : ''
  const size = props.item.size ? `, ${getFileSize(props.item.size)}` : ''
  const modified = props.item.modified ? `, modified ${getDateFormatted(props.item.modified)}` : ''
  return `${type}: ${props.item.name}${selected}${size}${modified}`
})
</script>