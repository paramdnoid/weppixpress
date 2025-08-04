<template>
  <div>
    <div v-if="sortedItems.length === 0" class="text-center text-muted py-6">
      <Icon icon="tabler:folder-off" class="empty-icon mb-2" />
      <div>Keine Dateien oder Ordner im aktuellen Verzeichnis.</div>
    </div>
    <div v-else class="explorer-grid">
      <div v-for="item in sortedItems" :key="itemKey(item)" class="explorer-item" :tabindex="0" role="button"
        @dblclick="onItemDblClick(item)" :title="item.name">
        <div class="icon-wrap">
          <Icon v-if="item.type === 'folder' && item.name !== '..'" icon="flat-color-icons:folder"
            class="explorer-icon folder" />
          <Icon v-else-if="item.name === '..'" icon="tabler:arrow-back-up" class="explorer-icon text-secondary " />
          <Icon v-else :icon="getFileIcon(item)" :class="['explorer-icon', getFileColor(item)]" />
        </div>
        <div class="explorer-label" :title="item.name">{{ item.name }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { getFileComparator, getFileIcon, getFileColor } from '@/composables/useFiles';

const props = defineProps({
  items: { type: Array, required: true },
  itemKey: { type: Function, default: item => item.id || item.name },
  sortKey: { type: String, default: '' },
  sortDir: { type: String, default: 'asc' }
})

const sortedItems = computed(() => {
  return [...props.items].sort(getFileComparator(props.sortKey, props.sortDir));
})

const emit = defineEmits(['itemDblClick'])
function onItemDblClick(item) { emit('itemDblClick', item) }
</script>

<style scoped>
.explorer-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: .5rem;
  padding: .5rem;
  background: transparent;
}

.explorer-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  outline: none;
  cursor: pointer;
  transition: background 0.15s;
  border-radius: 8px;
  padding: 8px 2px 2px 2px;
}

.explorer-item:focus,
.explorer-item:hover {
  background: var(--tblr-gray-50)
}

.icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 62px;
  width: 62px;
  color: var(--tblr-primary);
}

.explorer-icon {
  font-size: 48px;
  width: 48px;
  height: 48px;
  display: block;
}

.explorer-label {
  width: 100%;
  text-align: center;
  font-size: 15px;
  font-weight: 400;
  color: #2c3e50;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
  margin-bottom: 3px;
  line-height: 1.3;
  user-select: none;
}

.folder {
  color: #fbbf24;
}

.xml {
  color: #16a34a;
}

.rtf {
  color: #ef4444;
}

.txt {
  color: #2563eb;
}

.file {
  color: var(--tblr-primary)
}

.empty-icon {
  font-size: 62px;
  color: #cfd8dc;
}
</style>