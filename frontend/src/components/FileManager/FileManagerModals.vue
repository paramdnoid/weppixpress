<template>
  <!-- This component is now a compatibility layer for the new modal system -->
  <div style="display: none;">
    <!-- No content needed - all modals are handled through the global modal system -->
  </div>
</template>

<script setup lang="ts">
import { ref, defineExpose } from 'vue'
import { useFileManagerModals } from '@/composables/useFileManagerModals'

interface Props {
  itemToRename?: { name: string; type: string }
  isLoading?: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  rename: [data: { oldName: string; newName: string; item: any }]
  createFolder: [name: string]
}>()

const fileManagerModals = useFileManagerModals()

// Current modal IDs for tracking
const currentRenameModalId = ref<string>()
const currentFolderModalId = ref<string>()

function showRenameModal(item?: any) {
  const itemToRename = item || props.itemToRename
  if (!itemToRename) return

  currentRenameModalId.value = fileManagerModals.openRenameModal(
    itemToRename,
    (data) => {
      emit('rename', data)
    }
  )
}

function hideRenameModal() {
  if (currentRenameModalId.value) {
    fileManagerModals.modal.close(currentRenameModalId.value)
    currentRenameModalId.value = undefined
  }
}

function showNewFolderModal() {
  currentFolderModalId.value = fileManagerModals.openNewFolderModal(
    (name) => {
      emit('createFolder', name)
    }
  )
}

function hideNewFolderModal() {
  if (currentFolderModalId.value) {
    fileManagerModals.modal.close(currentFolderModalId.value)
    currentFolderModalId.value = undefined
  }
}

// Expose methods for backward compatibility
defineExpose({
  showNewFolderModal,
  hideNewFolderModal,
  showRenameModal,
  hideRenameModal,
  newFolderModal: { hide: hideNewFolderModal }
})
</script>