<template>
  <div :data-path="node.path">
    <a
      ref="nodeLink"
      :id="`node-${node.path}`"
      :class="['nav-link', { active: isActive, selected: isExactActive }]"
      href="#"
      role="treeitem"
      :aria-controls="collapseId"
      :data-path="node.path"
      @click.prevent="handleNodeClick"
      @keydown="handleKeyDown"
      :aria-expanded="isOpen"
      :aria-selected="isExactActive"
      :aria-label="`${node.type === 'folder' ? 'Folder' : 'File'}: ${node.name}`"
    >
      <Icon :icon="node.type === 'folder' ? 'mdi:folder' : 'mdi:file-outline'"
        :class="node.type === 'folder' ? 'text-warning me-1' : 'text-muted me-1'" width="18" height="18" />
      {{ node.name }}
      <Icon v-if="node.hasSubfolders" :icon="isOpen ? 'mdi:chevron-down' : 'mdi:chevron-right'" class="nav-link-toggle"
        width="16" height="16" />
    </a>

    
    <nav v-if="node.hasSubfolders" class="nav nav-vertical ms-3 tree-level tree-children" v-show="isOpen" :id="collapseId" role="group"
      :aria-labelledby="`node-${node.path}`">
      <template v-for="(child, index) in sortedChildren" :key="child.path">
        <TreeNode
          :node="child"
          :selectedPath="selectedPath"
          :loadChildren="loadChildren"
          @nodeToggle="reEmitToggle"
          @selectNode="emit('selectNode', $event)"
        />
      </template>
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

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import TreeNode from './FileTreeNode.vue'
import { Icon } from '@iconify/vue'

const props = defineProps({
  node: {
    type: Object,
    required: true,
    validator: (node) => node && typeof node.path === 'string' && typeof node.name === 'string'
  },
  selectedPath: {
    type: String,
    required: false
  },
  loadChildren: {
    type: Function,
    required: false
  }
})

const emit = defineEmits(['nodeToggle', 'selectNode'])

const reEmitToggle = (e) => emit('nodeToggle', e)

const nodeLink = ref(null)

// State
const isOpen = ref(props.node._isOpen || false)
const loading = ref(false)
const loadError = ref(false)
const children = ref([])
const hasLoadedChildren = ref(false)

// Computed properties
const collapseId = computed(() => `collapse-${props.node.path.replace(/[^\w-]/g, '_')}`)

const sortedChildren = computed(() => {
  if (!children.value || children.value.length === 0) {
    return []
  }

  return [...children.value].sort((a, b) => {
    // Folders first, then alphabetical
    if (a.type === 'folder' && b.type !== 'folder') return -1
    if (a.type !== 'folder' && b.type === 'folder') return 1
    return a.name.localeCompare(b.name, undefined, { numeric: true })
  })
})


// Normalize a path: remove trailing slashes (except root), ensure empty string returns '/'
const normalizePath = (path) => {
  if (!path) return '';
  return path.replace(/\/+$/, '') || '/';
}

const isActive = computed(() => {
  const current = normalizePath(props.selectedPath);
  const nodePath = normalizePath(props.node.path);
  return current === nodePath || current.startsWith(nodePath + '/');
})

const isExactActive = computed(() => {
  const current = normalizePath(props.selectedPath);
  const nodePath = normalizePath(props.node.path);
  return current === nodePath;
})

// Methods
const handleNodeClick = async () => {
  // For folders, always load fresh childItems before emitting selectNode
  if (props.node.type === 'folder') {
    // Initialize childItems if not already present
    if (!props.node.childItems) {
      props.node.childItems = []
    }

    // Always load childItems when folder is clicked to ensure fresh data
    if (props.loadChildren) {
      try {
        loading.value = true
        
        console.log(`Loading childItems for ${props.node.path}...`)
        
        // loadChildren function already populates node.childItems with all items
        const loadedChildren = await props.loadChildren(props.node)
        
        // Wait a bit to ensure childItems are fully populated
        await nextTick()
        
        // Verify that childItems were actually populated by the loadChildren function
        if (!props.node.childItems) {
          console.warn(`childItems not set for node: ${props.node.path}`)
          return // Don't emit selection if childItems weren't set
        }
        
        // Handle tree children for expansion (loadedChildren contains only folders)
        if (Array.isArray(loadedChildren)) {
          if (loadedChildren.length > 0) {
            const preservedChildren = preserveTreeState(loadedChildren)
            children.value = preservedChildren
            props.node.children = preservedChildren
          } else {
            children.value = []
            props.node.children = []
          }
        }
        
        hasLoadedChildren.value = true
        
        console.log(`childItems updated for ${props.node.path}: ${props.node.childItems.length} items`)
        
      } catch (error) {
        console.error('Failed to load children for node:', props.node.path, error)
        // Don't emit selection if loading failed
        return
      } finally {
        loading.value = false
      }
    }

    await toggleOpen()
  }

  // Emit selectNode after ensuring childItems are loaded (or for non-folder nodes)
  emit('selectNode', props.node.path)
}

