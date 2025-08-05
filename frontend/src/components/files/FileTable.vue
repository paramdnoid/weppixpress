<template>
  <table class="table table-hover table-nowrap">
    <thead>
      <tr>
        <th>
          <button class="btn btn-sm btn-action p-0" @click="$emit('sort', 'name')">
            Name
          </button>
        </th>
        <th class="w-0">
          <button class="btn btn-sm btn-action p-0" @click="$emit('sort', 'modified')">
            Modified
          </button>
        </th>
        <th class="text-end w-0">
          <button class="btn btn-sm btn-action p-0" @click="$emit('sort', 'size')">
            Size
          </button>
        </th>
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
        <td class="w-0">{{ getDateFormated(item.updated) }}</td>
        <td class="text-end">{{ item.size || '-' }}</td>
      </tr>
    </tbody>
  </table>
</template>

<script setup>
import { computed } from 'vue'
import { getDateFormated } from '@/composables/useFiles';

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
    if (a.type === b.type) {
      const valA = (props.sortKey && a[props.sortKey]) || '';
      const valB = (props.sortKey && b[props.sortKey]) || '';
      if (props.sortDir === 'desc') {
        return valB.localeCompare(valA, undefined, { numeric: true });
      }
      return valA.localeCompare(valB, undefined, { numeric: true });
    }
    return a.type === 'folder' ? -1 : 1;
  });
})
</script>