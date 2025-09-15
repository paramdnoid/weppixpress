import { useModal } from '@/composables/useModal'
import { markRaw } from 'vue'
import UploadBatchSettingsModalContent from '@/components/FileManager/modals/UploadBatchSettingsModalContent.vue'

export function useUploadBatchModal() {
  const modal = useModal()

  function openUploadBatchSettings() {
    console.log('Opening upload batch settings modal with component:', UploadBatchSettingsModalContent)
    return modal.open({
      title: 'Upload Batch Settings',
      size: 'lg',
      component: markRaw(UploadBatchSettingsModalContent),
      onConfirm: () => {
        // Settings are automatically applied through the component
        // No additional action needed on confirm
      }
    })
  }

  return {
    openUploadBatchSettings
  }
}