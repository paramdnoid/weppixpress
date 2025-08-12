<template>
  <div :data-path="node.path">
    <a ref="nodeLink" :id="`node-${node.path}`" :class="['nav-link', { active: isActive, selected: isExactActive }]"
      href="#" :data-path="node.path" @click.prevent="handleNodeClick" :aria-expanded="isOpen"
      :aria-selected="isExactActive" :aria-label="`${node.type === 'folder' ? 'Folder' : 'File'}: ${node.name}`">
      <Icon :icon="node.type === 'folder' ? 'mdi:folder' : 'mdi:file-outline'"
        :class="node.type === 'folder' ? 'text-warning me-1' : 'text-muted me-1'" width="18" height="18" />
      {{ node.name }}
      <Icon v-if="node.hasSubfolders" :icon="isOpen ? 'mdi:chevron-down' : 'mdi:chevron-right'" class="nav-link-toggle"
        width="16" height="16" />
    </a>

    
    <nav v-if="node.hasSubfolders" class="nav nav-vertical ms-3 tree-level" v-show="isOpen" :id="collapseId" role="group"
      :aria-labelledby="`node-${node.path}`" :style="{ 'border-left': '2px solid #ddd', 'padding-left': '10px' }">
      <template v-for="(child, index) in sortedChildren" :key="child.path">
        <TreeNode :node="child" :selectedPath="selectedPath"
          :loadChildren="loadChildren" 
          @nodeToggle="(e) => emit('nodeToggle', e)" />
        
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
import { ref, computed, onMounted, onUnmounted, watch, nextTick, triggerRef } from 'vue'
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

const emit = defineEmits(['nodeToggle'])

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

const isActive = computed(() => {
  return props.selectedPath === props.node.path ||
    (props.selectedPath && props.selectedPath.startsWith(props.node.path + '/'))
})

const isExactActive = computed(() => props.selectedPath === props.node.path)


// Methods
const handleNodeClick = async () => {
  if (props.node.type === 'folder') {
    await toggleOpen()
  }
}

const toggleOpen = async () => {
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

  // If opening, always check if we need to load/reload children
  if (!hasLoadedChildren.value && props.loadChildren) {
    loading.value = true
    loadError.value = false

    try {
      const loadedChildren = await props.loadChildren(props.node)
      
      if (loadedChildren && loadedChildren.length > 0) {
        // Preserve existing tree states when loading new children
        const preservedChildren = preserveTreeState(loadedChildren)
        
        // Update local state
        children.value = [...preservedChildren]
        hasLoadedChildren.value = true
        
        // Ensure the original node maintains its structure
        if (!props.node.children) {
          props.node.children = []
        }
        props.node.children.splice(0, props.node.children.length, ...preservedChildren)
      } else {
        children.value = []
        hasLoadedChildren.value = true
        props.node.children = []
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
  if (!newChildren || !children.value.length) return newChildren

  // Create a map of current expanded states
  const expandedStates = new Map()
  children.value.forEach(child => {
    expandedStates.set(child.path, {
      isOpen: child._isOpen || false,
      children: child.children
    })
  })

  // Apply preserved state to new children
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
  if (props.node.type !== 'folder' || !props.loadChildren) {
    return
  }

  hasLoadedChildren.value = false
  if (isOpen.value) {
    await toggleOpen()
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
  }

  if (nodeLink.value) {
    nodeLink.value.addEventListener('keydown', handleKeyDown)
  }
})

onUnmounted(() => {
  const treeRoot = nodeLink?.value?.closest('#menu') || document.getElementById('menu')

  if (treeRoot) {
    treeRoot.removeEventListener('tree:openPath', handleOpenPath)
  }

  if (nodeLink.value) {
    nodeLink.value.removeEventListener('keydown', handleKeyDown)
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
</style>
<style scoped>
.nav-link.selected {
  font-weight: 600;
}
</style>