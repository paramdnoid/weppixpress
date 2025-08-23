<template>
  <div :data-path="node.path">
    <a ref="nodeLink" :id="`node-${node.path}`" :class="['nav-link', { active: isActive, selected: isExactActive, 'long-pressing': isLongPressing && longPressItem === node }]"
      href="#" role="treeitem" :aria-controls="collapseId" :data-path="node.path" @click.prevent="handleNodeClick"
      @keydown="handleKeyDown" @mousedown="(event) => handleMouseDown(node, event)" @mouseup="(event) => handleMouseUp(node, event)" @mouseleave="() => handleMouseLeave(node)"
      @touchstart.passive="(event) => handleTouchStart(node, event)" @touchend="() => handleTouchEnd(node)" @touchmove.passive="() => handleTouchMove(node)"
      :aria-expanded="isOpen" :aria-selected="isExactActive"
      :aria-label="`${node.type === 'folder' ? 'Folder' : 'File'}: ${node.name}`">
      <Icon :icon="nodeIcon" :class="nodeIconClass" width="18" height="18" />
      <span v-text="node.name"></span>
      <Icon v-if="node.hasSubfolders" :icon="isOpen ? 'mdi:chevron-down' : 'mdi:chevron-right'" class="nav-link-toggle"
        width="16" height="16" />
    </a>

    <nav v-if="node.hasSubfolders" class="nav nav-vertical ms-3 tree-level tree-children" v-show="isOpen"
      :id="collapseId" role="group" :aria-labelledby="`node-${node.path}`">
      <TreeNode v-for="child in sortedChildren" :key="child.path" :node="child" :selectedPath="selectedPath"
        :loadChildren="loadChildren" :toggleNode="toggleNode" @nodeToggle="handleChildToggle"
        @selectNode="handleChildSelect" />

      <div v-if="loading" class="ps-3 text-muted small d-flex align-items-center">
        <div class="spinner-border spinner-border-sm me-2" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        Loading…
      </div>

      <div v-else-if="loadError" class="ps-3 text-danger small">
        <Icon icon="mdi:alert-circle" class="me-1" width="14" height="14" />
        Failed to load
      </div>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useFileManager } from '@/composables/useFileManager'
import type { FileItem } from '@/types'
import TreeNode from './FileTreeNode.vue'
import { useFileStore } from '@/stores/files'

const scheduleIdle = (cb: () => void) => {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    ; (window as any).requestIdleCallback(cb)
  } else {
    setTimeout(cb, 0)
  }
}

interface Props {
  node: FileItem & {
    _isOpen?: boolean
    children?: FileItem[]
    childItems?: FileItem[]
  }
  selectedPath?: string
  loadChildren?: (node: FileItem) => Promise<FileItem[]>
  toggleNode?: (path: string) => void
}

type ExpandEvent = CustomEvent<{ path?: string }>

// Use file manager utilities
const { 
  getFileIcon, 
  getFileColor,
  handleMouseDown,
  handleMouseUp,
  handleMouseLeave,
  handleTouchStart,
  handleTouchEnd,
  handleTouchMove,
  isLongPressing,
  longPressItem
} = useFileManager()

const props = defineProps<Props>()

const emit = defineEmits<{
  nodeToggle: [payload: { node: FileItem; isOpen: boolean }]
  selectNode: [path: string]
}>()

// Small derived state helpers
const isFolder = computed(() => props.node.type === 'folder')
const hasSubfolders = computed(() => !!props.node.hasSubfolders)
const currentPath = computed(() => normalizePath(props.selectedPath || ''))
const nodePath = computed(() => normalizePath(props.node.path))

// Refs
const nodeLink = ref<HTMLElement>()
const isOpen = ref(props.node._isOpen || false)
const loading = ref(false)
const loadError = ref(false)
const children = ref<FileItem[]>([])
const hasLoadedChildren = ref(false)

const files = useFileStore()

function getCachedPage1ItemsForNode(): FileItem[] | null {
  try {
    const key = `${normalizePath(props.node.path)}::1`
    const cached = files?.state?.cache?.get?.(key)
    if (cached && Array.isArray(cached.items)) return cached.items as FileItem[]
  } catch { }
  return null
}

