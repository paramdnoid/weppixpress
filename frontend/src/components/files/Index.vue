<template>
  <div class="card flex-fill files-root">
    <!-- Toolbar -->
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
      <!-- Sidebar -->
      <FileSidebar
        :is-collapsed="isCollapsed"
        :width="sidebarWidth"
        :tree-data="treeData"
        :selected-path="fileStore.state.currentPath"
        :load-children="loadChildren"
        @node-select="handleNodeSelect"
        @node-toggle="handleNodeToggle"
      />

      <!-- Draggable Splitter -->
      <div v-show="!isCollapsed" class="splitter" @mousedown="startDragging" role="separator"
        aria-label="Resize sidebar" />

      <!-- File View -->
      <FileView
        :items="filteredItems"
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
        @navigate="handleItemDoubleClick"
        @search="handleSearch"
        @retry="retryLoadFiles"
        @item-dbl-click="handleItemDoubleClick"
        @item-select="handleItemSelection"
        @sort="handleSort"
      />
    </div>

    <!-- Modals -->
    <RenameModal
      ref="renameModal"
      :item="itemToRename"
      :is-loading="fileStore.state.isLoading"
      @rename="handleRename"
    />

    <NewFolderModal
      ref="newFolderModal"
      :is-loading="fileStore.state.isLoading"
      @create="handleCreateFolder"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { debounce } from 'lodash-es'
import FileToolbar from './FileToolbar.vue'
import FileSidebar from './FileSidebar.vue'
import FileView from './FileView.vue'
import RenameModal from './RenameModal.vue'
import NewFolderModal from './NewFolderModal.vue'
import { useFileStore } from '@/stores/files.ts'
import { useFiles } from '@/composables/useFiles'
import { useFileUpload } from '@/composables/useFileUpload'
import { useSidebarResize } from '@/composables/useSidebarResize'
import { SORT_OPTIONS, VIEW_MODES, MIN_SIDEBAR_WIDTH, DEFAULT_SIDEBAR_WIDTH } from '@/constants/files'

// Store and composables
const fileStore = useFileStore()
const { getFileIcon, getFileColor, getFileComparator } = useFiles()
const { isUploading, uploadProgress, uploadFiles, handleFileInput } = useFileUpload()
const { sidebarWidth, isCollapsed, startDragging, toggleSidebar } = useSidebarResize({
  initialWidth: DEFAULT_SIDEBAR_WIDTH,
  minWidth: MIN_SIDEBAR_WIDTH
})

// Template refs
const renameModal = ref(null)
const newFolderModal = ref(null)

// Reactive state
const viewMode = ref('grid')
const sortKey = ref('name')
const sortDir = ref('asc')
const search = ref('')
const isLoading = ref(false)
const itemToRename = ref(null)

// Helper functions
const getItemKey = (item) => item.id || item.name

const breadcrumbs = computed(() => {
  return fileStore.breadcrumbs
})

const treeData = computed(() => {
  if (fileStore.state.error) {
    return [{
      title: 'Files',
      icon: 'mdi:home',
      items: [],
      error: fileStore.state.error
    }]
  }

  if (fileStore.state.isLoading) {
    return [{
      title: 'Files',
      icon: 'mdi:home',
      items: [],
      loading: true
    }]
  }

  return [{
    title: 'Files',
    icon: 'mdi:home',
    items: fileStore.currentItems.map(f => ({
      name: f.name,
      path: f.path,
      type: f.type,
      hasSubfolders: f.hasSubfolders,
      children: f.children ?? (f.type === 'folder' ? null : undefined)
    }))
  }]
})

const filteredItems = computed(() => {
  return fileStore.currentItems.map(item => ({
    ...item,
    icon: getFileIcon(item),
    iconClass: getFileColor(item)
  }))
})

const emptyStateMessage = computed(() => {
  if (search.value) {
    return 'No files match your search'
  }
  return 'This folder is empty'
})

const isAllSelected = computed(() => {
  return filteredItems.value.length > 0 &&
    filteredItems.value.every(item => fileStore.state.selectedIds.has(item.path))
})

const isSomeSelected = computed(() => {
  return filteredItems.value.some(item => fileStore.state.selectedIds.has(item.path)) && !isAllSelected.value
})


// Debounced search
const debouncedSearch = debounce((query) => {
  search.value = query
}, 300)

// Helper: unify path selection + scrolling in one place
async function openPathAndScroll(path) {
  fileStore.selectedPath = path
}

