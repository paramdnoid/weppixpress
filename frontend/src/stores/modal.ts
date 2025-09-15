import { defineStore } from 'pinia'
import { computed, shallowRef, type Component } from 'vue'

export interface ModalConfig {
  id: string
  component?: Component | string
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  fullscreen?: boolean
  persistent?: boolean
  loading?: boolean
  hideHeader?: boolean
  hideFooter?: boolean
  hideClose?: boolean
  noPadding?: boolean
  confirmText?: string
  confirmVariant?: 'link' | 'success' | 'info' | 'warning' | 'primary' | 'secondary' | 'danger' | 'light' | 'dark'
  props?: Record<string, unknown>
  onConfirm?: () => void | Promise<void>
  onClose?: () => void | Promise<void>
  content?: string
  html?: string
}

export interface ActiveModal extends ModalConfig {
  visible: boolean
  zIndex: number
}

export const useModalStore = defineStore('modal', () => {
  const modals = shallowRef<Map<string, ActiveModal>>(new Map())
  const baseZIndex = 1050
  let modalCounter = 0

  const activeModals = computed(() =>
    Array.from(modals.value.values())
      .filter(modal => modal.visible)
      .sort((a, b) => a.zIndex - b.zIndex)
  )

  const isAnyModalOpen = computed(() => activeModals.value.length > 0)
  const topModal = computed(() => activeModals.value[activeModals.value.length - 1] || null)

  function generateModalId(): string {
    return `modal-${Date.now()}-${++modalCounter}`
  }

  function open(config: Omit<ModalConfig, 'id'> & { id?: string }): string {
    const id = config.id || generateModalId()
    const zIndex = baseZIndex + modals.value.size * 10

    // Create the modal configuration - don't mark entire object as raw
    const modal: ActiveModal = {
      id,
      title: '',
      size: 'md',
      fullscreen: false,
      persistent: false,
      loading: false,
      hideHeader: false,
      hideFooter: false,
      hideClose: false,
      noPadding: false,
      confirmText: 'Confirm',
      confirmVariant: 'primary',
      ...config,
      component: config.component, // Component should already be markRaw from composables
      visible: true,
      zIndex
    }

    // Create new map to trigger reactivity
    const newModals = new Map(modals.value)
    newModals.set(id, modal)
    modals.value = newModals

    updateBodyClass()
    return id
  }

  function close(id?: string): boolean {
    if (!id && topModal.value) {
      id = topModal.value.id
    }

    if (!id) return false

    const modal = modals.value.get(id)
    if (!modal) return false

    // Call onClose callback if provided
    if (modal.onClose) {
      try {
        const result = modal.onClose()
        if (result instanceof Promise) {
          result.catch(() => {}) // Prevent unhandled promise rejection
        }
      } catch (error) {
        console.error('Error in modal onClose callback:', error)
      }
    }

    modal.visible = false
    // Create new map to trigger reactivity
    const newModals = new Map(modals.value)
    newModals.delete(id)
    modals.value = newModals

    updateBodyClass()
    return true
  }

  function closeAll(): void {
    const modalIds = Array.from(modals.value.keys())
    modalIds.forEach(id => close(id))
  }

  function confirm(id?: string): void {
    if (!id && topModal.value) {
      id = topModal.value.id
    }

    if (!id) return

    const modal = modals.value.get(id)
    if (!modal) return

    if (modal.onConfirm) {
      try {
        const result = modal.onConfirm()
        if (result instanceof Promise) {
          modal.loading = true
          result
            .then(() => {
              close(id)
            })
            .catch((error) => {
              console.error('Error in modal onConfirm callback:', error)
            })
            .finally(() => {
              if (modals.value.has(id)) {
                modal.loading = false
              }
            })
        } else {
          close(id)
        }
      } catch (error) {
        console.error('Error in modal onConfirm callback:', error)
        modal.loading = false
      }
    } else {
      close(id)
    }
  }

  function updateModal(id: string, updates: Partial<ModalConfig>): boolean {
    const modal = modals.value.get(id)
    if (!modal) return false

    Object.assign(modal, updates)
    return true
  }

  function setLoading(id: string, loading: boolean): boolean {
    const modal = modals.value.get(id)
    if (!modal) return false

    modal.loading = loading
    return true
  }

  function getModal(id: string): ActiveModal | undefined {
    return modals.value.get(id)
  }

  function updateBodyClass(): void {
    if (isAnyModalOpen.value) {
      document.body.classList.add('modal-open')
    } else {
      document.body.classList.remove('modal-open')
    }
  }

  // Keyboard event handling
  function handleEscapeKey(): void {
    if (topModal.value && !topModal.value.persistent && !topModal.value.loading) {
      close(topModal.value.id)
    }
  }

  // Quick helper methods for common modal types
  function openAlert(options: {
    title?: string
    message: string
    confirmText?: string
    onConfirm?: () => void
  }): string {
    return open({
      title: options.title || 'Alert',
      content: options.message,
      hideFooter: false,
      confirmText: options.confirmText || 'OK',
      onConfirm: options.onConfirm,
      size: 'sm'
    })
  }

  function openConfirm(options: {
    title?: string
    message: string
    confirmText?: string
    cancelText?: string
    confirmVariant?: ModalConfig['confirmVariant']
    onConfirm?: () => void | Promise<void>
    onCancel?: () => void
  }): string {
    return open({
      title: options.title || 'Confirm',
      content: options.message,
      confirmText: options.confirmText || 'Confirm',
      confirmVariant: options.confirmVariant || 'primary',
      onConfirm: options.onConfirm,
      onClose: options.onCancel,
      size: 'sm'
    })
  }

  function openComponent(options: {
    component: Component | string
    title?: string
    props?: Record<string, unknown>
    size?: ModalConfig['size']
    onConfirm?: () => void | Promise<void>
    onClose?: () => void
  }): string {
    return open({
      component: options.component, // Already markRaw in composables
      title: options.title,
      props: options.props,
      size: options.size || 'md',
      onConfirm: options.onConfirm,
      onClose: options.onClose
    })
  }

  return {
    // State
    modals: computed(() => modals.value),
    activeModals,
    isAnyModalOpen,
    topModal,

    // Actions
    open,
    close,
    closeAll,
    confirm,
    updateModal,
    setLoading,
    getModal,
    handleEscapeKey,

    // Helper methods
    openAlert,
    openConfirm,
    openComponent
  }
})