<template>
  <div class="card flex-fill files-root">
    <!-- Topbar -->
    <div class="topbar d-flex justify-content-between align-items-center py-1 px-1 bg-body gap-1">
      <nav class="d-flex align-items-center flex-fill gap-1" role="toolbar">
        <button type="button" class="btn btn-sm" @click="toggleSidebar"
          :aria-label="isSidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'">
          <Icon icon="mdi:file-tree" width="20" height="20" />
          <span class="d-none d-lg-inline ms-1">Toggle Sidebar</span>
        </button>

        <button type="button" class="btn btn-sm" @click="createNewFolder" :disabled="isLoading"
          aria-label="Create new folder">
          <Icon icon="mdi:folder-plus" width="20" height="20" class="me-1" />
          New Folder
        </button>

        <!-- File operations (show when files are selected) -->
        <div v-if="fileStore.selectedCount > 0" class="d-flex gap-1">
          <button type="button" class="btn btn-sm btn-outline-danger" @click="deleteSelectedFiles" :disabled="isLoading"
            :aria-label="`Delete ${fileStore.selectedCount} selected files`">
            <Icon icon="mdi:delete" width="16" height="16" />
            Delete ({{ fileStore.selectedCount }})
          </button>

          <button type="button" class="btn btn-sm btn-outline-secondary" @click="fileStore.clearSelection"
            aria-label="Clear selection">
            <Icon icon="mdi:close" width="16" height="16" />
            Clear
          </button>
        </div>

        <!-- Upload button -->
        <label class="btn btn-sm btn-outline-primary position-relative">
          <Icon icon="mdi:upload" width="20" height="20" class="me-1" />
          Upload
          <input ref="fileInput" type="file" multiple class="d-none" @change="handleFileUpload"
            :disabled="isLoading || fileStore.isUploading" />
          <div v-if="fileStore.isUploading" class="position-absolute top-0 start-0 h-100 bg-primary opacity-25"
            :style="`width: ${fileStore.uploadProgress}%`"></div>
        </label>

        <div class="ms-auto position-relative">
          <button type="button" class="btn btn-sm" data-bs-toggle="dropdown" aria-expanded="false"
            aria-label="Sort options">
            <Icon icon="mdi:sort-variant" width="20" height="20" />
            <span class="d-none d-lg-inline ms-1">Sort By</span>
          </button>
          <ul class="dropdown-menu dropdown-menu-end">
            <li v-for="option in SORT_OPTIONS" :key="option.value">
              <button type="button" class="dropdown-item d-flex align-items-center justify-content-between"
                @click="handleSort(option.value)">
                {{ option.label }}
                <Icon v-if="sortKey === option.value" :icon="sortDir === 'asc' ? 'mdi:arrow-up' : 'mdi:arrow-down'"
                  width="16" height="16" />
              </button>
            </li>
          </ul>
        </div>
      </nav>

      <nav class="nav nav-segmented nav-sm" role="tablist">
        <button v-for="mode in VIEW_MODES" :key="mode.value" type="button" class="nav-link"
          :class="{ active: viewMode === mode.value }" :aria-selected="viewMode === mode.value"
          @click="setViewMode(mode.value)" :title="mode.title">
          <Icon :icon="mode.icon" width="20" height="20" />
          <span class="d-none d-lg-inline ms-1">{{ mode.label }}</span>
        </button>
      </nav>
    </div>

    <div class="d-flex border-top splitter-container flex-fill position-relative">
      <!-- Sidebar -->
      <aside ref="sidebar" class="border-end sidebar" :class="{ 'w-0': isSidebarCollapsed }" :style="sidebarStyle"
        :aria-hidden="isSidebarCollapsed">
        <div class="col-docs flex-fill p-1">
          <nav id="menu" ref="treeRoot">
            <nav class="nav nav-vertical" v-for="group in treeData" :key="group.title">
              <TreeNode v-for="node in group.items" :key="node.path" :node="node" :selectedPath="fileStore.selectedPath"
                :loadChildren="loadChildren" @nodeSelect="handleNodeSelect" @nodeToggle="handleNodeToggle" />
            </nav>
          </nav>
        </div>
      </aside>

      <!-- Draggable Splitter -->
      <div v-show="!isSidebarCollapsed" class="splitter" @mousedown="startDragging" role="separator"
        aria-label="Resize sidebar"></div>

      <!-- Content -->
      <main class="resizable-grid border-start">
        <div class="nav-scroller bg-body p-1 border-bottom">
          <nav class="nav me-1" aria-label="Secondary navigation">
            <nav aria-label="Breadcrumb">
              <ol class="breadcrumb breadcrumb-muted breadcrumb-arrows ps-2">
                <li v-for="(item, idx) in breadcrumbs" :key="item.path || idx" class="breadcrumb-item"
                  :class="{ active: idx === breadcrumbs.length - 1 }">
                  <button v-if="item.isClickable && idx < breadcrumbs.length - 1" type="button"
                    class="btn btn-link p-0 m-0 border-0" :title="item.name" :aria-label="`Navigate to ${item.name}`"
                    @click="handleItemDoubleClick(item)">
                    {{ item.name }}
                  </button>
                  <span v-else :title="item.name">{{ item.name }}</span>
                </li>
              </ol>
            </nav>
          </nav>
          <div class="input-icon w-25 position-relative">
            <input ref="searchInput" v-model="search" type="text" class="form-control form-control-sm shadow-none"
              placeholder="Search in files…" @input="debouncedSearch" @keydown.escape="clearSearch"
              aria-label="Search files and folders" />
            <span class="input-icon-addon" aria-hidden="true">
              <Icon v-if="!search" icon="mdi:magnify" width="20" height="20" />
              <button v-else type="button" class="btn btn-sm p-0 border-0 bg-transparent" @click="clearSearch"
                aria-label="Clear search">
                <Icon icon="mdi:close" width="16" height="16" />
              </button>
            </span>
          </div>
        </div>

        <!-- File View -->
        <div class="d-flex flex-column position-relative file-view">
          <div class="content-scroll overflow-auto flex-grow-1">

            <!-- Loading State -->
            <div v-if="isLoading" class="text-center text-muted py-6">
              <div class="spinner-border spinner-border-sm mb-2" role="status">
                <span class="visually-hidden">Loading...</span>
              </div>
              <div>Loading files...</div>
            </div>

            <!-- Error State -->
            <div v-else-if="fileStore.error" class="text-center text-danger py-6">
              <Icon icon="mdi:alert-circle" class="empty-icon mb-2" />
              <div>{{ fileStore.error }}</div>
              <button type="button" class="btn btn-sm btn-outline-primary mt-2" @click="retryLoadFiles">
                <Icon icon="mdi:refresh" width="16" height="16" class="me-1" />
                Try Again
              </button>
            </div>

            <!-- Empty State -->
            <div v-else-if="filteredItems.length === 0" class="text-center text-muted py-6">
              <Icon icon="tabler:folder-off" class="empty-icon mb-2" />
              <div>{{ emptyStateMessage }}</div>
              <div v-if="search" class="small mt-1">
                <button type="button" class="btn btn-link btn-sm p-0" @click="clearSearch">
                  Clear search to see all files
                </button>
              </div>
            </div>

            <!-- Upload Progress Overlay -->
            <div v-if="fileStore.isUploading" class="upload-overlay">
              <div class="card shadow-lg">
                <div class="card-body text-center">
                  <div class="mb-2">
                    <Icon icon="mdi:upload" width="32" height="32" class="text-primary" />
                  </div>
                  <div class="mb-2">Uploading files...</div>
                  <div class="progress mb-2">
                    <div class="progress-bar progress-bar-striped progress-bar-animated"
                      :style="`width: ${fileStore.uploadProgress}%`"></div>
                  </div>
                  <div class="small text-muted">{{ fileStore.uploadProgress }}% complete</div>
                </div>
              </div>
            </div>

            <!-- Grid View -->
            <template v-else-if="viewMode === 'grid'">
              <div class="explorer-grid" @click="handleGridClick" @keydown="handleKeyDown" tabindex="0" role="grid"
                :aria-label="`File explorer with ${filteredItems.length} items`">
                <div v-for="item in filteredItems" :key="item.path" class="explorer-item"
                  :class="{ 'selected': isSelected(item) }" :tabindex="isSelected(item) ? 0 : -1" role="gridcell"
                  :aria-selected="isSelected(item)"
                  :aria-label="`${item.type === 'folder' ? 'Folder' : 'File'}: ${item.name}`"
                  @click="handleItemClick(item, $event)" @dblclick="handleItemDoubleClick(item)"
                  @contextmenu="handleContextMenu(item, $event)" @keydown="handleItemKeyDown(item, $event)">
                  <div class="icon-wrap">
                    <Icon :icon="item.icon" class="explorer-icon" :class="item.iconClass" />
                  </div>
                  <div class="explorer-label" :title="item.name">{{ item.name }}</div>
                </div>
              </div>
            </template>

            <!-- List View -->
            <template v-else>
              <div class="table-responsive">
                <table class="table table-hover table-nowrap" @keydown="handleKeyDown" tabindex="0" role="grid"
                  :aria-label="`File list with ${filteredItems.length} items`">
                  <thead>
                    <tr role="row">
                      <th>
                        <div class="d-flex">
                          <input type="checkbox" class="form-check-input me-2" :checked="isAllSelected"
                            :indeterminate="isSomeSelected" @change="toggleSelectAll" aria-label="Select all files" />
                          <button class="btn btn-sm btn-action p-0" @click="handleSort('name')"
                            :aria-label="getSortAriaLabel('name')">
                            Name
                            <Icon v-if="sortKey === 'name'"
                              :icon="sortDir === 'asc' ? 'mdi:arrow-up' : 'mdi:arrow-down'" width="16" height="16"
                              class="ms-1" />
                          </button>
                        </div>

                      </th>
                      <th class="w-0">
                        <button class="btn btn-sm btn-action p-0" @click="handleSort('modified')"
                          :aria-label="getSortAriaLabel('modified')">
                          Modified
                          <Icon v-if="sortKey === 'modified'"
                            :icon="sortDir === 'asc' ? 'mdi:arrow-up' : 'mdi:arrow-down'" width="16" height="16"
                            class="ms-1" />
                        </button>
                      </th>
                      <th class="text-end w-0">
                        <button class="btn btn-sm btn-action p-0" @click="handleSort('size')"
                          :aria-label="getSortAriaLabel('size')">
                          Size
                          <Icon v-if="sortKey === 'size'" :icon="sortDir === 'asc' ? 'mdi:arrow-up' : 'mdi:arrow-down'"
                            width="16" height="16" class="ms-1" />
                        </button>
                      </th>
                      <th class="w-0"></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="item in filteredItems" :key="item.path" class="cursor-pointer"
                      :class="{ 'table-active': isSelected(item) }" :tabindex="isSelected(item) ? 0 : -1" role="row"
                      :aria-selected="isSelected(item)" @click="handleItemClick(item, $event)"
                      @dblclick="handleItemDoubleClick(item)" @contextmenu="handleContextMenu(item, $event)"
                      @keydown="handleItemKeyDown(item, $event)">
                      <td>
                        <input type="checkbox" class="form-check-input me-2" :checked="isSelected(item)"
                          @change="toggleItemSelection(item)" @click.stop :aria-label="`Select ${item.name}`" />
                        <Icon :icon="item.icon" :class="item.iconClass + ' me-2'" />
                        <span :title="item.name">{{ item.name }}</span>
                      </td>
                      <td class="w-0 text-muted">{{ getDateFormatted(item.updated) }}</td>
                      <td class="text-end text-muted">{{ item.size }}</td>
                      <td class="w-0">
                        <div class="dropdown">
                          <button class="btn btn-sm btn-ghost-secondary" type="button" data-bs-toggle="dropdown"
                            :aria-label="`Actions for ${item.name}`">
                            <Icon icon="mdi:dots-vertical" width="16" height="16" />
                          </button>
                          <ul class="dropdown-menu dropdown-menu-end">
                            <li v-if="item.type === 'folder'">
                              <button class="dropdown-item" @click="openFolder(item)">
                                <Icon icon="mdi:folder-open" class="me-2" width="16" height="16" />
                                Open
                              </button>
                            </li>
                            <li>
                              <button class="dropdown-item" @click="startRename(item)">
                                <Icon icon="mdi:rename-box" class="me-2" width="16" height="16" />
                                Rename
                              </button>
                            </li>
                            <li>
                              <hr class="dropdown-divider">
                            </li>
                            <li>
                              <button class="dropdown-item text-danger" @click="deleteItem(item)">
                                <Icon icon="mdi:delete" class="me-2" width="16" height="16" />
                                Delete
                              </button>
                            </li>
                          </ul>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </template>
          </div>
        </div>
      </main>
    </div>

    <!-- Rename Modal -->
    <div class="modal fade" id="renameModal" ref="renameModal" tabindex="-1" aria-labelledby="renameModalLabel"
      aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="renameModalLabel">Rename {{ itemToRename?.name }}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <form @submit.prevent="confirmRename">
            <div class="modal-body">
              <div class="mb-3">
                <label for="newFileName" class="form-label">New name</label>
                <input ref="renameInput" type="text" class="form-control" id="newFileName" v-model="newFileName"
                  :placeholder="itemToRename?.name" required />
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="submit" class="btn btn-primary" :disabled="!newFileName?.trim()">
                Rename
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- New Folder Modal -->
    <div class="modal fade" id="newFolderModal" ref="newFolderModal" tabindex="-1" aria-labelledby="newFolderModalLabel"
      aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="newFolderModalLabel">Create New Folder</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <form @submit.prevent="confirmCreateFolder">
            <div class="modal-body">
              <div class="mb-3">
                <label for="folderName" class="form-label">Folder name</label>
                <input ref="folderNameInput" type="text" class="form-control" id="folderName" v-model="newFolderName"
                  placeholder="Enter folder name" required />
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="submit" class="btn btn-primary" :disabled="!newFolderName?.trim()">
                Create
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { debounce } from 'lodash-es'
import TreeNode from './TreeNode.vue'
import { Icon } from '@iconify/vue'
import { useFileStore } from '@/stores/files'
import { useFiles } from '@/composables/useFiles'
import { SORT_OPTIONS, VIEW_MODES, MIN_SIDEBAR_WIDTH, DEFAULT_SIDEBAR_WIDTH } from '@/constants/files'

