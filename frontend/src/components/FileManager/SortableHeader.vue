<template>
  <th :scope="scope" :class="thClass" class="py-0">
    <button 
      class="btn btn-action p-0 d-flex align-items-center"
      :class="buttonClass"
      @click="$emit('sort', sortKey)"
      :aria-label="ariaLabel"
      type="button"
    >
      <Icon :icon="icon" class="me-2" width="16" height="16" />
      <span v-text="label"></span>
      <Icon 
        v-if="isActive" 
        :icon="sortIcon"
        width="16" 
        height="16" 
        class="ms-2" 
        aria-hidden="true"
      />
    </button>
  </th>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  sortKey: { type: String, required: true },
  currentSortKey: { type: String, required: true },
  sortDir: { type: String, required: true },
  label: { type: String, required: true },
  icon: { type: String, required: true },
  scope: { type: String, default: 'col' },
  thClass: { type: String, default: 'sortable-header' },
  buttonClass: { type: String, default: '' }
})

defineEmits(['sort'])

const isActive = computed(() => props.currentSortKey === props.sortKey)
const sortIcon = computed(() => props.sortDir === 'asc' ? 'mdi:arrow-up' : 'mdi:arrow-down')
const ariaLabel = computed(() => {
  const direction = isActive.value && props.sortDir === 'asc' ? 'descending' : 'ascending'
  return `Sort by ${props.label} ${direction}`
})
</script>