function applyCachedChildrenIfAvailable(): boolean {
  const cachedItems = getCachedPage1ItemsForNode()
  if (cachedItems && cachedItems.length) {
    const onlyFolders = cachedItems.filter(i => i.type === 'folder')
    const preservedChildren = preserveTreeState(onlyFolders)
    children.value = preservedChildren
    props.node.children = preservedChildren
    
    // Update hasSubfolders based on actual folder count
    props.node.hasSubfolders = onlyFolders.length > 0
    
    hasLoadedChildren.value = true
    return true
  }
  return false
}

// Computed properties
const collapseId = computed(() =>
  `collapse-${props.node.path.replace(/[^\w-]/g, '_')}`
)

const nodeIcon = computed(() =>
  isFolder.value ? getFileIcon(props.node) : 'mdi:file-outline'
)

const nodeIconClass = computed(() => {
  if (isFolder.value) {
    const color = getFileColor(props.node)
    return `text-${color} me-1`
  }
  return 'text-muted me-1'
})

const sortedChildren = computed(() => {
  if (!children.value?.length) return []
  const folders = children.value.filter(c => c.type === 'folder')
  return folders.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
})

const isActive = computed(() => {
  if (!currentPath.value) return false
  return currentPath.value === nodePath.value || currentPath.value.startsWith(nodePath.value + '/')
})

const isExactActive = computed(() => {
  if (!currentPath.value) return false
  return currentPath.value === nodePath.value
})

// Helper functions
function normalizePath(path: string): string {
  if (!path) return ''
  // Remove trailing slashes, ensure leading slash for consistency
  let normalized = path.replace(/\/+$/, '') || '/'
  // Add leading slash if not present (unless it's root)
  if (normalized !== '/' && !normalized.startsWith('/')) {
    normalized = '/' + normalized
  }
  return normalized
}

// Load children with error handling and state preservation
async function loadChildrenSafely(): Promise<FileItem[] | null> {
  if (props.node.type !== 'folder' || !props.loadChildren) {
    return null
  }

  if (applyCachedChildrenIfAvailable()) {
    return children.value
  }

  loading.value = true
  loadError.value = false

  try {
    const loadedChildren = await props.loadChildren(props.node)

    if (Array.isArray(loadedChildren)) {
      const onlyFolders = loadedChildren.filter(i => i.type === 'folder')
      // Preserve expanded state of existing children
      const preservedChildren = preserveTreeState(onlyFolders)
      children.value = preservedChildren
      props.node.children = preservedChildren
      
      // Update hasSubfolders based on actual folder count
      props.node.hasSubfolders = onlyFolders.length > 0
      
      hasLoadedChildren.value = true
    }

    return loadedChildren
  } catch (error) {
    console.error('Failed to load children for node:', props.node.path, error)
    loadError.value = true
    throw error
  } finally {
    loading.value = false
  }
}

function preserveTreeState(newChildren: FileItem[]): FileItem[] {
  if (!children.value.length) return newChildren

  const expandedStates = new Map<string, { isOpen: boolean; children?: FileItem[] }>()

  children.value.forEach(child => {
    expandedStates.set(child.path, {
      isOpen: (child as any)._isOpen || false,
      children: (child as any).children
    })
  })

  return newChildren.map(newChild => {
    const preservedState = expandedStates.get(newChild.path)
    if (preservedState) {
      return {
        ...newChild,
        _isOpen: preservedState.isOpen,
        children: preservedState.children || (newChild as any).children
      } as any
    }
    return newChild
  })
}

async function openIfTargetWithin(targetPath?: string) {
  if (!targetPath) return
  if (!targetPath.startsWith(props.node.path)) return
  if ((targetPath === props.node.path || targetPath.startsWith(props.node.path + '/')) && hasSubfolders.value && !isOpen.value) {
    await toggleOpen()
  }
}

