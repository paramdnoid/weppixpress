<template>
  <div class="card flex-fill files-root">
    <FileToolbar
      :is-sidebar-collapsed="isCollapsed"
      :is-loading="fileStore.state.isLoading"
      :selected-count="fileStore.selectedItems.length"
      :is-uploading="isUploading"
      :upload-progress="uploadProgress"
      :sort-key="sortKey"
      :sort-dir="sortDir"
      :sort-options="SORT_OPTIONS"
      :view-mode="viewMode"
      :view-modes="VIEW_MODES"
      @toggle-sidebar="toggleSidebar"
      @create-folder="showCreateFolderModal"
      @delete-selected="deleteSelectedFiles"
      @clear-selection="fileStore.clearSelection"
      @file-upload="handleFileUpload"
      @sort="handleSort"
      @view-mode="setViewMode"
    />

    <div class="d-flex border-top splitter-container flex-fill position-relative">
      <FileSidebar
        :is-collapsed="isCollapsed"
        :width="sidebarWidth"
        :tree-data="treeData"
        :selected-path="fileStore.state.currentPath"
        :load-children="loadChildren"
        @node-toggle="() => {}"
        @treeUpdate="handleTreeUpdate"
      />

      <div v-show="!isCollapsed" class="splitter" @mousedown="startDragging" role="separator" />

      <FileView
        :items="enhancedFilteredItems"
        :item-key="getItemKey"
        :breadcrumbs="breadcrumbs"
        :search-value="search"
        :view-mode="viewMode"
        :sort-key="sortKey"
        :sort-dir="sortDir"
        :selected-items="fileStore.state.selectedIds"
        :is-loading="fileStore.state.isLoading"
        :error="fileStore.state.error"
        :is-uploading="isUploading"
        :upload-progress="uploadProgress"
        :empty-message="emptyStateMessage"
        @navigate="handleBreadcrumbNavigation"
        @search="handleSearch"
        @item-select="handleItemSelection"
        @item-dbl-click="handleItemDoubleClickOverride"
        @sort="handleSort"
      />
    </div>

    <FileManagerModals
      ref="modalsRef"
      :item-to-rename="itemToRename"
      :is-loading="fileStore.state.isLoading"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useFileManager } from '@/composables/useFileManager'
import FileToolbar from './FileToolbar.vue'
import FileSidebar from './FileSidebar.vue'
import FileView from './FileView.vue'
import FileManagerModals from './FileManagerModals.vue'

const fileManager = useFileManager()
const modalsRef = ref()
const selectedTreeNode = ref(null)

const {
  fileStore,
  viewMode,
  sortKey,
  sortDir,
  search,
  isUploading,
  uploadProgress,
  sidebarWidth,
  isCollapsed,
  startDragging,
  toggleSidebar,
  SORT_OPTIONS,
  VIEW_MODES,
  getItemKey,
  handleSearch,
  handleFileUpload,
  setViewMode,
  handleSort,
  deleteSelectedFiles,
  navigate,
  handleItemClick,
  breadcrumbs,
  filteredItems,
  emptyStateMessage,
  itemToRename,
  getFileIcon,
  getFileColor
} = fileManager

// Enhanced filteredItems that can use childItems from selected tree node
const enhancedFilteredItems = computed(() => {
  // If we have a selected tree node with childItems, use those
  if (selectedTreeNode.value && selectedTreeNode.value.childItems && selectedTreeNode.value.childItems.length > 0) {
    return selectedTreeNode.value.childItems.map(item => ({
      ...item,
      icon: getFileIcon(item),
      iconClass: getFileColor(item)
    }))
  }
  
  // Otherwise, fall back to the original filteredItems
  return filteredItems.value
})

// Persistent tree structure - never flattened
const persistentTreeData = ref([
  {
    title: 'Files',
    loading: false,
    error: null,
    items: []
  }
])

const treeData = computed(() => persistentTreeData.value)

// Helper function to find tree node by path
function findTreeNodeByPath(path, items) {
  for (const item of items) {
    if (item.path === path) {
      return item
    }
    if (item.children && item.children.length > 0) {
      const found = findTreeNodeByPath(path, item.children)
      if (found) return found
    }
  }
  return null
}

// Function to add folders to tree structure incrementally
function addFoldersToTree(newFolders, targetPath = '/') {
  const rootGroup = persistentTreeData.value[0]
  
  // If we're adding to root level
  if (targetPath === '/' || targetPath === '') {
    const existingPaths = new Set(rootGroup.items.map(item => item.path))
    
    newFolders.forEach(folder => {
      if (!existingPaths.has(folder.path)) {
        // Add new folder with tree structure properties
        rootGroup.items.push({
          ...folder,
          hasSubfolders: true, // Always true initially, will be updated when loaded
          children: folder.children || [],
          childItems: folder.childItems || [],
          _isOpen: false
        })
      }
    })
    
    // Sort folders alphabetically
    rootGroup.items.sort((a, b) => a.name.localeCompare(b.name))
    return
  }
  
  // Find the target node and add children
  const targetNode = findTreeNodeByPath(targetPath, rootGroup.items)
  if (targetNode) {
    const existingPaths = new Set((targetNode.children || []).map(item => item.path))
    
    newFolders.forEach(folder => {
      if (!existingPaths.has(folder.path)) {
        if (!targetNode.children) targetNode.children = []
        targetNode.children.push({
          ...folder,
          hasSubfolders: true, // Always true initially, will be updated when loaded
          children: folder.children || [],
          childItems: folder.childItems || [],
          _isOpen: false
        })
      }
    })
    
    // Sort children alphabetically
    if (targetNode.children) {
      targetNode.children.sort((a, b) => a.name.localeCompare(b.name))
    }
    
    // Update parent's hasSubfolders flag
    targetNode.hasSubfolders = targetNode.children.length > 0
  }
}