const toggleOpen = async (forceReload = false) => {
  if (props.node.type !== 'folder' || !props.node.hasSubfolders) {
    return
  }

  // If closing, just toggle
  if (isOpen.value) {
    isOpen.value = false
    props.node._isOpen = false
    emit('nodeToggle', { node: props.node, isOpen: false })
    return
  }

  // If opening, load children only when needed AND not already loaded by handleNodeClick
  // Note: childItems are already loaded in handleNodeClick, this is just for tree expansion
  if (props.loadChildren && (forceReload || (!hasLoadedChildren.value && !children.value.length))) {
    loading.value = true
    loadError.value = false

    try {
      const loadedChildren = await props.loadChildren(props.node)
      if (Array.isArray(loadedChildren) && loadedChildren.length > 0) {
        const preservedChildren = preserveTreeState(loadedChildren)
        children.value = preservedChildren
        hasLoadedChildren.value = true
        props.node.children = preservedChildren
        // Don't override childItems here - they're already set correctly in handleNodeClick
      } else {
        children.value = []
        hasLoadedChildren.value = true
        props.node.children = []
        // Don't override childItems here - they might contain files too
      }
    } catch (error) {
      console.error('Failed to load children for node:', props.node.path, error)
      loadError.value = true
      return
    } finally {
      loading.value = false
    }
  }

  // Open the node and track state
  isOpen.value = true
  props.node._isOpen = true

  await nextTick()
  emit('nodeToggle', { node: props.node, isOpen: true })
}

const expandToPath = async (targetPath) => {
  if (!targetPath || !targetPath.startsWith(props.node.path)) {
    return
  }

  // If this node is on the target path, expand it
  if (targetPath === props.node.path || targetPath.startsWith(props.node.path + '/')) {
    if (!isOpen.value && props.node.hasSubfolders) {
      await toggleOpen()
    }
  }
}

// Method to preserve tree state when reloading
const preserveTreeState = (newChildren) => {
  if (!Array.isArray(newChildren)) return []
  if (!children.value.length) return newChildren

  const expandedStates = new Map()
  children.value.forEach(child => {
    expandedStates.set(child.path, {
      isOpen: child._isOpen || false,
      children: child.children
    })
  })

  return newChildren.map(newChild => {
    const preservedState = expandedStates.get(newChild.path)
    if (preservedState) {
      return {
        ...newChild,
        _isOpen: preservedState.isOpen,
        children: preservedState.children || newChild.children
      }
    }
    return newChild
  })
}

// Method to force refresh children while preserving tree state
const refreshChildren = async () => {
  if (props.node.type !== 'folder' || !props.loadChildren) return

  loading.value = true
  loadError.value = false
  try {
    // loadChildren already updates node.childItems with all items
    const loadedChildren = await props.loadChildren(props.node)
    const preservedChildren = preserveTreeState(Array.isArray(loadedChildren) ? loadedChildren : [])
    children.value = preservedChildren
    props.node.children = preservedChildren
    // Don't override childItems - they're already updated correctly by loadChildren
    hasLoadedChildren.value = true
  } catch (error) {
    console.error('Failed to refresh children for node:', props.node.path, error)
    loadError.value = true
  } finally {
    loading.value = false
  }
}

// Event handlers
const handleOpenPath = async (event) => {
  const targetPath = event.detail?.path
  if (!targetPath) return

  try {
    await expandToPath(targetPath)
  } catch (error) {
    console.error('Failed to expand to path:', targetPath, error)
  }
}

const handleSelectNodeEvent = (event) => {
  const path = event.detail?.path
  if (path) {
    emit('selectNode', path)
  }
}

const handleKeyDown = (event) => {
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

// Initialize children state based on node data
watch(() => props.node.children, (newChildren) => {
  if (newChildren && newChildren.length > 0) {
    children.value = [...newChildren]
    hasLoadedChildren.value = true
  } else if (newChildren !== null && newChildren !== undefined) {
    children.value = []
    hasLoadedChildren.value = true
  }
}, { immediate: true })

// Watch for external path changes
watch(() => props.selectedPath, (newPath) => {
  if (newPath && newPath.startsWith(props.node.path + '/') && !isOpen.value) {
    // Auto-expand if selected path is within this node
    toggleOpen()
  }
}, { immediate: true })

// Lifecycle
onMounted(() => {
  const treeRoot = nodeLink?.value?.closest('#menu') || document.getElementById('menu')

  if (treeRoot) {
    treeRoot.addEventListener('tree:openPath', handleOpenPath)
    treeRoot.addEventListener('tree:selectNode', handleSelectNode) // NEU
  }
})

function handleSelectNode(event) {
  const targetPath = event.detail?.path
  if (!targetPath) return
  emit('selectNode', targetPath) // leitet an Parent weiter
}

onUnmounted(() => {
  const treeRoot = nodeLink?.value?.closest('#menu') || document.getElementById('menu')

  if (treeRoot) {
    treeRoot.removeEventListener('tree:openPath', handleOpenPath)
    treeRoot.removeEventListener('tree:selectNode', handleSelectNodeEvent)
  }
})

// Expose methods for parent components
defineExpose({
  refreshChildren,
  expandToPath,
  toggleOpen
})
</script>

<style scoped>
.nav-link:focus {
  background-color: transparent;
}

.nav-link-toggle {
  margin-left: auto;
  padding: 0;
  transition: transform 0.3s;
}

.nav-link.selected {
  font-weight: 600;
}

.tree-children {
  border-left: 1px solid #ddd;
  padding-left: 0px;
}
</style>