// Event handlers
async function handleNodeClick() {
  if (isFolder.value) {
    // Expand UI without loading children yet to avoid double /files requests
    await toggleOpen(false, true)
  }

  // Use the toggleNode function if provided, otherwise emit selectNode
  if (props.toggleNode) {
    props.toggleNode(props.node.path)
  } else {
    emit('selectNode', props.node.path)
  }

  scheduleIdle(() => {
    if (isOpen.value && !hasLoadedChildren.value) {
      applyCachedChildrenIfAvailable()
    }
  })
}

async function toggleOpen(forceReload = false, silent = false) {
  if (!isFolder.value || !hasSubfolders.value) {
    return
  }

  // If closing, just toggle
  if (isOpen.value) {
    isOpen.value = false
    props.node._isOpen = false
    if (!silent) emit('nodeToggle', { node: props.node, isOpen: false })
    return
  }

  // If opening, load children if needed (skip when toggled silently to avoid double-loading on click)
  if (!silent && props.loadChildren && (forceReload || !hasLoadedChildren.value)) {
    try {
      await loadChildrenSafely()
    } catch (error) {
      return
    }
  }

  // Open the node
  isOpen.value = true
  props.node._isOpen = true
  await nextTick()
  if (!silent) emit('nodeToggle', { node: props.node, isOpen: true })
}

function handleKeyDown(event: KeyboardEvent) {
  switch (event.key) {
    case 'Enter':
    case ' ':
      event.preventDefault()
      handleNodeClick()
      break
    case 'ArrowRight':
      if (props.node.hasSubfolders && !isOpen.value) {
        event.preventDefault()
        toggleOpen()
      }
      break
    case 'ArrowLeft':
      if (isOpen.value) {
        event.preventDefault()
        isOpen.value = false
        props.node._isOpen = false
        emit('nodeToggle', { node: props.node, isOpen: false })
      }
      break
  }
}

// Child event handlers
function handleChildToggle(payload: { node: FileItem; isOpen: boolean }) {
  emit('nodeToggle', payload)
}

function handleChildSelect(path: string) {
  emit('selectNode', path)
}

// Auto-expand when selected
watch(isExactActive, (newValue) => {
  if (newValue && props.node.hasSubfolders && !isOpen.value) {
    toggleOpen()
  }
})

// Auto-expand based on selected path (conservative approach)
watch(() => props.selectedPath, (newPath) => {
  if (!newPath) return

  const normalizedNewPath = normalizePath(newPath)
  const normalizedNodePath = normalizePath(props.node.path)

  // Only auto-expand if the new path is within this node's path
  // Don't auto-collapse - let user manually control that for better UX
  if (normalizedNewPath.startsWith(normalizedNodePath + '/') && !isOpen.value && hasSubfolders.value) {
    toggleOpen()
  }

  // Also expand if this IS the target node (for exact matches)
  if (normalizedNewPath === normalizedNodePath && !isOpen.value && hasSubfolders.value) {
    toggleOpen()
  }
}, { immediate: true })

// Initialize children from node data
watch(() => props.node.children, (newChildren) => {
  if (Array.isArray(newChildren) && newChildren.length > 0) {
    children.value = newChildren.filter(i => i.type === 'folder')
    hasLoadedChildren.value = true
  } else if (Array.isArray(newChildren) && newChildren.length === 0) {
    children.value = []
    hasLoadedChildren.value = false
  }
}, { immediate: true })

watch(() => files.state.currentPath, (newPath) => {
  if (!newPath) return
  const np = normalizePath(newPath)
  if (np === nodePath.value && isOpen.value && !hasLoadedChildren.value) {
    // Now that navigation has completed, cache for page 1 should exist
    applyCachedChildrenIfAvailable()
  }
})

// Custom event handling for tree expansion
const onExpandToPath = (e: Event) => handleExpandToPath(e as ExpandEvent)

const onRefreshEvt = (_e?: Event) => {
  handleRefresh()
}

