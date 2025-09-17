/**
 * Generic Modal Confirmation Factory
 * Eliminates duplication in modal confirmation patterns
 */

export interface ConfirmationOptions {
  title: string
  action: string
  variant?: 'danger' | 'warning' | 'info' | 'success'
  confirmText?: string
  cancelText?: string
}

/**
 * Generate confirmation message based on action and items
 */
function generateMessage(action: string, items: string[], destination?: string): string {
  const itemCount = items.length

  if (itemCount === 1) {
    const itemName = items[0]
    switch (action.toLowerCase()) {
      case 'delete':
        return `Are you sure you want to delete "${itemName}"?`
      case 'move':
        return `Move "${itemName}" to "${destination}"?`
      case 'copy':
        return `Copy "${itemName}" to "${destination}"?`
      case 'rename':
        return `Rename "${itemName}"?`
      default:
        return `${action} "${itemName}"?`
    }
  } else {
    switch (action.toLowerCase()) {
      case 'delete':
        return `Are you sure you want to delete ${itemCount} items?`
      case 'move':
        return `Move ${itemCount} items to "${destination}"?`
      case 'copy':
        return `Copy ${itemCount} items to "${destination}"?`
      default:
        return `${action} ${itemCount} items?`
    }
  }
}

/**
 * Create confirmation modal configuration
 */
export function createConfirmModal(
  action: string,
  items: string[],
  destination?: string
): {
  message: string
  options: ConfirmationOptions
} {
  const message = generateMessage(action, items, destination)

  const options: ConfirmationOptions = {
    title: `Confirm ${action}`,
    action: action.toLowerCase(),
    confirmText: action,
    variant: action.toLowerCase() === 'delete' ? 'danger' : 'info'
  }

  return { message, options }
}

/**
 * Factory functions for common modal types
 */
export const modalFactory = {
  /**
   * Create delete confirmation modal
   */
  delete(items: string[]) {
    return createConfirmModal('Delete', items)
  },

  /**
   * Create move confirmation modal
   */
  move(items: string[], destination: string) {
    return createConfirmModal('Move', items, destination)
  },

  /**
   * Create copy confirmation modal
   */
  copy(items: string[], destination: string) {
    return createConfirmModal('Copy', items, destination)
  },

  /**
   * Create rename confirmation modal
   */
  rename(items: string[]) {
    return createConfirmModal('Rename', items)
  },

  /**
   * Create generic action confirmation modal
   */
  action(action: string, items: string[], destination?: string) {
    return createConfirmModal(action, items, destination)
  }
}

/**
 * Type-safe modal action variants
 */
export const MODAL_VARIANTS = {
  DANGER: 'danger' as const,
  WARNING: 'warning' as const,
  INFO: 'info' as const,
  SUCCESS: 'success' as const
} as const

export type ModalVariant = typeof MODAL_VARIANTS[keyof typeof MODAL_VARIANTS]