<template>
  <div class="card flex-fill files-root">
    <FileToolbar 
      :is-sidebar-collapsed="isCollapsed" 
      :is-loading="fileStore.state.isLoading"
      :selected-count="fileStore.selectedItems.length" 
      :is-uploading="isUploading" 
      :upload-progress="uploadProgress"
      :clipboard-has-items="fileStore.hasClipboard"
      :clipboard-item-count="fileStore.clipboardInfo?.count || 0"
      :search-value="fileStore.state.filters.search"
      :sort-key="fileStore.state.sorting.key" 
      :sort-dir="fileStore.state.sorting.order" 
      :sort-options="SORT_OPTIONS" 
      :view-mode="viewMode"
      :view-modes="VIEW_MODES" 
      @toggle-sidebar="toggleSidebar" 
      @create-folder="showCreateFolderModal"
      @delete-selected="handleDeleteSelectedFiles" 
      @clear-selection="fileStore.clearSelection"
      @copy-selected="handleCopySelected"
      @cut-selected="handleCutSelected"
      @paste-items="handlePasteItems"
      @file-upload="handleFileUpload"
      @search="fileStore.setSearch"
      @sort="fileStore.setSorting" 
      @view-mode="setViewMode" 
    />

    <div class="d-flex border-top splitter-container flex-fill position-relative">
      <FileSidebar 
        :is-collapsed="isCollapsed" 
        :width="sidebarWidth" 
        :tree-data="treeData"
        :selected-path="fileStore.state.currentPath" 
        :load-children="loadTreeChildren" 
        :toggle-node="toggleNode"
        @nodeSelect="handleTreeNodeSelect"
      />

      <div v-show="!isCollapsed" class="splitter" @mousedown="startDragging" role="separator" />

      <FileView 
        :items="fileStore.currentItems" 
        :item-key="getItemKey" 
        :breadcrumbs="fileStore.breadcrumbs" 
        :view-mode="viewMode" 
        :sort-key="fileStore.state.sorting.key" 
        :sort-dir="fileStore.state.sorting.order" 
        :selected-items="fileStore.state.selectedIds"
        :is-loading="fileStore.state.isLoading" 
        :error="fileStore.state.error" 
        :is-uploading="isUploading"
        :upload-progress="uploadProgress" 
        :empty-message="emptyStateMessage" 
        @navigate="handleBreadcrumbNavigate"
        @item-select="handleItemClick" 
        @item-dbl-click="handleItemDoubleClickLocal"
        @sort="fileStore.setSorting"
        @retry="handleRetry"
        @delete-selected="handleDeleteSelectedFiles"
        @selection-change="handleSelectionChange"
      />
    </div>

    <FileManagerModals 
      ref="modalsRef" 
      :item-to-rename="itemToRename" 
      :is-loading="fileStore.state.isLoading"
      @rename="handleRename"
      @create-folder="handleCreateFolder" 
    />
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useFileManager } from '@/composables/useFileManager'
import { useAuthStore } from '@/stores/auth'
import FileToolbar from './FileToolbar.vue'
import FileSidebar from './FileSidebar.vue'
import FileView from './FileView.vue'
import FileManagerModals from './FileManagerModals.vue'

// Use the consolidated composable
const {
  fileStore,
  viewMode,
  sidebarWidth,
  isCollapsed,
  isUploading,
  uploadProgress,
  emptyStateMessage,
  SORT_OPTIONS,
  VIEW_MODES,
  getItemKey,
  handleItemClick,
  handleItemDoubleClick,
  handleFileUpload,
  setViewMode,
  toggleSidebar,
  startDragging,
  deleteSelectedFiles
} = useFileManager()

const authStore = useAuthStore()

const modalsRef = ref()
const itemToRename = ref(null)

// Tree data management
const treeData = ref([
  {
    title: 'Files',
    loading: false,
    error: null,
    items: []
  }
])

// Load tree children (for sidebar)
async function loadTreeChildren(node) {
  try {
    const items = await fileStore.loadFolderContents(node.path)
    
    // Store all items for display
    node.childItems = items
    
    // Return only folders for tree structure
    const folders = items.filter(item => item.type === 'folder')
    node.children = folders
    node.hasSubfolders = folders.length > 0
    
    return folders
  } catch (error) {
    console.error('Failed to load children:', error)
    return []
  }
}

// Unified toggle node function for both tree and breadcrumb navigation
function toggleNode(path, options = {}) {
  // Always navigate to the path - this ensures breadcrumb consistency
  fileStore.navigateToPath(path)
  
  // For non-tree navigation, trigger tree reorganization
  if (options.fromBreadcrumb) {
    // Use nextTick to ensure store update completes first
    nextTick(() => {
      const treeRoot = document.getElementById('menu')
      if (treeRoot) {
        const event = new CustomEvent('tree:reorganize', {
          detail: { targetPath: path }
        })
        treeRoot.dispatchEvent(event)
      }
    })
  }
}

// Handle tree node selection
function handleTreeNodeSelect(path) {
  toggleNode(path)
}

// Handle breadcrumb navigation
function handleBreadcrumbNavigate(breadcrumb) {
  // Navigate to the path - this will update fileStore.state.currentPath
  // which is passed as selectedPath to the tree components
  // The tree will automatically expand/collapse via the watch function
  toggleNode(breadcrumb.path, { fromBreadcrumb: true })
}

// Handle item double click (Grid/Table navigation)
function handleItemDoubleClickLocal(item) {
  if (item.type === 'folder') {
    // Use toggleNode with fromBreadcrumb to ensure tree synchronization
    // This will update fileStore.state.currentPath AND trigger tree reorganization
    toggleNode(item.path, { fromBreadcrumb: true })
  } else {
    // For files, use the original composable function
    handleItemDoubleClick(item)
  }
}