// Store
const fileStore = useFileStore()
const { getFileIcon, getFileColor, getFileComparator, getDateFormatted } = useFiles()

// Template refs
const sidebar = ref(null)
const treeRoot = ref(null)
const searchInput = ref(null)
const fileInput = ref(null)
const renameModal = ref(null)
const newFolderModal = ref(null)
const renameInput = ref(null)
const folderNameInput = ref(null)

// Reactive state
const viewMode = ref('grid')
const sortKey = ref('name')
const sortDir = ref('asc')
const search = ref('')
const isSidebarCollapsed = ref(false)
const sidebarWidth = ref(DEFAULT_SIDEBAR_WIDTH)
const isLoading = ref(false)

// Modal state
const itemToRename = ref(null)
const newFileName = ref('')
const newFolderName = ref('')

// Dragging state
let isDragging = false
let dragStartX = 0
let initialWidth = 0

// Computed properties
const sidebarStyle = computed(() => ({
  width: isSidebarCollapsed.value ? '0' : `${sidebarWidth.value}px`
}))

const breadcrumbs = computed(() => {
  return fileStore.computedBreadcrumbs
})

const treeData = computed(() => [{
  title: 'Files',
  icon: 'mdi:home',
  items: fileStore.files.map(f => ({
    name: f.name,
    path: f.path,
    type: f.type,
    hasSubfolder: f.hasSubfolder,
    children: f.children ?? (f.type === 'folder' ? null : undefined)
  }))
}])

