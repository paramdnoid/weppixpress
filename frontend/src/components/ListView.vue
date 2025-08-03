<template>
  <div class="card card-table mb-0 border-0">
    <div class="table-responsive">
      <table class="table table-vcenter table-stiped">
        <tbody>
          <tr v-for="item in sortedItems" :key="itemKey(item)" class="file-list-row" @dblclick="onItemDblClick(item)"
            @click="onItemClick(item)" tabindex="0" style="cursor:pointer">
            <td class="align-middle">
              <span class="d-inline-flex align-items-center">
                <Icon v-if="item.type === 'folder'" icon="flat-color-icons:folder" class="me-2 text-yellow"
                  style="font-size:1.25em;" />
                <Icon v-else :icon="getFileIcon(item)" class="me-2 text-primary" style="font-size:1.1em;" />
                <span class="file-list-filename" :title="item.name">{{ item.name }}</span>
              </span>
            </td>
            <td class="align-middle">
              <span v-if="item.type === 'file'">{{ item.size }}</span>
              <span v-else>—</span>
            </td>
            <td class="align-middle  text-end">
              {{ formatDate(item.updated) }}
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
const emit = defineEmits(['itemClick', 'itemDblClick'])
function onItemClick(item) { emit('itemClick', item) }
function onItemDblClick(item) { emit('itemDblClick', item) }

import { Icon } from '@iconify/vue'

const props = defineProps({
  items: { type: Array, required: true },
  sortKey: { type: String, default: '' },
  sortDir: { type: String, default: 'asc' },
  itemKey: { type: Function, default: item => item.id || item.name }
})

const sortedItems = computed(() => {
  const compare = (a, b) => {
    // Ordner immer vor Dateien
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
    // Danach sortiere nach dem gewünschten Key
    if (props.sortKey === 'size' && a.type === 'file' && b.type === 'file') {
      // Numerisch für Size, Richtung beachten
      return (a.size - b.size) * (props.sortDir === 'asc' ? 1 : -1);
    }
    if (props.sortKey === 'modified') {
      // Datum
      return (
        (new Date(a.updatedAt) - new Date(b.updatedAt)) * (props.sortDir === 'asc' ? 1 : -1)
      );
    }
    // Default Name (alphabetisch)
    return a.name.localeCompare(b.name) * (props.sortDir === 'asc' ? 1 : -1);
  };
  return [...props.items].sort(compare);
});

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString().slice(0, 5)
}

function getFileIcon(item) {
  const ext = item.name.split('.').pop().toLowerCase()
  if (['xml'].includes(ext)) return 'bxs:file-xml'
  if (['html'].includes(ext)) return 'bxs:file-html'
  if (['md'].includes(ext)) return 'bxs:file-md'
  if (['js', 'ts'].includes(ext)) return 'bxs:file-js'
  if (['txt'].includes(ext)) return 'bxs:file-txt'
  if (['jpg','jpeg','png','gif','webp','bmp'].includes(ext)) return 'bxs:file-jpg'
  if (['pdf'].includes(ext)) return 'bxs:file-pdf'
  if (['json'].includes(ext)) return 'bxs:file-json'
  return 'bxs:file'
}

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
</style>