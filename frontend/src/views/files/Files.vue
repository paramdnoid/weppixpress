<template>
  <DefaultLayout>
    <UploadDropZone
      :current-path="fileStore.state.currentPath"
      :disabled="fileStore.state.isLoading"
      @upload-started="handleUploadStarted"
      @upload-completed="handleUploadCompleted"
      @upload-failed="handleUploadFailed"
    >
      <div class="card flex-fill files-root">
        <FileToolbar
          :is-sidebar-collapsed="isCollapsed"
          :is-loading="fileStore.state.isLoading"
          :selected-count="fileStore.selectedItems.length"
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
          @rename-selected="handleRenameSelected"
          @delete-selected="handleDeleteSelectedFiles"
          @clear-selection="fileStore.clearSelection"
          @copy-selected="handleCopySelected"
          @cut-selected="handleCutSelected"
          @paste-items="handlePasteItems"
          @search="fileStore.setSearch"
          @sort="fileStore.setSorting"
          @view-mode="setViewMode"
          @files-selected="handleFilesSelected"
          @open-upload-settings="showUploadSettingsModal"
        />

        <div class="d-flex border-top splitter-container flex-fill position-relative">
          <FileSidebar
            :is-collapsed="isCollapsed"
            :width="sidebarWidth"
            :tree-data="treeData"
            :selected-path="fileStore.state.currentPath"
            :load-children="loadTreeChildren"
            :toggle-node="toggleNode"
            @node-select="handleTreeNodeSelect"
          />

          <div
            v-show="!isCollapsed"
            class="splitter"
            role="separator"
            @mousedown="startDragging"
          />

          <FileView
            ref="fileViewRef"
            :items="fileStore.currentItems"
            :item-key="getItemKey"
            :breadcrumbs="fileStore.breadcrumbs"
            :view-mode="viewMode"
            :sort-key="fileStore.state.sorting.key"
            :sort-dir="fileStore.state.sorting.order"
            :selected-items="fileStore.state.selectedIds"
            :is-loading="fileStore.state.isLoading"
            :error="fileStore.state.error"
            :empty-message="emptyStateMessage"
            @navigate="handleBreadcrumbNavigate"
            @item-dbl-click="handleItemDoubleClickLocal"
            @sort="fileStore.setSorting"
            @retry="handleRetry"
            @delete-selected="handleDeleteSelectedFiles"
            @selection-change="handleSelectionChange"
            @area-context-menu="handleAreaContextMenu"
            @item-context-menu="handleItemContextMenu"
          />
        </div>

        <!-- FileManagerModals removed - now using direct modal calls -->

        <!-- UploadBatchSettingsModal removed - now using direct modal calls -->

        <ContextMenu
          ref="contextMenuRef"
          :items="contextMenuItems"
          @item-click="handleContextMenuClick"
        />
      </div>
    </UploadDropZone>
  </DefaultLayout>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import { useFileManager } from '@/composables/useFileManager'
import { useAuthStore } from '@/stores/auth'
import { useErrorHandler } from '@/utils/errorHandler'
import FileToolbar from './FileToolbar.vue'
import FileSidebar from './FileSidebar.vue'
import FileView from './FileView.vue'
import { useFileManagerModals } from '@/composables/useFileManagerModals'
import UploadDropZone from './UploadDropZone.vue'
import { useUploadBatchModal } from '@/composables/useUploadBatchModal'
import ContextMenu from '@/components/ui/ContextMenu.vue'

// Use the consolidated composable
const {
  fileStore,
  viewMode,
  sidebarWidth,
  isCollapsed,
  emptyStateMessage,
  SORT_OPTIONS,
  VIEW_MODES,
  getItemKey,
  // handleItemClick,
  // handleItemDoubleClick,
  setViewMode,
  toggleSidebar,
  startDragging,
  // deleteSelectedFiles
} = useFileManager()

