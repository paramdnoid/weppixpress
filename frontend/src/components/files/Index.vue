<template>
  <div class="card flex-fill">
    <Topbar
      @refresh="refreshFiles"
      @create-folder="createFolder"
      @sort="onSort"
      @toggle-sidebar="isSidebarCollapsed = !isSidebarCollapsed"
      v-model="viewMode"
    />

    <div class="d-flex border-top splitter-container flex-fill position-relative">
      <!-- Sidebar mit reaktivem Width-Binding -->
      <div
        ref="sidebar"
        class="border-end sidebar"
        :class="{ 'w-0': isSidebarCollapsed }"
        :style="{ width: isSidebarCollapsed ? '' : sidebarWidth + 'px' }"
      >
        <TreeSidebar
          ref="treeSidebar"
          v-if="treeData?.length"
          :treeData="treeData"
          :selectedPath="selectedPath"
          @select="selectedPath = $event"
        />
      </div>

      <!-- Draggable Splitter -->
      <div
        class="splitter"
        v-show="!isSidebarCollapsed"
        @mousedown="startDragging"
      ></div>

      <!-- Content -->
      <div class="resizable-grid border-start">
        <div class="nav-scroller bg-body p-1 border-bottom">
          <nav class="nav me-1" aria-label="Secondary navigation">
            <Breadcrumb
              :segments="breadcrumbItems"
              @navigate="onNavigate"
            />
          </nav>
          <div class="input-icon w-25">
            <input
              type="text"
              class="form-control form-control-sm shadow-none"
              placeholder="Search in files…"
            />
            <span class="input-icon-addon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="icon"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                stroke-width="2"
                stroke="currentColor"
                fill="none"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                <circle cx="10" cy="10" r="7" />
                <line x1="21" y1="21" x2="15" y2="15" />
              </svg>
            </span>
          </div>
        </div>
        <div class="d-flex flex-column position-relative file-view">
          <div class="position-absolute top-0 end-0 start-0 bottom-0 overflow-x-auto">
            <FileGrid
              v-if="viewMode === 'grid'"
              :items="currentItems"
              :sortKey="sortKey"
              :sortDir="sortDir"
              @itemDblClick="onItemDblClick"
            />
            <FileTable
              v-else
              :items="currentItems"
              :sortKey="sortKey"
              :sortDir="sortDir"
              @itemDblClick="onItemDblClick"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, nextTick } from 'vue'
import Topbar from './Topbar.vue'
import TreeSidebar from './TreeSidebar.vue'
import Breadcrumb from './Breadcrumb.vue'
import FileTable from './FileTable.vue'
import FileGrid from './FileGrid.vue'
import { useFileStore } from '@/stores/files'

const fileStore = useFileStore()

// Ansicht & Pfad
const viewMode = ref('grid')
const selectedPath = ref('')
const treeSidebar = ref(null)

// Sortierung
const sortKey = ref('name')
const sortDir = ref('asc')

// Sidebar-Resizing (reactive)
const sidebar = ref(null)
const isSidebarCollapsed = ref(false)
const sidebarWidth = ref(300)
let isDragging = false

function startDragging() {
  isDragging = true
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDragging)
}
function onDrag(e) {
  sidebarWidth.value = Math.max(150, e.clientX)
}
function stopDragging() {
  isDragging = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDragging)
}

// Baum-Daten & Synchronisation
const treeData = computed(() => [
  {
    title: 'Uploads',
    icon: 'mdi:home',
    items: fileStore.files.map(f => ({
      name: f.name,
      path: f.path,
      type: f.type,
      children: f.children ?? (f.type === 'folder' ? null : undefined)
    }))
  }
])

async function syncTreeSidebar(path) {
  await nextTick()
  treeSidebar.value?.collapseAllExcept(path)
  treeSidebar.value?.expandAndScrollToPath(path)
}

async function onItemDblClick(item) {
  if (item.type === 'folder') {
    if (item.isParent) {
      const segments = selectedPath.value.split('/').filter(Boolean)
      segments.pop()
      selectedPath.value = segments.join('/')
    } else {
      selectedPath.value = selectedPath.value
        ? `${selectedPath.value}/${item.name}`
        : item.name
    }
    await syncTreeSidebar(selectedPath.value)
  } else {
    window.open(`/files/${item.path}`, '_blank')
  }
}

async function onNavigate(path) {
  selectedPath.value = path.replace(/^\/+/, '')
  await syncTreeSidebar(selectedPath.value)
}

// Aktuelle Items & Breadcrumbs
const currentTreeNode = computed(() => {
  function findNodeByPath(nodes, path) {
    for (const node of nodes) {
      if ((node.path || '') === (path || '')) return node
      if (node.children) {
        const found = findNodeByPath(node.children, path)
        if (found) return found
      }
    }
    return null
  }
  const rootItems = treeData.value[0]?.items || []
  return findNodeByPath(rootItems, selectedPath.value) || { children: rootItems }
})

const currentItems = computed(() => {
  let items = currentTreeNode.value.children || []
  if (selectedPath.value) {
    items = [{ name: '..', type: 'folder', isParent: true }, ...items]
  }
  return items
})

const breadcrumbItems = computed(() => {
  const items = [{ name: 'Uploads', path: '' }]
  if (!selectedPath.value) return items
  const segments = selectedPath.value.split('/').filter(Boolean)
  return items.concat(
    segments.map((seg, idx) => ({
      name: seg,
      path: '/' + segments.slice(0, idx + 1).join('/')
    }))
  )
})

// FileStore-Interaktionen
async function refreshFiles() {
  try {
    await fileStore.fetchFiles()
  } catch (err) {
    console.error('Fehler beim Aktualisieren der Dateien:', err)
  }
}
function createFolder() {
  console.log('Create folder clicked')
}

// Initial-Fetch & Sidebar-Sync
onMounted(async () => {
  await fileStore.fetchFiles()
  if (selectedPath.value) {
    await syncTreeSidebar(selectedPath.value)
  }
})
</script>

<style scoped>
.file-view {
  height: calc(100% - 155px);
}
.resizable-grid {
  display: flex;
  flex-direction: column;
  overflow: auto;
  flex-grow: 1;
  resize: vertical;
  min-height: 200px;
}
.splitter-container {
  display: flex;
  position: relative;
  overflow: hidden;
}
.splitter {
  width: 5px;
  cursor: col-resize;
  background: var(--tblr-gray-50);
  transition: background 0.2s;
  z-index: 10;
}
.splitter:hover {
  background: rgba(0, 0, 0, 0.1);
}
.nav-scroller {
  display: flex;
  justify-content: space-between;
  position: relative;
  z-index: 2;
  overflow-y: hidden;
}
.nav-scroller .nav {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  overflow-x: auto;
  white-space: nowrap;
  -webkit-overflow-scrolling: touch;
}
.form-control.form-control-sm {
  border: 1px solid var(--tblr-gray-100);
}
/* Hide scrollbar but allow scrolling */
.file-view {
  overflow-y: auto;
  -ms-overflow-style: none;
  scrollbar-width: none;
  max-height: 100vh;
}
.file-view::-webkit-scrollbar {
  display: none;
}
.w-0 {
  width: 0 !important;
  min-width: 0 !important;
}
.sidebar {
  min-width: 300px;
  transition: all 0.3s ease;
  overflow: hidden;
}
@media (max-width: 576px) {
  .sidebar {
    min-width: 100%;
    width: 100%;
  }
}
</style>