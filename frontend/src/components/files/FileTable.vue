<template>
  <table class="table table-hover table-nowrap">
    <thead>
      <tr>
        <th>
          <button class="btn btn-sm btn-action p-0" @click.prevent="onSort('name')">
            Name
          </button>
        </th>
        <th class="w-0">
          <button class="btn btn-sm btn-action p-0" @click.prevent="onSort('modified')">
            Modified
          </button>
        </th>
        <th class="text-end w-0">
          <button class="btn btn-sm btn-action p-0" @click.prevent="onSort('size')">
            Size
          </button>
        </th>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="item in sortedItems"
        :key="itemKey(item)"
        @dblclick="onItemDblClick(item)"
        class="cursor-pointer"
      >
        <td>
          <Icon
            :icon="item.type === 'folder' ? 'mdi:folder' : 'mdi:file-outline'"
            :class="item.type === 'folder' ? 'text-warning me-2' : 'text-primary me-2'"
          />
          {{ item.name }}
        </td>
        <td class="w-0">{{ getDateFormated(item.updated) }}</td>
        <td class="text-end">{{ item.size || '-' }}</td>
      </tr>
    </tbody>
  </table>
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