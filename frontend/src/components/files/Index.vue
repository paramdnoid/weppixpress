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
        @node-select="navigate"
        @node-toggle="() => {}"
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
        @navigate="handleBreadcrumbNavigation"
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
      @rename="() => {}"
    />

    <NewFolderModal
      ref="newFolderModal"
      :is-loading="fileStore.state.isLoading"
      @create="() => {}"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import FileToolbar from './FileToolbar.vue'
import FileSidebar from './FileSidebar.vue'
import FileView from './FileView.vue'
import RenameModal from './RenameModal.vue'
import NewFolderModal from './NewFolderModal.vue'
import { useFileManager } from '@/composables/useFileManager'

// Composables
const fileManager = useFileManager()

// Destructure for template usage
const {
  fileStore,
  viewMode,
  sortKey,
  sortDir,
  search,
  isLoading,
  itemToRename,
  breadcrumbs,
  filteredItems,
  emptyStateMessage,
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
  handleItemClick
} = fileManager

// Tree data for sidebar - create a simple structure from current items
const treeData = computed(() => [
  {
    title: 'Files',
    loading: fileStore.state.isLoading,
    error: fileStore.state.error,
    items: filteredItems.value.filter(item => item.type === 'folder')
  }
])

// Function to load tree children
async function loadChildren(node: any) {
  try {
    await fileStore.fetchFolderContents(node.path)
  } catch (error) {
    console.error('Failed to load children for:', node.path, error)
  }
}

const emit = defineEmits<{
  itemSelect: [selection: any]
}>()

// Template refs
const renameModal = ref<InstanceType<typeof RenameModal> | null>(null)
const newFolderModal = ref<InstanceType<typeof NewFolderModal> | null>(null)

// Modal helpers
function showCreateFolderModal() {
  newFolderModal.value?.show()
}

function handleItemSelection(selection: any) {
  emit('itemSelect', selection)
}

async function handleBreadcrumbNavigation(item: any) {
  console.log('Breadcrumb navigation clicked:', item)
  await navigate(item)
}




// Lifecycle hooks
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