async function loadChildren(node) {
  try {
    // Load folder contents for tree node selection
    const res = await fileStore.fetchFolderContents(node.path)
    // Normalize to an array: support either Array or { items: Array }
    const items = Array.isArray(res) ? res : (Array.isArray(res?.items) ? res.items : [])
    
    // Sort items: folders first, then files, both alphabetically
    const sortedItems = [...items].sort((a, b) => {
      // Folders always come first
      if (a.type === 'folder' && b.type !== 'folder') return -1
      if (a.type !== 'folder' && b.type === 'folder') return 1
      
      // Within same type, sort alphabetically (case-insensitive)
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    })

    // Store all items (files + folders) in childItems for file view
    node.childItems = sortedItems
    
    // Get only folders for tree structure
    const folderItems = sortedItems.filter(item => item.type === 'folder')
    
    // Add new folders to persistent tree structure
    addFoldersToTree(folderItems, node.path)
    
    // Update the node's children directly as well
    if (!node.children) {
      node.children = []
    }
    
    // Add new children to the node
    const existingPaths = new Set(node.children.map(child => child.path))
    folderItems.forEach(folder => {
      if (!existingPaths.has(folder.path)) {
        node.children.push({
          ...folder,
          hasSubfolders: folder.hasSubfolders || false,
          children: folder.children || [],
          childItems: folder.childItems || [],
          _isOpen: false
        })
      }
    })
    
    // Sort children
    node.children.sort((a, b) => a.name.localeCompare(b.name))
    
    // Set hasSubfolders flag
    node.hasSubfolders = folderItems.length > 0
    
    // Return folders for the tree component
    return folderItems
  } catch (error) {
    console.error('Failed to load children for:', node.path, error)
    return []
  }
}

function showCreateFolderModal() {
  modalsRef.value?.showNewFolderModal()
}

function handleItemSelection(selection) {
  // Skip if selection is falsy
  if (!selection) return;
  if (selection.item && selection.item.type && selection.item.path) {
    handleItemClick(selection.item, selection.event || {});
  } else if (selection.type && selection.path) {
    handleItemClick(selection, {});
  } else {
    console.warn('handleItemSelection: Invalid selection object', selection);
    return;
  }
}

async function handleItemDoubleClickOverride(item) {
  if (item.type !== 'folder') {
    return navigate(item)
  }
  
  // For folders: Check if we already have the data
  const treeNode = findTreeNodeByPath(item.path, persistentTreeData.value[0].items)
  
  if (treeNode && treeNode.childItems && treeNode.childItems.length > 0) {
    // Use already loaded data - just expand the tree and update selection
    handleTreeUpdate(item.path)
    treeNode._isOpen = true
    
    // Make sure tree children are populated from childItems
    if (!treeNode.children || treeNode.children.length === 0) {
      const folderItems = treeNode.childItems.filter(item => item.type === 'folder')
      treeNode.children = folderItems.map(folder => ({
        ...folder,
        hasSubfolders: true,
        children: [],
        childItems: [],
        _isOpen: false
      }))
      treeNode.hasSubfolders = folderItems.length > 0
    }
    
    return
  }
  
  // Otherwise navigate normally (this loads the data once)
  await navigate(item)
  handleTreeUpdate(item.path)
  
  // Find the node again after navigation
  const updatedTreeNode = findTreeNodeByPath(item.path, persistentTreeData.value[0].items)
  if (updatedTreeNode) {
    // Use the data from navigate() instead of loading again
    const currentItems = filteredItems.value
    updatedTreeNode.childItems = currentItems
    
    // Extract folders for tree structure
    const folderItems = currentItems.filter(item => item.type === 'folder')
    if (folderItems.length > 0) {
      addFoldersToTree(folderItems, item.path)
      updatedTreeNode.children = folderItems.map(folder => ({
        ...folder,
        hasSubfolders: true,
        children: [],
        childItems: [],
        _isOpen: false
      }))
      updatedTreeNode.hasSubfolders = true
    }
    
    // Expand the node
    updatedTreeNode._isOpen = true
  }
}

function handleTreeUpdate(newPath) {
  // Update the current path in the store
  fileStore.state.currentPath = newPath
  
  // Find the selected tree node and store it by searching through all tree groups
  let foundNode = null
  for (const group of treeData.value) {
    if (group.items && group.items.length > 0) {
      foundNode = findTreeNodeByPath(newPath, group.items)
      if (foundNode) break
    }
  }
  selectedTreeNode.value = foundNode
}

async function handleBreadcrumbNavigation(item) {
  // Clear the selected tree node when navigating via breadcrumbs
  selectedTreeNode.value = null
  await navigate(item)
}


onMounted(async () => {
  try {
    await fileStore.fetchItems()
    
    // Initialize tree with root folders
    const rootFolders = filteredItems.value.filter(item => item.type === 'folder')
    addFoldersToTree(rootFolders, '/')
  } catch (error) {
    console.error('Error loading files:', error)
  }
})

</script>

<style scoped>
.files-root {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100vh;
}

.splitter-container {
  display: flex;
  position: relative;
  overflow: hidden;
  flex: 1 1 auto;
  min-height: 0;
}

.splitter {
  width: 5px;
  cursor: col-resize;
  background: var(--tblr-gray-50);
  transition: background-color 0.2s ease;
  z-index: 10;
  user-select: none;
  flex-shrink: 0;
}

.splitter:hover,
.splitter:focus {
  background-color: var(--tblr-primary);
}
</style>
