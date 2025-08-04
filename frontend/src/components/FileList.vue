<template>
  <table class="table table-vcenter">
    <tbody>
      <tr
        v-for="item in items" :key="itemKey(item)"
        @dblclick="$emit('itemDblClick', item)"
        class="cursor-pointer"
      >
        <td class="w-1">
          <Icon
            :icon="item.isFolder ? 'mdi:folder' : 'mdi:file-outline'"
            class="me-2"
            width="20"
            height="20"
          />
        </td>
        <td>{{ item.name }}</td>
        <td class="text-end text-muted">
          {{ item.size || '-' }}
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script setup>
import { computed } from 'vue'
import { getFileIcon, getFileComparator, getSizeFormated, getDateFormated } from '@/composables/useFiles';

const props = defineProps({
  items: { type: Array, required: true },
  itemKey: { type: Function, default: item => item.id || item.name },
  sortKey: { type: String, default: '' },
  sortDir: { type: String, default: 'asc' }
})

const sortedItems = computed(() => {
  return [...props.items].sort(getFileComparator(props.sortKey, props.sortDir));
})

const emit = defineEmits(['itemDblClick', 'sort'])
function onItemDblClick(item) { emit('itemDblClick', item) }

</script>