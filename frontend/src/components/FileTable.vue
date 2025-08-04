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
        v-for="item in items" :key="itemKey(item)"
        @dblclick="onItemDblClick(item)" 
        class="cursor-pointer"
      >
        <td>
          <Icon icon="mdi:folder" class="text-warning me-2" />{{ item.name }}
        </td>
        <td>{{ item.modified }}</td>
        <td class="text-end">{{ item.size || '-' }}</td>
      </tr>
    </tbody>
  </table>
</template>

<script setup>
import { Icon } from '@iconify/vue'
import { getFileIcon, getFileColor } from '@/composables/useFiles';

const props = defineProps({
  items: { type: Array, required: true },
  itemKey: { type: Function, default: item => item.id || item.name },
  sortKey: { type: String, default: '' },
  sortDir: { type: String, default: 'asc' }
})

const emit = defineEmits(['itemDblClick'])
function onItemDblClick(item) { emit('itemDblClick', item) }  
</script>