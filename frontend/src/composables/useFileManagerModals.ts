import { useModal } from '@/composables/useModal'
import { markRaw } from 'vue'
import { modalFactory } from '@/utils/modalFactory'
import RenameModalContent from '@/views/files/modals/RenameModalContent.vue'
import NewFolderModalContent from '@/views/files/modals/NewFolderModalContent.vue'

export function useFileManagerModals() {
  const modal = useModal()

  function openRenameModal(item: { name: string; type: string }, onRename: (data: { oldName: string; newName: string; item: any }) => void | Promise<void>) {

    const handleRename = async (data: { oldName: string; newName: string; item: any }) => {
      try {
        await onRename(data)
        modal.close(modalId)
      } catch (error) {
        console.error('Error renaming item:', error)
        // Don't close modal on error so user can retry
      }
    }

    const modalId = modal.open({
      title: `Rename ${item.name}`,
      size: 'sm',
      component: markRaw(RenameModalContent),
      props: {
        itemToRename: item,
        onRename: handleRename
      }
      // No onConfirm handler needed - GlobalModal calls component method directly
    })

    return modalId
  }

  function openNewFolderModal(onCreateFolder: (name: string) => void | Promise<void>) {

    const handleCreateFolder = async (name: string) => {
      try {
        await onCreateFolder(name)
        modal.close(modalId)
      } catch (error) {
        console.error('Error creating folder:', error)
        // Don't close modal on error so user can retry
      }
    }

    const modalId = modal.open({
      title: 'Create New Folder',
      size: 'sm',
      component: markRaw(NewFolderModalContent),
      props: {
        onCreateFolder: handleCreateFolder
      }
      // No onConfirm handler needed - GlobalModal calls component method directly
    })

    return modalId
  }

  function openDeleteConfirmModal(items: string[], onConfirm: () => void | Promise<void>) {
    const { message, options } = modalFactory.delete(items)

    return modal.danger(message, {
      title: options.title,
      confirmText: options.confirmText,
      onConfirm
    })
  }

  function openMoveConfirmModal(items: string[], destination: string, onConfirm: () => void | Promise<void>) {
    const { message, options } = modalFactory.move(items, destination)

    return modal.confirmDialog(message, {
      title: options.title,
      confirmText: options.confirmText,
      onConfirm
    })
  }

  function openCopyConfirmModal(items: string[], destination: string, onConfirm: () => void | Promise<void>) {
    const { message, options } = modalFactory.copy(items, destination)

    return modal.confirmDialog(message, {
      title: options.title,
      confirmText: options.confirmText,
      onConfirm
    })
  }

  function openErrorModal(message: string, details?: string) {
    const content = details ? `${message}\n\nDetails: ${details}` : message
    return modal.error(content, {
      title: 'Operation Failed'
    })
  }

  function openSuccessModal(message: string) {
    return modal.success(message, {
      title: 'Success'
    })
  }

  function openLoadingModal(message: string) {
    return modal.loading(message, {
      title: 'Processing...',
      persistent: true
    })
  }

  return {
    openRenameModal,
    openNewFolderModal,
    openDeleteConfirmModal,
    openMoveConfirmModal,
    openCopyConfirmModal,
    openErrorModal,
    openSuccessModal,
    openLoadingModal,
    modal // Expose modal for advanced usage
  }
}