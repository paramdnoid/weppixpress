<template>
  <div class="card flex-fill">
    <!-- Topbar -->
    <div class="topbar d-flex justify-content-between align-items-center py-1 px-1 bg-body gap-1">
      <nav class="d-flex align-items-center flex-fill gap-1" role="toolbar">
        <button 
          type="button" 
          class="btn btn-sm" 
          @click="toggleSidebar"
          :aria-label="isSidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'"
        >
          <Icon icon="mdi:file-tree" width="20" height="20" />
          <span class="d-none d-lg-inline ms-1">Toggle Sidebar</span>
        </button>
        <button 
          type="button" 
          class="btn btn-sm"
          @click="createNewFolder"
          aria-label="Create new folder"
        >
          <Icon icon="mdi:folder-plus" width="20" height="20" class="me-1" />
          New Folder
        </button>
        <div class="ms-auto position-relative">
          <button 
            type="button" 
            class="btn btn-sm" 
            data-bs-toggle="dropdown" 
            aria-expanded="false"
            aria-label="Sort options"
          >
            <Icon icon="mdi:sort-variant" width="20" height="20" />
            <span class="d-none d-lg-inline ms-1">Sort By</span>
          </button>
          <ul class="dropdown-menu dropdown-menu-end">
            <li v-for="option in SORT_OPTIONS" :key="option.value">
              <button 
                type="button"
                class="dropdown-item d-flex align-items-center justify-content-between" 
                @click="handleSort(option.value)"
              >
                {{ option.label }}
                <Icon 
                  v-if="sortKey === option.value" 
                  :icon="sortDir === 'asc' ? 'mdi:arrow-up' : 'mdi:arrow-down'"
                  width="16" 
                  height="16" 
                />
              </button>
            </li>
          </ul>
        </div>
      </nav>

      <nav class="nav nav-segmented nav-sm" role="tablist">
        <button 
          v-for="mode in VIEW_MODES" 
          :key="mode.value" 
          type="button" 
          class="nav-link"
          :class="{ active: viewMode === mode.value }" 
          :aria-selected="viewMode === mode.value"
          @click="setViewMode(mode.value)" 
          :title="mode.title"
        >
          <Icon :icon="mode.icon" width="20" height="20" />
          <span class="d-none d-lg-inline ms-1">{{ mode.label }}</span>
        </button>
      </nav>
    </div>

    <div class="d-flex border-top splitter-container flex-fill position-relative">
      <!-- Sidebar -->
      <aside 
        ref="sidebar" 
        class="border-end sidebar" 
        :class="{ 'w-0': isSidebarCollapsed }" 
        :style="sidebarStyle"
        :aria-hidden="isSidebarCollapsed"
      >
        <div class="col-docs flex-fill p-1">
          <nav id="menu" ref="treeRoot">
            <nav class="nav nav-vertical" v-for="group in treeData" :key="group.title">
              <TreeNode 
                v-for="node in group.items" 
                :key="node.path" 
                :node="node" 
                :selectedPath="fileStore.selectedPath" 
                :loadChildren="loadChildren" 
              />
            </nav>
          </nav>
        </div>
      </aside>

      <!-- Draggable Splitter -->
      <div 
        v-show="!isSidebarCollapsed" 
        class="splitter" 
        @mousedown="startDragging"
        role="separator"
        aria-label="Resize sidebar"
      ></div>

      <!-- Content -->
      <main class="resizable-grid border-start">
        <div class="nav-scroller bg-body p-1 border-bottom">
          <nav class="nav me-1" aria-label="Secondary navigation">
            <nav aria-label="Breadcrumb">
              <ol class="breadcrumb breadcrumb-muted breadcrumb-arrows ps-2">
                <li 
                  v-for="(item, idx) in breadcrumbs" 
                  :key="item.path || idx" 
                  class="breadcrumb-item"
                  :class="{ active: isLastBreadcrumb(idx) }" 
                  :aria-current="isLastBreadcrumb(idx) ? 'page' : null"
                >
                  <template v-if="item.isClickable">
                    <button 
                      type="button"
                      class="btn btn-link p-0 m-0 border-0" 
                      :title="item.name" 
                      @click="navigateTo(item)"
                      :aria-label="`Navigate to ${item.name}`"
                    >
                      <Icon v-if="idx === 0" icon="mdi:home" width="16" height="16" class="m-0" />
                      <template v-else>{{ item.name }}</template>
                    </button>
                  </template>
                  <template v-else>
                    <span :title="item.name">{{ item.name }}</span>
                  </template>
                </li>
              </ol>
            </nav>
          </nav>
          <div class="input-icon w-25">
            <input 
              v-model="search" 
              type="text" 
              class="form-control form-control-sm shadow-none"
              placeholder="Search in files…" 
              @input="debouncedSearch"
              aria-label="Search files and folders"
            />
            <span class="input-icon-addon" aria-hidden="true">
              <Icon icon="mdi:magnify" width="20" height="20" />
            </span>
          </div>
        </div>

        <!-- File View -->
        <div class="d-flex flex-column position-relative file-view">
          <div class="position-absolute top-0 end-0 start-0 bottom-0 overflow-x-auto">
            <!-- Loading State -->
            <div v-if="isLoading" class="text-center text-muted py-6">
              <div class="spinner-border spinner-border-sm mb-2" role="status">
                <span class="visually-hidden">Loading...</span>
              </div>
              <div>Loading files...</div>
            </div>

            <!-- Empty State -->
            <div v-else-if="filteredItems.length === 0" class="text-center text-muted py-6">
              <Icon icon="tabler:folder-off" class="empty-icon mb-2" />
              <div>{{ emptyStateMessage }}</div>
            </div>

            <!-- Grid View -->
            <template v-else-if="viewMode === 'grid'">
              <div class="explorer-grid">
                <div 
                  v-for="item in filteredItems" 
                  :key="item.path" 
                  class="explorer-item" 
                  tabindex="0" 
                  role="button"
                  @click="selectItem(item)"
                  @dblclick="onItemDblClick(item)" 
                  @keydown.enter="onItemDblClick(item)"
                  @keydown.space.prevent="selectItem(item)"
                  :title="getItemTooltip(item)"
                  :class="{ selected: selectedItems.has(item.path) }"
                  :aria-label="getItemAriaLabel(item)"
                >
                  <div class="icon-wrap">
                    <Icon :icon="item.icon" class="explorer-icon" :class="item.iconClass" />
                  </div>
                  <div class="explorer-label">{{ item.name }}</div>
                </div>
              </div>
            </template>

            <!-- List View -->
            <template v-else>
              <div class="table-responsive">
                <table class="table table-hover table-nowrap">
                  <thead>
                    <tr>
                      <th>
                        <button 
                          class="btn btn-sm btn-action p-0" 
                          @click="handleSort('name')"
                          :aria-label="getSortAriaLabel('name')"
                        >
                          Name
                          <Icon 
                            v-if="sortKey === 'name'" 
                            :icon="sortDir === 'asc' ? 'mdi:arrow-up' : 'mdi:arrow-down'"
                            width="16" 
                            height="16" 
                            class="ms-1" 
                          />
                        </button>
                      </th>
                      <th class="w-0">
                        <button 
                          class="btn btn-sm btn-action p-0" 
                          @click="handleSort('modified')"
                          :aria-label="getSortAriaLabel('modified')"
                        >
                          Modified
                          <Icon 
                            v-if="sortKey === 'modified'"
                            :icon="sortDir === 'asc' ? 'mdi:arrow-up' : 'mdi:arrow-down'" 
                            width="16" 
                            height="16"
                            class="ms-1" 
                          />
                        </button>
                      </th>
                      <th class="text-end w-0">
                        <button 
                          class="btn btn-sm btn-action p-0" 
                          @click="handleSort('size')"
                          :aria-label="getSortAriaLabel('size')"
                        >
                          Size
                          <Icon 
                            v-if="sortKey === 'size'" 
                            :icon="sortDir === 'asc' ? 'mdi:arrow-up' : 'mdi:arrow-down'"
                            width="16" 
                            height="16" 
                            class="ms-1" 
                          />
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr 
                      v-for="item in filteredItems" 
                      :key="item.path" 
                      class="cursor-pointer"
                      :class="{ 'table-active': selectedItems.has(item.path) }"
                      @click="selectItem(item)"
                      @dblclick="onItemDblClick(item)"
                      :aria-label="getItemAriaLabel(item)"
                      tabindex="0"
                      @keydown.enter="onItemDblClick(item)"
                      @keydown.space.prevent="selectItem(item)"
                    >
                      <td>
                        <Icon 
                          :icon="item.type === 'folder' ? 'mdi:folder' : 'mdi:file-outline'"
                          :class="item.type === 'folder' ? 'text-warning me-2' : 'text-primary me-2'" 
                        />
                        {{ item.name }}
                      </td>
                      <td class="w-0 text-muted">{{ formatDate(item.updated) }}</td>
                      <td class="text-end text-muted">{{ formatSize(item.size) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </template>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, onUnmounted, watch, nextTick } from 'vue'
import TreeNode from './TreeNode.vue'
import { useFileStore } from '@/stores/files'
import { getDateFormated, getFileComparator, getFileIcon, getFileColor, formatFileSize } from '@/composables/useFiles'
import { SORT_OPTIONS, VIEW_MODES, MIN_SIDEBAR_WIDTH, DEFAULT_SIDEBAR_WIDTH } from '@/constants/files'
import { useDebounce } from '@/composables/useDebounce'
import { useKeyboard } from '@/composables/useKeyboard'

// Store
const fileStore = useFileStore()

// Reactive state
const sidebar = ref(null)
const viewMode = ref('grid')
const sortKey = ref('name')
const sortDir = ref('asc')
const search = ref('')
const isSidebarCollapsed = ref(false)
const sidebarWidth = ref(DEFAULT_SIDEBAR_WIDTH)
const isLoading = ref(false)
const selectedItems = ref(new Set())

// Dragging state
let isDragging = false
let dragStartX = 0
let initialWidth = 0

// Computed properties
const sidebarStyle = computed(() => ({
  width: isSidebarCollapsed.value ? '0' : `${sidebarWidth.value}px`
}))

const treeData = computed(() => [{
  title: 'Uploads',
  icon: 'mdi:home',
  items: fileStore.files.map(f => ({
    name: f.name,
    path: f.path,
    type: f.type,
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

const breadcrumbs = computed(() => {
  const path = fileStore.selectedPath || fileStore.currentPath || '/'
  return buildBreadcrumbsFromPath(path)
})

const emptyStateMessage = computed(() => {
  if (search.value.trim()) {
    return `No files match "${search.value}"`
  }
  return 'No files or folders in the current directory.'
})

// Utility functions
function buildBreadcrumbsFromPath(path) {
  if (!path || path === '/') {
    return [{ name: 'Home', path: '/', isClickable: true }]
  }
  
  const segments = path.split('/').filter(Boolean)
  const crumbs = [{ name: 'Home', path: '/', isClickable: true }]
  let buildPath = ''
  
  segments.forEach((segment, index) => {
    buildPath += '/' + segment
    crumbs.push({
      name: segment,
      path: buildPath,
      isClickable: index < segments.length - 1
    })
  })
  
  return crumbs
}

const isLastBreadcrumb = (idx) => idx === breadcrumbs.value.length - 1

const getItemTooltip = (item) => {
  const parts = [item.name]
  if (item.size) parts.push(`Size: ${formatSize(item.size)}`)
  if (item.updated) parts.push(`Modified: ${formatDate(item.updated)}`)
  return parts.join('\n')
}

const getItemAriaLabel = (item) => {
  return `${item.type === 'folder' ? 'Folder' : 'File'}: ${item.name}`
}

const getSortAriaLabel = (column) => {
  const currentSort = sortKey.value === column
  const direction = currentSort && sortDir.value === 'asc' ? 'descending' : 'ascending'
  return `Sort by ${column} ${direction}`
}

// Methods
const toggleSidebar = () => {
  isSidebarCollapsed.value = !isSidebarCollapsed.value
}

const setViewMode = (mode) => {
  viewMode.value = mode
  // Clear selection when switching views
  selectedItems.value.clear()
}

const handleSort = (key) => {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = 'asc'
  }
}

const formatDate = (date) => {
  return getDateFormated(date)
}

const formatSize = (size) => {
  return size ? formatFileSize(size) : '-'
}

const selectItem = (item) => {
  // Toggle selection
  if (selectedItems.value.has(item.path)) {
    selectedItems.value.delete(item.path)
  } else {
    selectedItems.value.add(item.path)
  }
}

const onItemDblClick = async (item) => {
  if (item.type === 'folder') {
    isLoading.value = true
    try {
      await loadChildren(item)
    } finally {
      isLoading.value = false
    }
  } else {
    console.log('Opening file:', item.name)
    // Emit event for parent component to handle
    // emit('file-open', item)
  }
}

const createNewFolder = () => {
  // Implement new folder creation
  console.log('Creating new folder')
}

// Debounced search
const debouncedSearch = useDebounce(() => {
  // Search is reactive, no additional action needed
}, 300)

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

const navigateTo = async (item) => {
  if (item.isClickable) {
    isLoading.value = true
    try {
      await loadChildren(item)
    } finally {
      isLoading.value = false
    }
  }
}

// Load children method for TreeNode lazy loading
const loadChildren = async (node) => {
  try {
    const children = await fileStore.fetchFolderChildren(node.path)
    const items = children.map(child => ({
      ...child,
      children: child.type === 'folder' ? null : undefined
    }))

    fileStore.children = items
    fileStore.selectedPath = node.path
    selectedItems.value.clear() // Clear selection when navigating
    return items
  } catch (error) {
    console.error('Error loading children:', error)
    return []
  }
}

// Keyboard navigation
const handleKeyboardNavigation = (event) => {
  // Implement keyboard shortcuts
  if (event.ctrlKey || event.metaKey) {
    switch (event.key) {
      case 'a':
        event.preventDefault()
        // Select all items
        filteredItems.value.forEach(item => selectedItems.value.add(item.path))
        break
      case 'f':
        event.preventDefault()
        // Focus search
        document.querySelector('input[aria-label="Search files and folders"]')?.focus()
        break
    }
  }
}

// Watch for store changes
watch(
  () => fileStore.selectedPath,
  async () => {
    // Scroll to top when path changes
    await nextTick()
    const fileView = document.querySelector('.file-view')
    if (fileView) {
      fileView.scrollTop = 0
    }
  }
)

// Lifecycle hooks
onMounted(async () => {
  isLoading.value = true
  try {
    await fileStore.fetchFiles()
    if (!fileStore.breadcrumbs || fileStore.breadcrumbs.length === 0) {
      if (typeof fileStore.initializeBreadcrumbs === 'function') {
        fileStore.initializeBreadcrumbs()
      }
    }
  } catch (error) {
    console.error('Error loading files:', error)
  } finally {
    isLoading.value = false
  }

  // Add keyboard event listener
  document.addEventListener('keydown', handleKeyboardNavigation)
})

onUnmounted(() => {
  stopDragging()
  document.removeEventListener('keydown', handleKeyboardNavigation)
})
</script>

<style scoped>
/* Improved styles with better performance and accessibility */
.file-view {
  height: calc(100% - 155px);
  contain: layout style paint;
}

.resizable-grid {
  display: flex;
  flex-direction: column;
  overflow: auto;
  flex-grow: 1;
  min-height: 200px;
}

.splitter-container {
  display: flex;
  position: relative;
  overflow: hidden;
  contain: layout;
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

.breadcrumb, .breadcrumb-item {
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
.folder { color: #f59e0b; }
.xml { color: #10b981; }
.rtf { color: #ef4444; }
.txt { color: #3b82f6; }
.file { color: var(--tblr-primary); }

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

/* Performance optimizations */
.explorer-grid,
.table-responsive {
  contain: layout style paint;
}

/* Scrollbar styling */
.file-view::-webkit-scrollbar,
#menu::-webkit-scrollbar {
  width: 8px;
}

.file-view::-webkit-scrollbar-track,
#menu::-webkit-scrollbar-track {
  background: var(--tblr-gray-50);
}

.file-view::-webkit-scrollbar-thumb,
#menu::-webkit-scrollbar-thumb {
  background: var(--tblr-gray-300);
  border-radius: 4px;
}

.file-view::-webkit-scrollbar-thumb:hover,
#menu::-webkit-scrollbar-thumb:hover {
  background: var(--tblr-gray-400);
}

/* Animation for loading states */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.explorer-grid,
.table-responsive {
  animation: fadeIn 0.3s ease-in-out;
}
</style>