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
      />

      <div v-show="!isCollapsed" class="splitter" @mousedown="startDragging" role="separator" />

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
        @navigate="handleBreadcrumbNavigation"
        @search="handleSearch"
        @retry="retryLoadFiles"
        @item-dbl-click="handleItemDoubleClick"
        @item-select="handleItemSelection"
        @sort="handleSort"
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
import { ref, computed, onMounted } from 'vue'
import { useFileManager } from '@/composables/useFileManager'
import FileToolbar from './FileToolbar.vue'
import FileSidebar from './FileSidebar.vue'
import FileView from './FileView.vue'
import FileManagerModals from './FileManagerModals.vue'

const fileManager = useFileManager()
const modalsRef = ref()

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
  retryLoadFiles,
  deleteSelectedFiles,
  navigate,
  handleItemDoubleClick,
  handleItemClick,
  breadcrumbs,
  filteredItems,
  emptyStateMessage,
  itemToRename
} = fileManager

const treeData = computed(() => [
  {
    title: 'Files',
    loading: fileStore.state.isLoading,
    error: fileStore.state.error,
    items: filteredItems.value.filter(item => item.type === 'folder')
  }
])

async function loadChildren(node) {
  try {
    const res = await fileStore.fetchFolderContents(node.path)
    // Normalize to an array: support either Array or { items: Array }
    const items = Array.isArray(res) ? res : (Array.isArray(res?.items) ? res.items : [])
    return items
  } catch (error) {
    console.error('Failed to load children for:', node.path, error)
    return []
  }
}

function showCreateFolderModal() {
  modalsRef.value?.showNewFolderModal()
}

function handleItemSelection(selection) {
  handleItemClick(selection.item, selection.event || {})
}

async function handleBreadcrumbNavigation(item) {
  await navigate(item)
}

function handleRename(data) {
  console.log('Rename:', data)
}

function handleCreateFolder(name) {
  console.log('Create folder:', name)
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
