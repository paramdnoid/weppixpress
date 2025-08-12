<template>
  <aside 
    ref="sidebarElement" 
    class="border-end sidebar" 
    :class="{ 'w-0': isCollapsed }" 
    :style="sidebarStyle"
    :aria-hidden="isCollapsed"
  >
    <div class="col-docs flex-fill p-1">
      <nav id="menu" ref="treeRoot">
        <nav class="nav nav-vertical" v-for="group in fullTree" :key="group.id">

          <!-- Error State -->
          <div v-if="group.error" class="alert alert-warning m-2">
            <i class="icon ti ti-alert-triangle"></i>
            {{ group.error }}
          </div>
          
          <!-- Loading State for Root -->
          <div v-else-if="group.loading && (!group.items || group.items.length === 0)" 
               class="d-flex justify-content-center p-3">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
          </div>
          
          <!-- Empty State -->
          <div v-else-if="!group.loading && group.items.length === 0" 
               class="text-muted text-center p-3">
            No files found
          </div>
          
          <!-- Tree Nodes -->
          <TreeNode 
            v-for="node in group.items" 
            :key="node.path" 
            :node="node" 
            :selectedPath="selectedPath"
            :loadChildren="handleLoadChildren" 
            @nodeToggle="handleNodeToggle" 
          />
        </nav>
      </nav>
    </div>
  </aside>
</template>

<script setup>
import { computed, ref, reactive, watch, nextTick } from 'vue'
import TreeNode from './FileTreeNode.vue'

const props = defineProps({
  isCollapsed: { type: Boolean, default: false },
  width: { type: Number, default: 250 },
  treeData: { type: Array, required: true },
  selectedPath: { type: String, default: '' },
  loadChildren: { type: Function, required: true }
})

const emit = defineEmits(['nodeToggle', 'treeUpdate'])

// Refs
const sidebarElement = ref(null)
const treeRoot = ref(null)

// Full tree structure that maintains all loaded nodes
const fullTree = ref([])

// Map to quickly find nodes by path
const nodeMap = reactive(new Map())

// Initialize full tree from treeData
watch(() => props.treeData, (newData) => {
  initializeFullTree(newData)
}, { immediate: true, deep: true })

// Initialize the full tree structure
function initializeFullTree(data) {
  if (!data || !Array.isArray(data)) return
  
  // Create deep copy to avoid mutating props
  fullTree.value = data.map(group => ({
    ...group,
    id: group.id || group.title || Math.random().toString(36),
    items: initializeNodes(group.items || [], null)
  }))
  
  // Rebuild node map
  rebuildNodeMap()
}

// Initialize nodes recursively
function initializeNodes(items, parentPath) {
  if (!items || !Array.isArray(items)) return []
  
  return items.map(item => {
    const node = {
      ...item,
      path: item.path,
      name: item.name,
      type: item.type || 'file',
      hasSubfolders: item.hasSubfolders !== undefined ? item.hasSubfolders : (item.type === 'folder'),
      children: item.children ? initializeNodes(item.children, item.path) : [],
      _isOpen: item._isOpen || false,
      _loaded: item._loaded || (item.children && item.children.length > 0)
    }
    
    // Add to node map
    nodeMap.set(node.path, node)
    
    return node
  })
}

// Rebuild the node map from the full tree
function rebuildNodeMap() {
  nodeMap.clear()
  
  const addToMap = (nodes) => {
    if (!nodes) return
    nodes.forEach(node => {
      nodeMap.set(node.path, node)
      if (node.children && node.children.length > 0) {
        addToMap(node.children)
      }
    })
  }
  
  fullTree.value.forEach(group => {
    addToMap(group.items)
  })
}

