<template>
  <div>
    <div v-if="sortedItems.length === 0" class="text-center text-muted py-6">
      <Icon icon="tabler:folder-off" class="empty-icon mb-2" />
      <div>Keine Dateien oder Ordner im aktuellen Verzeichnis.</div>
    </div>
    <div v-else class="explorer-grid">
      <div
        v-for="item in sortedItems"
        :key="itemKey(item)"
        class="explorer-item"
        :tabindex="0"
        role="button"
        @click="onItemClick(item)"
        @dblclick="onItemDblClick(item)"
        :title="item.name"
      >
        <div class="icon-wrap">
          <Icon
            v-if="item.type === 'folder' && item.name !== '..'"
            icon="flat-color-icons:folder"
            class="explorer-icon folder"
          />
          <Icon
            v-else-if="item.name === '..'"
            icon="tabler:arrow-back-up"
            class="explorer-icon folder"
          />
          <Icon
            v-else
            :icon="getFileIcon(item)"
            :class="['explorer-icon', getFileColor(item)]"
          />
        </div>
        <div class="explorer-label" :title="item.name">{{ item.name }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Icon } from '@iconify/vue'

const props = defineProps({
  items: { type: Array, required: true },
  itemKey: { type: Function, default: item => item.id || item.name }
})

const sortedItems = computed(() => {
  const folders = props.items.filter(i => i.type === 'folder').sort((a, b) => a.name.localeCompare(b.name))
  const files = props.items.filter(i => i.type === 'file').sort((a, b) => a.name.localeCompare(b.name))
  return [...folders, ...files]
})

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

function getFileColor(item) {
  const ext = item.name.split('.').pop().toLowerCase()
  if (['xml'].includes(ext)) return 'xml'
  if (['rtf'].includes(ext)) return 'rtf'
  if (['txt'].includes(ext)) return 'txt'
  if (item.type === 'folder') return 'folder'
  return 'file'
}

const emit = defineEmits(['itemClick', 'itemDblClick'])
function onItemClick(item) { emit('itemClick', item) }
function onItemDblClick(item) { emit('itemDblClick', item) }
</script>

<style scoped>
.explorer-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 1.5rem;
  padding: 1rem;
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
.folder { color: #fbbf24; }
.xml    { color: #16a34a; }
.rtf    { color: #ef4444; }
.txt    { color: #2563eb; }
.file   { color: var(--tblr-primary)}
.empty-icon {
  font-size: 62px;
  color: #cfd8dc;
}
</style>