const filteredItems = computed(() => {
  const items = fileStore.children.length === 0 ? fileStore.files : fileStore.children
  const query = search.value.toLowerCase().trim()

  let filtered = items
  if (query) {
    filtered = items.filter(item => item.name.toLowerCase().includes(query))
  }

  return filtered
    .sort(getFileComparator(sortKey.value, sortDir.value))
    .map(item => ({
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
    filteredItems.value.every(item => isSelected(item))
})

const isSomeSelected = computed(() => {
  return filteredItems.value.some(item => isSelected(item)) && !isAllSelected.value
})

const getSortAriaLabel = (column) => {
  const currentSort = sortKey.value === column
  const direction = currentSort && sortDir.value === 'asc' ? 'descending' : 'ascending'
  return `Sort by ${column} ${direction}`
}

// Debounced search
const debouncedSearch = debounce(() => {
  // Search logic is handled by the filteredItems computed property
  // This debounce just prevents excessive reactivity updates
}, 300)

// Helper: Scroll selected item into view (grid or list)
const scrollSelectedIntoView = async () => {
  await nextTick()
  const target =
    document.querySelector('.explorer-item.selected') ||
    document.querySelector('tbody tr.table-active')

  if (target && typeof target.scrollIntoView === 'function') {
    target.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
  }
}

// Helper: Scroll selected item in sidebar (tree) into view
const scrollSelectedInSidebarIntoView = async () => {
  await nextTick()
  const container = treeRoot.value || document.getElementById('menu')
  if (!container) return

  const selPath = fileStore.selectedPath
  let target = null
  if (selPath) {
    try {
      const escaped = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(selPath) : selPath.replace(/"/g, '\\"')
      target = container.querySelector(`[data-path="${escaped}"]`)
    } catch (_) {
      // ignore and fall back below
    }
  }

  if (!target) {
    target = container.querySelector('.active, .selected, [aria-current="true"], [aria-selected="true"]')
  }

  if (target && typeof target.scrollIntoView === 'function') {
    target.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
  }
}

// Helper: dispatch tree open event for a path
const dispatchOpenPath = (path) => {
  const el = treeRoot.value || document.getElementById('menu')
  el?.dispatchEvent(new CustomEvent('tree:openPath', { detail: { path }, bubbles: true }))
}

// Helper: unify path selection + scrolling in one place
const openPathAndScroll = async (path) => {
  fileStore.selectedPath = path
  dispatchOpenPath(path)
  await scrollSelectedIntoView()
  await scrollSelectedInSidebarIntoView()
}

// Methods
const isSelected = (item) => {
  return fileStore.selectedFiles.some(selected => selected.path === item.path)
}

const toggleSidebar = () => {
  isSidebarCollapsed.value = !isSidebarCollapsed.value
}

const setViewMode = (mode) => {
  viewMode.value = mode
  fileStore.clearSelection()
  scrollSelectedIntoView()
}

const handleSort = (key) => {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = 'asc'
  }
}

const clearSearch = () => {
  search.value = ''
  searchInput.value?.focus()
}

const focusSearch = () => {
  searchInput.value?.focus()
}

const retryLoadFiles = async () => {
  try {
    await fileStore.refreshFiles()
  } catch (error) {
    console.error('Retry failed:', error)
  }
}

// File operations
const handleItemClick = (item, event) => {
  if (event.ctrlKey || event.metaKey) {
    fileStore.toggleFileSelection(item)
    scrollSelectedIntoView()
  } else if (event.shiftKey && fileStore.selectedFiles.length > 0) {
    // Implement range selection
    selectRange(item)
    scrollSelectedIntoView()
  } else {
    fileStore.clearSelection()
    fileStore.selectFile(item)
    scrollSelectedIntoView()
  }
}

const handleItemDoubleClick = async (item) => {
  if (item.type === 'folder' || item.isClickable) {
    await openFolder(item)
  } else {
    // Handle file opening/preview
    console.log('Open file:', item)
  }
}

const handleContextMenu = (item, event) => {
  event.preventDefault()
  // Implement context menu
  console.log('Context menu for:', item)
}

const handleItemKeyDown = (item, event) => {
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

const handleGridClick = (event) => {
  // Clear selection when clicking on empty space
  if (event.target.classList.contains('explorer-grid')) {
    fileStore.clearSelection()
  }
}

const selectRange = (endItem) => {
  const startIndex = filteredItems.value.findIndex(item =>
    fileStore.selectedFiles.some(selected => selected.path === item.path)
  )
  const endIndex = filteredItems.value.findIndex(item => item.path === endItem.path)

  if (startIndex !== -1) {
    const minIndex = Math.min(startIndex, endIndex)
    const maxIndex = Math.max(startIndex, endIndex)

    fileStore.clearSelection()
    for (let i = minIndex; i <= maxIndex; i++) {
      fileStore.selectFile(filteredItems.value[i])
    }
  }
}

const toggleItemSelection = (item) => {
  fileStore.toggleFileSelection(item)
}

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    fileStore.clearSelection()
  } else {
    fileStore.selectAll()
  }
}

const openFolder = async (folder) => {
  isLoading.value = true
  try {
    await loadChildren(folder)
    await openPathAndScroll(folder.path)
  } finally {
    isLoading.value = false
  }
}

const navigateToBreadcrumb = async (path) => {
  try {
    await fileStore.navigateToPath(path)
    await openPathAndScroll(path)
  } catch (error) {
    console.error('Navigation failed:', error)
  }
}

// File upload
const handleFileUpload = async (event) => {
  const files = Array.from(event.target.files)
  if (files.length === 0) return

  const formData = new FormData()
  files.forEach(file => {
    formData.append('files', file)
  })

  try {
    await fileStore.uploadFile(formData, (progress) => {
      // Progress is handled by the store
    })
    // Clear the input
    event.target.value = ''
  } catch (error) {
    console.error('Upload failed:', error)
  }
}

// Modal operations
const createNewFolder = () => {
  newFolderName.value = ''
  const modal = new window.bootstrap.Modal(newFolderModal.value)
  modal.show()

  nextTick(() => {
    folderNameInput.value?.focus()
  })
}

const confirmCreateFolder = async () => {
  const name = newFolderName.value.trim()
  if (!name) return

  try {
    await fileStore.createFolder(name)
    const modal = window.bootstrap.Modal.getInstance(newFolderModal.value)
    modal.hide()
  } catch (error) {
    console.error('Create folder failed:', error)
  }
}

const startRename = (item) => {
  itemToRename.value = item
  newFileName.value = item.name

  const modal = new window.bootstrap.Modal(renameModal.value)
  modal.show()

  nextTick(() => {
    renameInput.value?.focus()
    renameInput.value?.select()
  })
}

const confirmRename = async () => {
  const oldName = itemToRename.value?.name
  const name = newFileName.value.trim()

  if (!oldName || !name || oldName === name) return

  try {
    await fileStore.renameFile(oldName, name)
    const modal = window.bootstrap.Modal.getInstance(renameModal.value)
    modal.hide()
  } catch (error) {
    console.error('Rename failed:', error)
  }
}

const deleteItem = async (item) => {
  if (!confirm(`Are you sure you want to delete "${item.name}"?`)) {
    return
  }

  try {
    await fileStore.deleteFiles([item.name])
  } catch (error) {
    console.error('Delete failed:', error)
  }
}

const deleteSelectedFiles = async () => {
  const fileNames = fileStore.selectedFiles.map(f => f.name)
  const count = fileNames.length

  if (!confirm(`Are you sure you want to delete ${count} selected file${count > 1 ? 's' : ''}?`)) {
    return
  }

  try {
    await fileStore.deleteFiles(fileNames)
  } catch (error) {
    console.error('Delete failed:', error)
  }
}

// Keyboard shortcuts
const handleKeyDown = (event) => {
  // Only handle if no modal is open and not typing in input
  if (document.querySelector('.modal.show') ||
    event.target.tagName === 'INPUT' ||
    event.target.tagName === 'TEXTAREA') {
    return
  }

  if (event.ctrlKey || event.metaKey) {
    switch (event.key) {
      case 'a':
        event.preventDefault()
        fileStore.selectAll()
        break
      case 'n':
        event.preventDefault()
        createNewFolder()
        break
      case 'f':
        event.preventDefault()
        focusSearch()
        break
      case 'r':
        event.preventDefault()
        fileStore.refreshFiles()
        break
    }
  } else {
    switch (event.key) {
      case 'Delete':
        if (fileStore.selectedCount > 0) {
          event.preventDefault()
          deleteSelectedFiles()
        }
        break
      case 'F2':
        if (fileStore.selectedCount === 1) {
          event.preventDefault()
          startRename(fileStore.selectedFiles[0])
        }
        break
      case 'Escape':
        fileStore.clearSelection()
        break
    }
  }
}

// Sidebar resizing
const startDragging = (e) => {
  isDragging = true
  dragStartX = e.clientX
  initialWidth = sidebarWidth.value

  document.addEventListener('mousemove', onDrag, { passive: true })
  document.addEventListener('mouseup', stopDragging, { once: true })
  document.body.style.userSelect = 'none'
  document.body.style.cursor = 'col-resize'

  e.preventDefault()
}

const onDrag = (e) => {
  if (!isDragging) return

  const deltaX = e.clientX - dragStartX
  const newWidth = initialWidth + deltaX
  sidebarWidth.value = Math.max(MIN_SIDEBAR_WIDTH, Math.min(600, newWidth))
}

const stopDragging = () => {
  if (!isDragging) return

  isDragging = false
  document.removeEventListener('mousemove', onDrag)
  document.body.style.userSelect = ''
  document.body.style.cursor = ''
}

// Tree navigation
const loadChildren = async (node) => {
  try {
    const children = await fileStore.fetchFolderChildren(node.path)
    return children.map(child => ({
      ...child,
      children: child.type === 'folder' ? null : undefined
    }))
  } catch (error) {
    console.error('Error loading children:', error)
    return []
  }
}

const handleNodeSelect = async (node) => {
  if (node.type === 'folder') {
    await openFolder(node)
    await scrollSelectedInSidebarIntoView()
  }
}

const handleNodeToggle = (data) => {
  // Handle node toggle events if needed
  console.log('Node toggled:', data)
}

// Lifecycle hooks
onMounted(async () => {
  isLoading.value = true
  try {
    await fileStore.fetchFiles()

    // Set up indeterminate checkbox state watcher
    nextTick(() => {
      const selectAllCheckbox = document.querySelector('thead .form-check-input')
      if (selectAllCheckbox) {
        selectAllCheckbox.indeterminate = isSomeSelected.value
      }
    })
  } catch (error) {
    console.error('Error loading files:', error)
  } finally {
    isLoading.value = false
  }
})

onUnmounted(() => {
  if (isDragging) {
    stopDragging()
  }
})
</script>

<style scoped>
/* Improved styles with better performance and accessibility */
/* Component-scoped root ensures viewport height for internal scrolling */
.files-root {
  display: flex;
  flex-direction: column;
  min-height: 0;
  /* allow nested flex children to shrink */
  height: 100vh;
  /* give the component a firm height baseline */
}

/* Defensive: allow children to shrink but do not cap height with max-height */
.files-root .splitter-container,
.files-root .resizable-grid,
.files-root .file-view {
  min-height: 0;
}

/* Improved styles with better performance and accessibility */
.file-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  /* allow inner scroller to shrink */
  overflow: hidden;
  /* delegate scroll to .content-scroll */
}

.resizable-grid {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  /* single scroll area lives in .content-scroll */
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
}

.content-scroll {
  flex: 1 1 auto;
  min-height: 0;
  /* critical so flex item can shrink and allow scrolling */
  overflow: auto;
  padding-bottom: 2.5rem;
  /* extra breathing room at the bottom */
}

.splitter-container {
  display: flex;
  position: relative;
  overflow: hidden;
  flex: 1 1 auto;
  min-height: 0;
  /* allow children to scroll */
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

.nav-scroller {
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  z-index: 2;
  overflow-y: hidden;
  gap: 1rem;
  flex: 0 0 auto;
}

.sidebar {
  min-width: 0;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  will-change: width;
  flex-shrink: 0;
}

.sidebar.w-0 {
  width: 0 !important;
  min-width: 0 !important;
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
  max-height: 100vh;
}

.breadcrumb,
.breadcrumb-item {
  display: inline-flex;
  align-items: center;
  margin-bottom: 0;
}

.breadcrumb-item {
  min-width: 0;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.8rem;
  font-weight: 300;
}

.breadcrumb-item .btn-link {
  color: var(--tblr-primary);
  text-decoration: none;
  font-size: inherit;
  font-weight: inherit;
  min-width: 0;
}

.breadcrumb-item .btn-link:hover {
  text-decoration: underline;
}

.breadcrumb-item.active {
  font-weight: 400;
  color: var(--tblr-dark);
}

.explorer-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 0.75rem;
  padding: 1rem;
  background: transparent;
}

/* Ensure last row is fully visible above bottom edge */
.explorer-grid {
  padding-bottom: 2.5rem;
}

.explorer-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  outline: none;
  cursor: pointer;
  transition: all 0.15s ease;
  border-radius: 8px;
  padding: 12px 8px 8px;
  position: relative;
  contain: layout style paint;
}

