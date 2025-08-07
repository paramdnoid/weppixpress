<template>

</template>

<script setup>
import { computed } from 'vue'
import { getDateFormated, getFileComparator } from '@/composables/useFiles'
import { Icon } from '@iconify/vue'

const props = defineProps({
  items: { type: Array, required: true },
  itemKey: { type: Function, default: item => item.id || item.name },
  sortKey: { type: String, default: '' },
  sortDir: { type: String, default: 'asc' }
})

const emit = defineEmits(['itemDblClick', 'sort'])

function onItemDblClick(item) {
  emit('itemDblClick', item)
}

function onSort(key) {
  emit('sort', key)
}

const sortedItems = computed(() => {
  return [...props.items].sort(getFileComparator(props.sortKey, props.sortDir))
})
</script>

<style scoped>
.table-hover tbody tr:hover {
  background: var(--tblr-gray-50);
}
.btn-action {
  color: inherit;
}
</style>