import { ref, computed } from 'vue'

/**
 * Encapsulates open/close state and helpers for a single tree node.
 * @param {Object} node  The tree node object
 */
export function useTreeNode(node) {
  const isOpen = ref(false)
  const toggle = () => {
    isOpen.value = !isOpen.value
  }

  const hasSubfolder = computed(() =>
    (node.children || []).some(c => c.type === 'folder')
  )

  const collapseId = computed(() =>
    // safe-ish ID from the node’s path
    node.path.replace(/[^\w-]/g, '_')
  )

  const sortedChildren = computed(() =>
    // if you ever want custom ordering, you can drop the `.filter` here
    (node.children || []).filter(c => c.type === 'folder')
  )
  
  return { isOpen, toggle, hasSubfolder, collapseId, sortedChildren }
}