// Modal handlers
function showCreateFolderModal() {
  modalsRef.value?.showNewFolderModal()
}

function handleRename(data) {
  fileStore.renameItem(data.item, data.newName)
}

async function handleCreateFolder(name) {
  try {
    await fileStore.createFolder(name)
    
    // Update root tree data if we're at root level
    if (fileStore.state.currentPath === '/') {
      const folders = fileStore.currentItems.filter(item => item.type === 'folder')
      treeData.value[0].items = folders
    }
    
    // Trigger tree reorganization to show new folder in sidebar
    await nextTick()
    const treeRoot = document.getElementById('menu')
    if (treeRoot) {
      const event = new CustomEvent('tree:reorganize', {
        detail: { targetPath: fileStore.state.currentPath }
      })
      treeRoot.dispatchEvent(event)
    }
  } finally {
    const m = modalsRef.value
    if (m?.hideNewFolderModal) {
      m.hideNewFolderModal()
    } else if (m?.newFolderModal?.hide) {
      m.newFolderModal.hide()
    }
  }
}

// Handle drag selection changes
function handleSelectionChange(items, additive = false) {
  if (!additive) {
    // Clear current selection first
    fileStore.clearSelection()
  }
  
  // Select all items from the drag selection
  if (items.length > 0) {
    items.forEach((item, index) => {
      // Use 'single' for first item to reset, 'toggle' for subsequent items
      const mode = (!additive && index === 0) ? 'single' : 'toggle'
      fileStore.selectItem(item, mode)
    })
  }
}

// Handle clipboard operations
function handleCopySelected() {
  const selectedItems = fileStore.selectedItems
  if (selectedItems.length === 0) return
  
  fileStore.copyItems(selectedItems)
}

function handleCutSelected() {
  const selectedItems = fileStore.selectedItems
  if (selectedItems.length === 0) return
  
  fileStore.cutItems(selectedItems)
}

async function handlePasteItems() {
  if (!fileStore.hasClipboard) return
  
  try {
    await fileStore.pasteItems(fileStore.state.currentPath)
    
    // Update root tree data if we're at root level
    if (fileStore.state.currentPath === '/') {
      const folders = fileStore.currentItems.filter(item => item.type === 'folder')
      treeData.value[0].items = folders
    }
    
    // Trigger tree reorganization to update sidebar
    await nextTick()
    const treeRoot = document.getElementById('menu')
    if (treeRoot) {
      const event = new CustomEvent('tree:reorganize', {
        detail: { targetPath: fileStore.state.currentPath }
      })
      treeRoot.dispatchEvent(event)
    }
  } catch (error) {
    console.error('Paste failed:', error)
  }
}

// Handle delete selected files with sidebar update
async function handleDeleteSelectedFiles() {
  const selectedItems = fileStore.selectedItems
  if (selectedItems.length === 0) return
  
  const count = selectedItems.length
  const message = count === 1 
    ? `Delete "${selectedItems[0].name}"?`
    : `Delete ${count} items?`
  
  if (!confirm(message)) return
  
  try {
    // Store paths of items being deleted for tree update
    const deletedPaths = selectedItems.map(item => item.path)
    const currentPath = fileStore.state.currentPath
    
    // Delete the items
    await fileStore.deleteItems()
    
    // Update root tree data if we're at root level
    if (currentPath === '/') {
      const folders = fileStore.currentItems.filter(item => item.type === 'folder')
      treeData.value[0].items = folders
    }
    
    // Trigger tree reorganization to update sidebar for each deleted item's parent
    await nextTick()
    const treeRoot = document.getElementById('menu')
    if (treeRoot) {
      // Get unique parent paths
      const parentPaths = [...new Set(deletedPaths.map(path => {
        const parts = path.split('/')
        parts.pop()
        return parts.join('/') || '/'
      }))]
      
      // Trigger reorganization for each affected parent path
      parentPaths.forEach(parentPath => {
        const event = new CustomEvent('tree:reorganize', {
          detail: { targetPath: parentPath }
        })
        treeRoot.dispatchEvent(event)
      })
    }
  } catch (error) {
    console.error('Delete failed:', error)
  }
}

// Handle retry for failed operations
function handleRetry() {
  // Clear error first
  fileStore.state.error = null
  
  // Check authentication again
  if (!authStore.accessToken) {
    fileStore.state.error = 'Authentication required. Please log in to access files.'
    return
  }
  
  // Retry loading files
  fileStore.refreshCurrentPath()
}

// Initialize
onMounted(async () => {
  try {
    // Check if user is authenticated
    if (!authStore.accessToken) {
      fileStore.state.error = 'Authentication required. Please log in to access files.'
      return
    }

    // Navigate to root - this loads both tree and main view data (force refresh on mount)
    await fileStore.navigateToPath('/', true)
    
    // Load root folders for tree display from current items
    if (fileStore.currentItems.length > 0) {
      const folders = fileStore.currentItems.filter(item => item.type === 'folder')
      treeData.value[0].items = folders
    }
  } catch (error) {
    console.error('Failed to initialize file manager:', error)
    
    // Check if it's an authentication error
    if (error.response?.status === 401) {
      fileStore.state.error = 'Session expired. Please log in again to access files.'
      // Clear invalid token
      authStore.logout()
    } else {
      fileStore.state.error = error.response?.data?.message || error.message || 'Failed to load files'
    }
  }
})
</script>

<style scoped>
.files-root {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: calc(100vh - 100px);
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