const authStore = useAuthStore()
const fileManagerModals = useFileManagerModals()
const uploadBatchModal = useUploadBatchModal()

// Use shared utilities
const { extractErrorMessage, formatErrorForDisplay } = useErrorHandler()

const fileViewRef = ref(null)
const contextMenuRef = ref(null)

// Context menu items
const contextMenuItems = computed(() => {
  const items = []

  // Add file-specific actions if items are selected
  if (fileStore.selectedItems.length > 0) {
    // Single item actions
    if (fileStore.selectedItems.length === 1) {
      items.push({
        id: 'rename',
        label: 'Rename',
        icon: 'tabler:edit',
        shortcut: 'F2'
      })
    }

    // Multi-item actions
    items.push(
      {
        id: 'copy',
        label: 'Copy',
        icon: 'tabler:copy',
        shortcut: 'Ctrl+C'
      },
      {
        id: 'cut',
        label: 'Cut',
        icon: 'tabler:cut',
        shortcut: 'Ctrl+X'
      },
      {
        id: 'separator-file-actions',
        separator: true
      },
      {
        id: 'delete-selected',
        label: `Delete ${fileStore.selectedItems.length} item${fileStore.selectedItems.length > 1 ? 's' : ''}`,
        icon: 'tabler:trash',
        shortcut: 'Delete'
      },
      {
        id: 'separator-after-delete',
        separator: true
      }
    )
  }

  // General actions
  items.push(
    {
      id: 'create-folder',
      label: 'New Folder',
      icon: 'tabler:folder-plus',
      shortcut: 'Ctrl+Shift+N'
    },
    {
      id: 'separator-1',
      separator: true
    },
    {
      id: 'upload-files',
      label: 'Upload Files',
      icon: 'tabler:upload',
      shortcut: 'Ctrl+U'
    },
    {
      id: 'upload-folder',
      label: 'Upload Folder',
      icon: 'tabler:folder-upload'
    },
    {
      id: 'separator-2',
      separator: true
    },
    {
      id: 'paste',
      label: 'Paste',
      icon: 'tabler:clipboard',
      shortcut: 'Ctrl+V',
      disabled: !fileStore.hasClipboard
    },
    {
      id: 'separator-3',
      separator: true
    },
    {
      id: 'refresh',
      label: 'Refresh',
      icon: 'tabler:refresh',
      shortcut: 'F5'
    },
    {
      id: 'properties',
      label: 'Properties',
      icon: 'tabler:info-circle'
    }
  )

  return items
})

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
    // Direct navigation without using toggleNode to avoid double API calls
    fileStore.navigateToPath(item.path)
  } else {
    // For files, handle opening/downloading
    openFileLocal(item)
  }
}

// Local file opening function to avoid duplicate navigation calls for folders
function openFileLocal(item) {
  try {
    if (!item?.path) {
      const error = new Error('Cannot open file: invalid file item')
      console.error(extractErrorMessage(error), item)
      return
    }


    // Get file type checkers from composable
    const { isImageFile, isVideoFile, isCodeFile } = useFileManager()

    if (isImageFile(item)) {
      // TODO: Open in image viewer modal
    } else if (isVideoFile(item)) {
      // TODO: Open in video player modal
    } else if (isCodeFile(item)) {
      // TODO: Open in code editor modal
    } else {
      // Default to download
      downloadFileLocal(item)
    }
  } catch (error) {
    const errorMessage = formatErrorForDisplay(error)
    console.error('Error opening file:', errorMessage, error)
    if (window.$toast) {
      window.$toast(`Failed to open file: ${errorMessage}`, { type: 'danger' })
    }
  }
}

