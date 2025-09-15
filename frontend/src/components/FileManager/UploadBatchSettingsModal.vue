<template>
  <!-- This component is now a compatibility layer for the new modal system -->
  <div style="display: none;">
    <!-- No content needed - modal is handled through the global modal system -->
  </div>
</template>

<script setup lang="ts">
import { ref, defineExpose } from 'vue'
import { useUploadBatchModal } from '@/composables/useUploadBatchModal'
import { useModal } from '@/composables/useModal'

const uploadBatchModal = useUploadBatchModal()
const modal = useModal()
const currentModalId = ref<string>()

function show() {
  currentModalId.value = uploadBatchModal.openUploadBatchSettings()
}

function hide() {
  if (currentModalId.value) {
    modal.close(currentModalId.value)
    currentModalId.value = undefined
  }
}

// Expose methods for backward compatibility
defineExpose({
  show,
  hide
})
</script>