// Event handlers
function handleSearch(query) {
  debouncedSearch(query)
}

async function handleFileUpload(event) {
  const files = handleFileInput(event)
  if (files.length > 0) {
    try {
      await fileStore.uploadFiles(files)
    } catch (error) {
      console.error('Upload failed:', error)
    }
  }
}

function handleItemSelection(selection) {
  emit('itemSelect', selection)
}

function showCreateFolderModal() {
  newFolderModal.value?.show()
}

async function handleCreateFolder(name) {
  try {
    // TODO: Implement createFolder method in store
    console.log('Creating folder:', name)
    newFolderModal.value?.hide()
  } catch (error) {
    console.error('Create folder failed:', error)
  }
}

async function handleRename(data) {
  try {
    // TODO: Implement renameFile method in store
    console.log('Renaming file:', data.oldName, 'to', data.newName)
    renameModal.value?.hide()
    itemToRename.value = null
  } catch (error) {
    console.error('Rename failed:', error)
  }
}

function startRename(item) {
  itemToRename.value = item
  renameModal.value?.show()
}

function setViewMode(mode) {
  viewMode.value = mode
  fileStore.clearSelection()
}

function handleSort(key) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = 'asc'
  }
}


async function retryLoadFiles() {
  try {
    await fileStore.fetchItems(fileStore.state.currentPath, { force: true })
  } catch (error) {
    console.error('Retry failed:', error)
  }
}

// File operations
function handleItemClick(item, event) {
  const isCtrlOrCmd = event.ctrlKey || event.metaKey
  const isShift = event.shiftKey
  
  if (isCtrlOrCmd) {
    fileStore.selectItem(item, 'toggle')
  } else if (isShift && fileStore.selectedItems.length > 0) {
    selectRange(item)
  } else {
    fileStore.clearSelection()
    fileStore.selectItem(item)
  }
}

async function handleItemDoubleClick(item) {
  if (item.type === 'folder' || item.isClickable) {
    await openFolder(item)
  } else {
    // Handle file opening/preview
    console.log('Open file:', item)
  }
}

function handleContextMenu(item, event) {
  event.preventDefault()
  // Implement context menu
  console.log('Context menu for:', item)
}

function handleItemKeyDown(item, event) {
  switch (event.key) {
    case 'Enter':
    case ' ':
      event.preventDefault()
      if (item.type === 'folder') {
        openFolder(item)
      }
      break
    case 'Delete':
      event.preventDefault()
      deleteItem(item)
      break
    case 'F2':
      event.preventDefault()
      startRename(item)
      break
  }
}


function selectRange(endItem) {
  fileStore.selectItem(endItem, 'range')
}


async function openFolder(folder) {
  isLoading.value = true
  try {
    await loadChildren(folder)
    await openPathAndScroll(folder.path)
  } finally {
    isLoading.value = false
  }
}




async function deleteItem(item) {
  if (!confirm(`Are you sure you want to delete "${item.name}"?`)) {
    return
  }

  try {
    await fileStore.deleteItems([item])
  } catch (error) {
    console.error('Delete failed:', error)
  }
}

async function deleteSelectedFiles() {
  const selectedItems = fileStore.selectedItems
  const count = selectedItems.length

  if (!confirm(`Are you sure you want to delete ${count} selected file${count > 1 ? 's' : ''}?`)) {
    return
  }

  try {
    await fileStore.deleteItems(selectedItems)
  } catch (error) {
    console.error('Delete failed:', error)
  }
}



// Tree navigation
async function loadChildren(node) {
  try {
    const response = await fileStore.fetchItems(node.path)
    return response.items?.map(child => ({
      ...child,
      children: child.type === 'folder' ? null : undefined
    })) || []
  } catch (error) {
    console.error('Error loading children:', error)
    return []
  }
}

async function handleNodeSelect(node) {
  if (node.type === 'folder') {
    await openFolder(node)
  }
}

function handleNodeToggle(data) {
  console.log('Node toggled:', data)
}

// Lifecycle hooks
onMounted(async () => {
  try {
    await fileStore.fetchItems()

    // Set up indeterminate checkbox state watcher
    nextTick(() => {
      const selectAllCheckbox = document.querySelector('thead .form-check-input')
      if (selectAllCheckbox) {
        selectAllCheckbox.indeterminate = isSomeSelected.value
      }
    })
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

.files-root .splitter-container {
  min-height: 0;
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