.explorer-item:focus,
.explorer-item:hover {
  background-color: var(--tblr-gray-50);
  transform: translateY(-1px);
}

.explorer-item.selected {
  background-color: var(--tblr-primary-lt);
}

.explorer-item:focus {
  outline: 2px solid var(--tblr-primary);
  outline-offset: 2px;
}

.icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 64px;
  width: 64px;
  margin-bottom: 8px;
}

.explorer-icon {
  font-size: 48px;
  width: 48px;
  height: 48px;
  display: block;
  transition: transform 0.15s ease;
}

.explorer-item:hover .explorer-icon {
  transform: scale(1.05);
}

.explorer-label {
  width: 100%;
  text-align: center;
  font-size: 0.875rem;
  font-weight: 400;
  color: var(--tblr-dark);
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
  line-height: 1.3;
  user-select: none;
}

/* File type colors */
.folder {
  color: #f59e0b;
}

.xml {
  color: #10b981;
}

.rtf {
  color: #ef4444;
}

.txt {
  color: #3b82f6;
}

.file {
  color: var(--tblr-primary);
}

.empty-icon {
  font-size: 64px;
  color: var(--tblr-gray-300);
  margin-bottom: 1rem;
}

.btn-action {
  background: none;
  border: none;
  color: inherit;
  text-decoration: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: color 0.15s ease;
}