// Define handleReorganize before it's used
async function handleReorganize(targetPath?: string) {
  if (!targetPath) return

  const normalizedTargetPath = normalizePath(targetPath)
  const normalizedNodePath = normalizePath(props.node.path)

  // Check if target path should cause this node to be open or closed
  const isParentOfTarget = normalizedTargetPath.startsWith(normalizedNodePath + '/')
  const isTargetNode = normalizedTargetPath === normalizedNodePath

  // Force reload children if this node is the current path or parent of current path
  if ((isParentOfTarget || isTargetNode) && hasSubfolders.value && isOpen.value) {
    // Refresh children to show updated folders (for create/delete operations)
    hasLoadedChildren.value = false
    await loadChildrenSafely()
  }
  
  // Also reload if this node might now have subfolders (new folder created) or no longer have subfolders (deleted)
  if (isTargetNode) {
    // Force reload to check current subfolder state
    hasLoadedChildren.value = false
    if (props.loadChildren) {
      try {
        const loadedChildren = await props.loadChildren(props.node)
        if (Array.isArray(loadedChildren)) {
          const folderChildren = loadedChildren.filter(i => i.type === 'folder')
          // Update hasSubfolders based on actual count (handles both create and delete)
          props.node.hasSubfolders = folderChildren.length > 0
          children.value = folderChildren
          hasLoadedChildren.value = true
          
          // If no more subfolders, close the node
          if (folderChildren.length === 0 && isOpen.value) {
            isOpen.value = false
            props.node._isOpen = false
          }
        }
      } catch (error) {
        console.error('Failed to reload children:', error)
      }
    }
  }

  if (isParentOfTarget && !isOpen.value && hasSubfolders.value) {
    // Target is within this node - expand
    await toggleOpen()
  } else if (isTargetNode && !isOpen.value && hasSubfolders.value) {
    // This IS the target node - always open it (last breadcrumb item)
    await toggleOpen()
  }
  // REMOVED: Don't auto-collapse on breadcrumb navigation - too aggressive
}

const onReorganize = (e: Event) => {
  const event = e as CustomEvent<{ targetPath?: string }>
  handleReorganize(event.detail?.targetPath)
}

onMounted(() => {
  const treeRoot = (nodeLink.value?.closest('#menu') || document.getElementById('menu')) as HTMLElement | null

  if (treeRoot) {
    treeRoot.addEventListener('tree:expandToPath', onExpandToPath as EventListener)
    treeRoot.addEventListener('tree:refresh', onRefreshEvt as EventListener)
    treeRoot.addEventListener('tree:reorganize', onReorganize as EventListener)
  }
})

onUnmounted(() => {
  const treeRoot = (nodeLink.value?.closest('#menu') || document.getElementById('menu')) as HTMLElement | null

  if (treeRoot) {
    treeRoot.removeEventListener('tree:expandToPath', onExpandToPath as EventListener)
    treeRoot.removeEventListener('tree:refresh', onRefreshEvt as EventListener)
    treeRoot.removeEventListener('tree:reorganize', onReorganize as EventListener)
  }
})

async function handleExpandToPath(event: ExpandEvent) {
  await openIfTargetWithin(event.detail?.path)
}

async function handleRefresh() {
  if (hasLoadedChildren.value) {
    await loadChildrenSafely()
  }
}

// Public API
async function expandToPath(targetPath: string) {
  await openIfTargetWithin(targetPath)
}

async function refreshChildren() {
  await loadChildrenSafely()
}

// Expose public methods
defineExpose({
  expandToPath,
  refreshChildren,
  toggleOpen
})
</script>

<style scoped>
.nav-link:focus,
.nav-link:active {
  background-color: transparent;
  color: black;
  font-weight: 600;
}

.text-folder {
  color: var(--tblr-yellow)
}

.nav-link-toggle {
  margin-left: auto;
  padding: 0;
  transition: transform 0.3s;
}

.nav-link.selected {
  font-weight: 600;
}

.nav-link.long-pressing {
  background-color: var(--tblr-primary-lt);
  border-color: var(--tblr-primary);
  transform: scale(0.98);
  box-shadow: 0 0 0 2px rgba(0, 84, 166, 0.2);
  border-radius: 4px;
}

.tree-children {
  border-left: 1px solid #ddd;
  padding-left: 0px;
}
</style>