// Local file download function
function downloadFileLocal(item) {
  try {
    if (!item?.path) {
      const error = new Error('Cannot download file: invalid file item')
      console.error(extractErrorMessage(error), item)
      return
    }

    // Create a temporary link for download
    const link = document.createElement('a')
    link.href = `/api/files/download?path=${encodeURIComponent(item.path)}`
    link.download = item.name || 'download'
    link.style.display = 'none'

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

  } catch (error) {
    console.error('Error downloading file:', error)
    alert('Failed to download file. Please try again.')
  }
}

// Modal handlers
function showCreateFolderModal() {
  fileManagerModals.openNewFolderModal(handleCreateFolder)
}

function showUploadSettingsModal() {
  uploadBatchModal.openUploadBatchSettings()
}

function handleRenameSelected() {
  if (fileStore.selectedItems.length === 1) {
    const selectedItem = fileStore.selectedItems[0]
    fileManagerModals.openRenameModal(selectedItem, handleRename)
  }
}

function handleRename(data) {
  fileStore.renameItem(data.item, data.newName)
}

function handleContextMenuAction(action, item) {
  switch (action) {
    case 'rename':
      if (item) {
        fileManagerModals.openRenameModal(item, handleRename)
      }
      break
    case 'copy':
      if (item) {
        fileStore.selectItem(item, 'single')
        handleCopySelected()
      }
      break
    case 'cut':
      if (item) {
        fileStore.selectItem(item, 'single')
        handleCutSelected()
      }
      break
    case 'delete':
      if (item) {
        fileStore.selectItem(item, 'single')
        handleDeleteSelectedFiles()
      }
      break
    case 'createFolder':
      showCreateFolderModal()
      break
    case 'paste':
      handlePasteItems()
      break
    case 'uploadSettings':
      showUploadSettingsModal()
      break
    default:
  }
}

let currentContextMenu = null

