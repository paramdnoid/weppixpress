<template>
  <Icon
    :icon="icon"
    :class="iconClass"
    :width="size"
    :height="size"
    v-bind="$attrs"
  />
</template>

<script setup>
import { computed } from 'vue'
import { getFileIcon, getFileColor } from '@/composables/useFileIcons'

const props = defineProps({
  item: {
    type: Object,
    required: true
  },
  size: {
    type: [String, Number],
    default: 20
  },
  colorPrefix: {
    type: String,
    default: 'text'
  }
})

const icon = computed(() => getFileIcon(props.item))

const iconClass = computed(() => {
  const color = getFileColor(props.item)
  return `${props.colorPrefix}-${color}`
})
</script>