<template>
  <tr
    class="file-row cursor-pointer"
    role="row"
    :class="{
      'table-active': isSelected,
      'table-focus': isFocused
    }"
    :tabindex="tabindex"
    :aria-label="ariaLabel"
    :aria-selected="isSelected"
    @click="$emit('click', item, $event)"
    @dblclick="$emit('dblclick', item, $event)"
    @contextmenu="$emit('contextmenu', item, $event)"
    @keydown.space.prevent="$emit('click', item, $event)"
  >
    <td class="file-name-cell text-start">
      <div class="d-flex align-items-center">
        <FileIcon
          :item="item"
          :size="20"
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
        :title="getFullDateString(item)"
      >
        <span v-text="getDateFormatted(item.modified)" />
      </time>
      <span v-else>-</span>
    </td>
    <td class="text-end text-muted file-size-cell">
      <span
        :title="getSizeTooltip(item)"
        v-text="getFormattedSize(item)"
      />
    </td>
  </tr>
</template>

<script setup>
import { computed } from 'vue'
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
  isFocused: {
    type: Boolean,
    default: false
  },
  tabindex: {
    type: Number,
    default: -1
  }
})

defineEmits(['click', 'dblclick', 'contextmenu'])

const { getFileSize, getDateFormatted } = useFileManager()

// Helper functions
function getFormattedSize(item) {
  return item.size ? getFileSize(item.size) : '-'
}

function getSizeTooltip(item) {
  return item.size ? `${item.size} bytes` : 'No size information'
}

function getFullDateString(item) {
  return item.modified ? new Date(item.modified).toLocaleString() : ''
}

const ariaLabel = computed(() => {
  const type = props.item.type === 'folder' ? 'Folder' : 'File'
  const selected = props.isSelected ? ', selected' : ''
  const size = props.item.size ? `, ${getFileSize(props.item.size)}` : ''
  const modified = props.item.modified ? `, modified ${getDateFormatted(props.item.modified)}` : ''
  return `${type}: ${props.item.name}${selected}${size}${modified}`
})
</script>

<style scoped>
.file-row {
  transition: background-color 0.15s ease-in-out;
}

.file-row:hover {
  background-color: var(--bs-gray-100);
}

.file-row.table-active {
  background-color: var(--bs-primary-bg-subtle);
}

.file-row.table-focus {
  outline: 2px solid var(--bs-primary);
  outline-offset: -2px;
}

.file-name-cell {
  min-width: 200px;
}

.file-date-cell {
  white-space: nowrap;
}

.file-size-cell {
  white-space: nowrap;
  min-width: 100px;
}
</style>