function createDirectContextMenu(event, item) {
  // Remove existing menu
  if (currentContextMenu) {
    currentContextMenu.remove()
  }

  // Create menu element
  const menu = document.createElement('div')
  menu.style.cssText = `
    position: fixed;
    top: ${event.clientY}px;
    left: ${event.clientX}px;
    z-index: 999999;
    background: #ffffff;
    border: 1px solid #dee2e6;
    border-radius: 0.5rem;
    padding: 0.25rem 0;
    box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
    min-width: 200px;
    max-width: 280px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 0.875rem;
    color: #495057;
  `

  // Build menu items based on context
  let menuItems = ''

  // File-specific actions
  if (item) {
    menuItems += `
      <div class="context-menu-item" data-action="rename">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 8px;">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
          <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
        Rename
      </div>
      <div class="context-menu-item" data-action="copy">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 8px;">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        Copy
      </div>
      <div class="context-menu-item" data-action="cut">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 8px;">
          <circle cx="6" cy="6" r="3"></circle>
          <circle cx="6" cy="18" r="3"></circle>
          <line x1="20" y1="4" x2="8.12" y2="15.88"></line>
          <line x1="14.47" y1="14.48" x2="20" y2="20"></line>
          <line x1="8.12" y1="8.12" x2="12" y2="12"></line>
        </svg>
        Cut
      </div>
      <hr style="margin: 0.25rem 0; border: none; border-top: 1px solid #dee2e6;">
      <div class="context-menu-item context-menu-item-danger" data-action="delete">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 8px;">
          <polyline points="3,6 5,6 21,6"></polyline>
          <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
        </svg>
        Delete
      </div>
      <hr style="margin: 0.25rem 0; border: none; border-top: 1px solid #dee2e6;">
    `
  }

  // General actions
  menuItems += `
    <div class="context-menu-item" data-action="createFolder">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 8px;">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
        <line x1="12" y1="11" x2="12" y2="17"></line>
        <line x1="9" y1="14" x2="15" y2="14"></line>
      </svg>
      New Folder
    </div>
    <div class="context-menu-item" data-action="paste">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 8px;">
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
        <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
      </svg>
      Paste
    </div>
  `

  // Use safer DOM creation methods instead of innerHTML
  function createMenuItem(action, iconSvg, label, disabled = false) {
    const item = document.createElement('div')
    item.className = 'context-menu-item'
    if (disabled) item.classList.add('disabled')
    item.setAttribute('data-action', action)

    // Create SVG element safely without innerHTML
    const iconContainer = document.createElement('div')
    iconContainer.style.marginRight = '8px'
    iconContainer.style.display = 'inline-flex'
    iconContainer.style.alignItems = 'center'

    // Parse SVG safely by creating a temporary container and validating
    const tempDiv = document.createElement('div')
    tempDiv.textContent = iconSvg // This sanitizes the content

    // Create a proper SVG element
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('width', '16')
    svg.setAttribute('height', '16')
    svg.setAttribute('viewBox', '0 0 24 24')
    svg.setAttribute('fill', 'none')
    svg.setAttribute('stroke', 'currentColor')
    svg.setAttribute('stroke-width', '2')

    // Extract path data safely from the iconSvg string
    const pathMatch = iconSvg.match(/d="([^"]*)"/)
    if (pathMatch) {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      path.setAttribute('d', pathMatch[1])
      svg.appendChild(path)
    }

    // Handle other SVG elements like circles, lines, etc.
    const circleMatches = iconSvg.matchAll(/cx="([^"]*)" cy="([^"]*)" r="([^"]*)"/g)
    for (const match of circleMatches) {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
      circle.setAttribute('cx', match[1])
      circle.setAttribute('cy', match[2])
      circle.setAttribute('r', match[3])
      svg.appendChild(circle)
    }

    const lineMatches = iconSvg.matchAll(/x1="([^"]*)" y1="([^"]*)" x2="([^"]*)" y2="([^"]*)"/g)
    for (const match of lineMatches) {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
      line.setAttribute('x1', match[1])
      line.setAttribute('y1', match[2])
      line.setAttribute('x2', match[3])
      line.setAttribute('y2', match[4])
      svg.appendChild(line)
    }

    iconContainer.appendChild(svg)

    const labelSpan = document.createElement('span')
    labelSpan.textContent = label

    item.appendChild(iconContainer)
    item.appendChild(labelSpan)
    return item
  }

  function createSeparator() {
    const separator = document.createElement('hr')
    separator.style.cssText = 'margin: 0.25rem 0; border: none; border-top: 1px solid #dee2e6;'
    return separator
  }

  // Build menu items safely
  if (hasSelectedFiles.value) {
    if (selectedCount.value === 1) {
      menu.appendChild(createMenuItem('rename',
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>',
        'Rename'
      ))
    }

    menu.appendChild(createMenuItem('copy',
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>',
      `Copy (${selectedCount.value})`
    ))

    menu.appendChild(createMenuItem('cut',
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><line x1="20" y1="4" x2="8.12" y2="15.88"></line><line x1="14.47" y1="14.48" x2="20" y2="20"></line><line x1="8.12" y1="8.12" x2="12" y2="12"></line></svg>',
      `Cut (${selectedCount.value})`
    ))

    menu.appendChild(createSeparator())

    menu.appendChild(createMenuItem('delete',
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,6 5,6 21,6"></polyline><path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"></path></svg>',
      `Delete (${selectedCount.value})`
    ))

    menu.appendChild(createSeparator())
  }

  // General actions
  menu.appendChild(createMenuItem('createFolder',
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><line x1="12" y1="11" x2="12" y2="17"></line><line x1="9" y1="14" x2="15" y2="14"></line></svg>',
    'New Folder'
  ))

  menu.appendChild(createMenuItem('paste',
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>',
    'Paste'
  ))

  // Add CSS for menu items
  const style = document.createElement('style')
  style.textContent = `
    .context-menu-item {
      display: flex;
      align-items: center;
      padding: 0.375rem 0.75rem;
      cursor: pointer;
      transition: background-color 0.15s ease;
      color: #495057;
    }
    .context-menu-item:hover {
      background-color: var(--tblr-gray-100);
    }
    .context-menu-item-danger {
      color: #dc3545;
    }
    .context-menu-item-danger:hover {
      background-color: #dc3545;
      color: white;
    }
  `
  if (!document.querySelector('style[data-context-menu]')) {
    style.setAttribute('data-context-menu', 'true')
    document.head.appendChild(style)
  }

  // Add click handlers
  menu.addEventListener('click', (e) => {
    const menuItem = e.target.closest('.context-menu-item')
    if (menuItem) {
      const action = menuItem.getAttribute('data-action')
      handleContextMenuAction(action, item)
      menu.remove()
      currentContextMenu = null
    }
  })

  // Add to body
  document.body.appendChild(menu)
  currentContextMenu = menu

  // Hide on click outside
  setTimeout(() => {
    document.addEventListener('click', function hideMenu(e) {
      if (menu && !menu.contains(e.target)) {
        menu.remove()
        currentContextMenu = null
        document.removeEventListener('click', hideMenu)
      }
    })
  }, 100)
}