// Handle loading children for a node
async function handleLoadChildren(node) {
  if (!props.loadChildren) {
    console.warn('No loadChildren function provided')
    return []
  }
  
  // Find the node in our tree
  const treeNode = nodeMap.get(node.path)
  if (!treeNode) {
    console.error('Node not found in tree:', node.path)
    return []
  }
  
  // If already loaded, return existing children
  if (treeNode._loaded && treeNode.children && treeNode.children.length > 0) {
    return treeNode.children
  }
  
  try {
    // Load children from parent
    const loadedChildren = await props.loadChildren(node)
    
    if (loadedChildren && Array.isArray(loadedChildren)) {
      // Process and add children to the tree
      const processedChildren = loadedChildren.map(child => ({
        ...child,
        path: child.path,
        name: child.name,
        type: child.type || 'file',
        hasSubfolders: child.hasSubfolders !== undefined ? child.hasSubfolders : (child.type === 'folder'),
        children: [],
        _isOpen: false,
        _loaded: false
      }))
      
      // Update the tree node
      treeNode.children = processedChildren
      treeNode._loaded = true
      
      // Add new children to node map
      processedChildren.forEach(child => {
        nodeMap.set(child.path, child)
      })
      
      // Emit tree update event
      emit('treeUpdate', { 
        node: treeNode, 
        children: processedChildren,
        action: 'childrenLoaded'
      })
      
      return processedChildren
    }
    
    // Mark as loaded even if no children
    treeNode._loaded = true
    treeNode.children = []
    
    return []
    
  } catch (error) {
    console.error('Failed to load children for node:', node.path, error)
    
    // Mark as loaded to prevent repeated attempts
    treeNode._loaded = true
    treeNode.children = []
    treeNode._error = error.message || 'Failed to load children'
    
    throw error
  }
}


// Handle node toggle
function handleNodeToggle(event) {
  const { node, isOpen } = event
  
  // Update state in tree
  const treeNode = nodeMap.get(node.path)
  if (treeNode) {
    treeNode._isOpen = isOpen
    
    emit('nodeToggle', event)
    emit('treeUpdate', { 
      node: treeNode,
      isOpen,
      action: 'toggled'
    })
  }
}

// Expand to a specific path
async function expandToPath(targetPath) {
  if (!targetPath) return
  
  // Split path into segments
  const segments = targetPath.split('/').filter(Boolean)
  let currentPath = ''
  
  for (const segment of segments) {
    currentPath = currentPath ? `${currentPath}/${segment}` : segment
    const node = nodeMap.get(currentPath)
    
    if (node && node.type === 'folder' && !node._isOpen) {
      // Load children if needed
      if (!node._loaded && node.hasSubfolders) {
        await handleLoadChildren(node)
      }
      
      // Open the node
      node._isOpen = true
      
      await nextTick()
    }
  }
}

// Refresh a specific node's children
async function refreshNode(path) {
  const node = nodeMap.get(path)
  if (!node) return
  
  // Mark as not loaded to force reload
  node._loaded = false
  node.children = []
  
  // If node is open, reload children
  if (node._isOpen && node.hasSubfolders) {
    await handleLoadChildren(node)
  }
}

// Get the full tree structure
function getFullTree() {
  return fullTree.value
}

// Get a node by path
function getNodeByPath(path) {
  return nodeMap.get(path)
}

// Computed
const sidebarStyle = computed(() => ({
  width: props.isCollapsed ? '0' : `${props.width}px`
}))

// Expose methods and data
defineExpose({
  sidebarElement,
  treeRoot,
  expandToPath,
  refreshNode,
  getFullTree,
  getNodeByPath,
  nodeMap: nodeMap
})
</script>

<style scoped>
.sidebar {
  min-width: 0;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  will-change: width;
  flex-shrink: 0;
  background: var(--bs-body-bg, white);
}

.sidebar.w-0 {
  width: 0 !important;
  min-width: 0 !important;
}

.nav-group-title {
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-size: 0.75rem;
  opacity: 0.7;
  border-bottom: 1px solid var(--tblr-border-color, #dee2e6);
  margin-bottom: 0.5rem;
}

@media (max-width: 768px) {
  .sidebar:not(.w-0) {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    z-index: 1000;
    background: white;
    box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
  }
}

#menu {
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  max-height: calc(100vh - 2rem);
  padding-bottom: 1rem;
}

#menu::-webkit-scrollbar {
  width: 8px;
}

#menu::-webkit-scrollbar-track {
  background: var(--tblr-gray-50, #f8f9fa);
}

#menu::-webkit-scrollbar-thumb {
  background: var(--tblr-gray-300, #dee2e6);
  border-radius: 4px;
}

#menu::-webkit-scrollbar-thumb:hover {
  background: var(--tblr-gray-400, #ced4da);
}

/* Smooth animations */
.nav-vertical {
  transition: all 0.3s ease;
}

/* Loading indicator styles */
.spinner-border {
  width: 1.5rem;
  height: 1.5rem;
  border-width: 0.2em;
}

/* Alert styles */
.alert {
  font-size: 0.875rem;
  padding: 0.5rem 0.75rem;
}
</style>