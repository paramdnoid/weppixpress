<template>
  <tr 
    class="file-row"
    role="row"
    :class="{ 
      'table-active': isSelected,
      'table-focus': isFocused 
    }"
    :tabindex="tabIndex"
    :data-index="index"
    @click="$emit('select', $event)"
    @dblclick="$emit('dblclick')"
    @keydown.enter="$emit('dblclick')"
    @keydown.space.prevent="$emit('select', $event)"
    :aria-label="ariaLabel"
    :aria-selected="isSelected"
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
        <span class="file-name text-truncate" :title="item.name">
          {{ item.name }}
        </span>
      </div>
    </td>
    <td class="w-0 text-muted file-date-cell">
      <time 
        v-if="item.updated" 
        :datetime="item.updated"
        :title="fullDateString"
      >
        {{ formattedDate }}
      </time>
      <span v-else>-</span>
    </td>
    <td class="text-end text-muted file-size-cell">
      <span :title="sizeTooltip">
        {{ formattedSize }}
      </span>
    </td>
  </tr>
</template>

<script setup>
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useFiles } from '@/composables/useFiles'

const { getFileIcon, getFileColor, getDateFormatted, getFileSize } = useFiles()

const props = defineProps({
  item: { type: Object, required: true },
  index: { type: Number, required: true },
  isSelected: { type: Boolean, default: false },
  isFocused: { type: Boolean, default: false },
  tabIndex: { type: Number, default: -1 }
})

defineEmits(['select', 'dblclick'])

const fileIcon = computed(() => getFileIcon(props.item))
const fileTypeClass = computed(() => {
  if (props.item.type === 'folder') return 'text-warning'
  return `text-${getFileColor(props.item)}`
})

const formattedDate = computed(() => getDateFormatted(props.item.updated))
const fullDateString = computed(() => 
  props.item.updated ? new Date(props.item.updated).toLocaleString() : ''
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
  const modified = props.item.updated ? `, modified ${getDateFormatted(props.item.updated)}` : ''
  return `${type}: ${props.item.name}${selected}${size}${modified}`
})
</script>