async function handleCreateFolder(name) {
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

// Handle area context menu
function handleAreaContextMenu(event) {
  event.preventDefault()
  if (contextMenuRef.value) {
    contextMenuRef.value.show(event)
  }
}

// Handle item context menu
function handleItemContextMenu(item, event) {
  event.preventDefault()

  // Ensure the clicked item is selected if not already
  if (!fileStore.selectedItems.some(selectedItem =>
    getItemKey(selectedItem) === getItemKey(item)
  )) {
    // If not selected, select only this item using handleSelectionChange
    handleSelectionChange([item], false)
  }

  // Show context menu
  if (contextMenuRef.value) {
    contextMenuRef.value.show(event)
  }
}

// Handle context menu item clicks
function handleContextMenuClick(item) {
  switch (item.id) {
    case 'rename':
      if (fileStore.selectedItems.length === 1) {
        handleRenameSelected()
      }
      break

    case 'copy':
      if (fileStore.selectedItems.length > 0) {
        handleCopySelected()
      }
      break

    case 'cut':
      if (fileStore.selectedItems.length > 0) {
        handleCutSelected()
      }
      break

    case 'create-folder':
      showCreateFolderModal()
      break

    case 'upload-files': {
      // Trigger file input click
      const fileInput = document.createElement('input')
      fileInput.type = 'file'
      fileInput.multiple = true
      fileInput.onchange = (e) => {
        if (e.target.files?.length > 0) {
          handleFilesSelected(Array.from(e.target.files))
        }
      }
      fileInput.click()
      break
    }

    case 'upload-folder': {
      // Trigger folder input click
      const folderInput = document.createElement('input')
      folderInput.type = 'file'
      folderInput.webkitdirectory = true
      folderInput.onchange = (e) => {
        if (e.target.files?.length > 0) {
          handleFilesSelected(Array.from(e.target.files))
        }
      }
      folderInput.click()
      break
    }

    case 'paste':
      if (fileStore.hasClipboard) {
        handlePasteItems()
      }
      break

    case 'delete-selected':
      if (fileStore.selectedItems.length > 0) {
        handleDeleteSelectedFiles()
      }
      break

    case 'refresh':
      fileStore.loadFiles(fileStore.state.currentPath)
      break

    case 'properties':
      // Show current folder properties - you can implement this
      // Show folder properties modal would go here
      break

    default:
      // Unhandled context menu action
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

    // Setup event listeners with proper cleanup
    setupEventListeners()

    // Clean up any existing context menus on load
    const existingMenus = document.querySelectorAll('.simple-context-menu, .context-menu')
    existingMenus.forEach(menu => menu.remove())

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

// Listen for tree reorganization events to refresh root list if needed
onMounted(() => {
  const treeRoot = document.getElementById('menu')
  if (!treeRoot) return

  function onTreeReorganize(e) {
    try {
      const detail = (e && e.detail) || {}
      const targetPath = detail.targetPath || ''
      if (targetPath === '/') {
        // Refresh root folders in sidebar
        fileStore.loadFolderContents('/', false)
          .then(items => {
            const folders = items.filter(item => item.type === 'folder')
            treeData.value[0].items = folders
          })
          .catch((error) => {
            console.error('Failed to load tree reorganize items:', error)
          })
      }
    } catch (error) {
      console.error('Tree reorganize error:', error)
    }
  }

  treeRoot.addEventListener('tree:reorganize', onTreeReorganize)

  // Cleanup
  const cleanup = () => treeRoot.removeEventListener('tree:reorganize', onTreeReorganize)
  try {
    if (import.meta && import.meta.hot) {
      import.meta.hot.dispose(() => cleanup())
    }
  } catch (error) {
    console.error('Hot reload cleanup error:', error)
  }
})

// Store event listener functions for cleanup
let uploadBatchCompletedHandler = null
let fileContextMenuHandler = null

// Update the event listener additions to store references
function setupEventListeners() {
  uploadBatchCompletedHandler = (event) => {
    const { batch } = event.detail
    handleUploadCompleted({ batch })
  }

  fileContextMenuHandler = (event) => {
    const { item, event: mouseEvent } = event.detail
    createDirectContextMenu(mouseEvent, item)
  }

  window.addEventListener('upload-batch-completed', uploadBatchCompletedHandler)
  document.addEventListener('file-context-menu', fileContextMenuHandler)
}

onUnmounted(() => {
  // Clean up event listeners to prevent memory leaks
  if (uploadBatchCompletedHandler) {
    window.removeEventListener('upload-batch-completed', uploadBatchCompletedHandler)
  }
  if (fileContextMenuHandler) {
    document.removeEventListener('file-context-menu', fileContextMenuHandler)
  }

  // Clean up tree reorganize listener
  const treeRoot = document.querySelector('.tree-root')
  if (treeRoot) {
    treeRoot.removeEventListener('tree:reorganize', onTreeReorganize)
  }

  // Clean up any remaining context menus
  if (currentContextMenu) {
    currentContextMenu.remove()
    currentContextMenu = null
  }
})

// Upload handlers
async function handleFilesSelected(files) {
  try {
    // Import the upload store
    const { useUploadStore } = await import('@/stores/upload')
    const uploadStore = useUploadStore()

    await uploadStore.startBatch(files, fileStore.state.currentPath)

    // Refresh the current directory to show new files
    setTimeout(() => {
      fileStore.refreshCurrentPath()
    }, 1000)
  } catch (error) {
    const errorMessage = formatErrorForDisplay(error)
    console.error('Failed to start upload:', errorMessage, error)
    if (window.$toast) {
      window.$toast(`Upload failed: ${errorMessage}`, { type: 'danger' })
    }
  }
}

function handleUploadStarted() {
  // Upload started silently
}

function handleUploadCompleted({ batch }) {
  // Refresh the current directory to show new files
  setTimeout(() => {
    fileStore.refreshCurrentPath()
  }, 1000)

  // Update tree if uploading to current directory
  if (batch.targetPath === fileStore.state.currentPath) {
    // Trigger tree reorganization
    nextTick(() => {
      const treeRoot = document.getElementById('menu')
      if (treeRoot) {
        const event = new CustomEvent('tree:reorganize', {
          detail: { targetPath: batch.targetPath }
        })
        treeRoot.dispatchEvent(event)
      }
    })
  }
}

function handleUploadFailed({ error, files }) {
  console.error('Upload failed:', error)
  alert(`Upload failed for ${files.length} files: ${error.message || 'Unknown error'}`)
}

</script>

<style scoped>
.files-root {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: calc(100vh - 54px);
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
  background-color: var(--tblr-gray-100);
}
</style>