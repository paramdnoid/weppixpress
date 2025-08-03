<template>
  <div class="explorer-item mx-3 flex-fill">
    <div class="table-responsive">
      <table class="table table-vcenter table-hover">
        <thead>
          <tr>
            <th class="w-full" @click="emit('sort', 'name')" style="cursor:pointer">
              <span class="d-inline-flex align-items-center">
                <Icon icon="tabler:folder" class="me-2 text-muted" style="font-size: 1.3em;" />
                Name
                <Icon icon="tabler:chevron-up" v-if="sortKey === 'name' && sortDir === 'asc'" />
                <Icon icon="tabler:chevron-down" v-if="sortKey === 'name' && sortDir === 'desc'" />
              </span>
            </th>
            <th class="w-auto" @click="emit('sort', 'modified')" style="cursor:pointer">
              <span class="d-inline-flex align-items-center">
                Modified
                <Icon icon="tabler:chevron-up" v-if="sortKey === 'modified' && sortDir === 'asc'" />
                <Icon icon="tabler:chevron-down" v-if="sortKey === 'modified' && sortDir === 'desc'" />
              </span>
            </th>
            <th class="w-auto text-nowrap text-end" @click="emit('sort', 'size')" style="cursor:pointer">
              <span class="d-inline-flex align-items-center">
                Size
                <Icon icon="tabler:chevron-up" v-if="sortKey === 'size' && sortDir === 'asc'" />
                <Icon icon="tabler:chevron-down" v-if="sortKey === 'size' && sortDir === 'desc'" />
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in sortedItems" :key="itemKey(item)" class="file-list-row" @dblclick="onItemDblClick(item)"
            @keydown.enter="onItemDblClick(item)" @keydown.space.prevent="onItemDblClick(item)" tabindex="0"
            style="cursor:pointer">
            <td class="align-middle">
              <span class="d-inline-flex align-items-center justify-content-center">
                <Icon v-if="item.type === 'folder'" icon="flat-color-icons:folder" class="me-2 text-yellow"
                  style="font-size:1.25em;" />
                <Icon v-else :icon="getFileIcon(item)" class="me-2 text-primary" style="font-size:1.1em;" />
                <span class="file-list-filename" :title="item.name">{{ item.name }}</span>
              </span>
            </td>
            <td class="align-middle text-nowrap">
              {{ getDateFormated(item.updated) }}
            </td>
            <td class="align-middle text-nowrap text-end">
              <span v-if="item.type === 'file'">{{ getSizeFormated(item.size) }}</span>
              <span v-else>—</span>
            </td>

          </tr>
          <tr v-if="!items || items.length === 0">
            <td colspan="3" class="text-center text-muted py-5">No files or folders</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
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

<style scoped>
.file-list-filename {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  max-width: 310px;
  display: inline-block;
  vertical-align: bottom;
}

.explorer-item {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  outline: none;
  cursor: pointer;
  transition: background 0.15s;
  background: var(--tblr-gray-50);
  border-radius: 8px;
}
</style>