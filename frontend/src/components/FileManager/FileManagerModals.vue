// components/FileManager/FileManagerModals.vue
<template>
  <div>
    <RenameModal
      ref="renameModal"
      :item="itemToRename"
      :is-loading="isLoading"
      @rename="$emit('rename', $event)"
    />

    <NewFolderModal
      ref="newFolderModal"
      :is-loading="isLoading"
      @create="$emit('createFolder', $event)"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import RenameModal from './RenameModal.vue'
import NewFolderModal from './NewFolderModal.vue'

defineProps({
  itemToRename: { type: Object, default: null },
  isLoading: { type: Boolean, default: false }
})

defineEmits(['rename', 'createFolder'])

const renameModal = ref()
const newFolderModal = ref()

function showRenameModal() {
  renameModal.value?.show()
}

function showNewFolderModal() {
  newFolderModal.value?.show()
}

function hideModals() {
  renameModal.value?.hide()
  newFolderModal.value?.hide()
}

defineExpose({
  showRenameModal,
  showNewFolderModal,
  hideModals
})
</script>