.btn-action:hover,
.btn-action:focus {
  color: var(--tblr-primary);
}

.table-responsive {
  border-radius: 8px;
  overflow: hidden;
}

/* Ensure last table row has room at bottom */


.table th {
  border-top: none;
  font-weight: 500;
  font-size: 0.875rem;
  background-color: var(--tblr-gray-50);
}

.table td {
  font-size: 0.875rem;
  vertical-align: middle;
}

.table-hover tbody tr:hover {
  background-color: var(--tblr-gray-50);
}

.table-active {
  background-color: var(--tblr-primary-lt) !important;
}

.spinner-border-sm {
  width: 1.5rem;
  height: 1.5rem;
}

/* Focus improvements */
.nav-link:focus {
  outline: 2px solid var(--tblr-primary);
  outline-offset: 2px;
}

.form-control:focus {
  border-color: var(--tblr-primary);
  box-shadow: 0 0 0 0.2rem rgba(var(--tblr-primary-rgb), 0.25);
}


/* Scrollbar styling */
.content-scroll::-webkit-scrollbar,
#menu::-webkit-scrollbar {
  width: 8px;
}

.content-scroll::-webkit-scrollbar-track,
#menu::-webkit-scrollbar-track {
  background: var(--tblr-gray-50);
}

.content-scroll::-webkit-scrollbar-thumb,
#menu::-webkit-scrollbar-thumb {
  background: var(--tblr-gray-300);
  border-radius: 4px;
}

.content-scroll::-webkit-scrollbar-thumb:hover,
#menu::-webkit-scrollbar-thumb:hover {
  background: var(--tblr-gray-400);
}

/* Animation for loading states */
@keyframes fadeIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

.explorer-grid,
.table-responsive {
  animation: fadeIn 0.3s ease-in-out;
}
</style>