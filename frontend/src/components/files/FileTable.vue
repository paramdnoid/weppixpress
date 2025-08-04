<template>
  <table class="table table-hover table-nowrap">
    <thead>
      <tr>
        <th>Name</th>
        <th>Modified</th>
        <th class="text-end">Size</th>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="item in sortedItems" :key="itemKey(item)"
        @dblclick="onItemDblClick(item)" 
        class="cursor-pointer"
      >
        <td>
          <Icon :icon="item.type === 'folder' ? 'mdi:folder' : 'mdi:file-outline'" :class="item.type === 'folder' ? 'text-warning me-2' : 'text-primary me-2'" />{{ item.name }}
        </td>
        <td>{{ item.modified }}</td>
        <td class="text-end">{{ item.size || '-' }}</td>
      </tr>
    </tbody>
  </table>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  items: { type: Array, required: true },
  itemKey: { type: Function, default: item => item.id || item.name },
  sortKey: { type: String, default: '' },
  sortDir: { type: String, default: 'asc' }
})

const emit = defineEmits(['itemDblClick', 'sort'])
function onItemDblClick(item) { emit('itemDblClick', item) }

const sortedItems = computed(() => {
  return [...props.items].sort((a, b) => {
    if (a.type === b.type) return 0
    return a.type === 'folder' ? -1 : 1
  })
})
</script>