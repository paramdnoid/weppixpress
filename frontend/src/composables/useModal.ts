import { useModalStore, type ModalConfig } from '@/stores/modal'
import type { Component } from 'vue'
import { markRaw } from 'vue'

export function useModal() {
  const modalStore = useModalStore()

  // Basic modal operations
  const open = (config: Omit<ModalConfig, 'id'> & { id?: string }) => {
    return modalStore.open(config)
  }

  const close = (id?: string) => {
    return modalStore.close(id)
  }

  const closeAll = () => {
    modalStore.closeAll()
  }

  const confirm = (id?: string) => {
    modalStore.confirm(id)
  }

  const updateModal = (id: string, updates: Partial<ModalConfig>) => {
    return modalStore.updateModal(id, updates)
  }

  const setLoading = (id: string, loading: boolean) => {
    return modalStore.setLoading(id, loading)
  }

  // Quick helper methods
  const alert = (message: string, options?: {
    title?: string
    confirmText?: string
    onConfirm?: () => void
  }) => {
    return modalStore.openAlert({
      message,
      ...options
    })
  }

  const confirmDialog = (message: string, options?: {
    title?: string
    confirmText?: string
    cancelText?: string
    confirmVariant?: ModalConfig['confirmVariant']
    onConfirm?: () => void | Promise<void>
    onCancel?: () => void
  }) => {
    return modalStore.openConfirm({
      message,
      ...options
    })
  }

  const openComponent = (options: {
    component: Component | string
    title?: string
    props?: Record<string, any>
    size?: ModalConfig['size']
    onConfirm?: () => void | Promise<void>
    onClose?: () => void
  }) => {
    return open({
      title: options.title,
      size: options.size || 'md',
      component: options.component,
      props: options.props,
      onConfirm: options.onConfirm,
      onClose: options.onClose
    })
  }

  // Advanced modal operations
  const prompt = (message: string, options?: {
    title?: string
    placeholder?: string
    defaultValue?: string
    confirmText?: string
    cancelText?: string
    onConfirm?: (value: string) => void | Promise<void>
    onCancel?: () => void
  }): string => {
    let inputValue = options?.defaultValue || ''

    return open({
      title: options?.title || 'Input Required',
      html: `
        <div class="mb-3">
          <label class="form-label">${message}</label>
          <input
            type="text"
            class="form-control"
            id="modal-prompt-input"
            placeholder="${options?.placeholder || ''}"
            value="${inputValue}"
          />
        </div>
      `,
      confirmText: options?.confirmText || 'OK',
      onConfirm: () => {
        const input = document.getElementById('modal-prompt-input') as HTMLInputElement
        if (input) {
          inputValue = input.value
          if (options?.onConfirm) {
            return options.onConfirm(inputValue)
          }
        }
      },
      onClose: options?.onCancel,
      size: 'sm'
    })
  }

  const loading = (message: string, options?: {
    title?: string
    persistent?: boolean
  }): string => {
    return open({
      title: options?.title || 'Loading...',
      content: message,
      loading: true,
      persistent: options?.persistent !== false,
      hideFooter: true,
      hideClose: true,
      size: 'sm'
    })
  }

  // Specialized modals
  const error = (message: string, options?: {
    title?: string
    onConfirm?: () => void
  }) => {
    return alert(message, {
      title: options?.title || 'Error',
      onConfirm: options?.onConfirm
    })
  }

  const success = (message: string, options?: {
    title?: string
    onConfirm?: () => void
  }) => {
    return alert(message, {
      title: options?.title || 'Success',
      onConfirm: options?.onConfirm
    })
  }

  const warning = (message: string, options?: {
    title?: string
    confirmText?: string
    onConfirm?: () => void | Promise<void>
    onCancel?: () => void
  }) => {
    return confirmDialog(message, {
      title: options?.title || 'Warning',
      confirmText: options?.confirmText || 'Continue',
      confirmVariant: 'warning',
      onConfirm: options?.onConfirm,
      onCancel: options?.onCancel
    })
  }

  const danger = (message: string, options?: {
    title?: string
    confirmText?: string
    onConfirm?: () => void | Promise<void>
    onCancel?: () => void
  }) => {
    return confirmDialog(message, {
      title: options?.title || 'Danger',
      confirmText: options?.confirmText || 'Delete',
      confirmVariant: 'danger',
      onConfirm: options?.onConfirm,
      onCancel: options?.onCancel
    })
  }


  return {
    // Basic operations
    open,
    close,
    closeAll,
    confirm,
    updateModal,
    setLoading,

    // Quick helpers
    alert,
    confirmDialog,
    openComponent,
    prompt,
    loading,

    // Specialized modals
    error,
    success,
    warning,
    danger,

    // Store access for advanced usage
    store: modalStore
  }
}

// Export types for TypeScript support
export type { ModalConfig, ActiveModal } from '@/stores/modal'