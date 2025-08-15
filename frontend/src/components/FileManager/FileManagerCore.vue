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
        @item-dbl-click="handleItemDoubleClickOverride"
        @item-select="handleItemSelection"
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
  handleItemDoubleClick,
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

const treeData = computed(() => [
  {
    title: 'Files',
    loading: fileStore.state.isLoading,
    error: fileStore.state.error,
    items: filteredItems.value.filter(item => item.type === 'folder')
  }
])

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

async function loadChildren(node) {
  try {
    // Force fresh data by bypassing cache for tree node selection
    const res = await fileStore.fetchFolderContents(node.path, { force: true })
    // Normalize to an array: support either Array or { items: Array }
    const items = Array.isArray(res) ? res : (Array.isArray(res?.items) ? res.items : [])
    
    console.log(`loadChildren for ${node.path}: got ${items.length} items`)
    
    // Store all items in childItems for the file view
    if (!node.childItems) {
      node.childItems = []
    }
    node.childItems = items
    
    // Initialize childItems for each folder in the list
    items.forEach(item => {
      if (item.type === 'folder' && !item.childItems) {
        item.childItems = []
      }
    })
    
    // Return only folders for the tree structure
    const folderItems = items.filter(item => item.type === 'folder')
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

function handleItemDoubleClickOverride(item) {
  // Clear the selected tree node when navigating via double-click
  selectedTreeNode.value = null
  return handleItemDoubleClick(item)
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
