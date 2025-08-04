<template>
  <div class="card flex-fill">
    <Topbar @refresh="refreshFiles" @create-folder="createFolder" v-model="viewMode" />

    <div class="d-flex border-top splitter-container flex-fill position-relative">
      <!-- Sidebar -->
      <div ref="sidebar" class="border-end p-2" style="min-width: 264px;">
        <TreeSidebar
          ref="treeSidebar"
          v-if="treeData?.length"
          :treeData="treeData"
          :selectedPath="selectedPath"
          @select="selectedPath = $event"
        />
      </div>

      <div class="splitter" @mousedown="startDragging"></div>

      <!-- Content -->
      <div class="resizable-grid border-start"
        style="flex-grow: 1; resize: vertical; overflow: auto; min-height: 200px;">
        <div class="nav-scroller bg-body p-1 border-bottom">
          <nav class="nav" aria-label="Secondary navigation">
            <Breadcrumb :segments="breadcrumbItems" @navigate="onNavigate" />
          </nav>
          <div class="input-icon w-25">
            <input type="text" value="" class="form-control form-control-sm shadow-none" placeholder="Search…" />
            <span class="input-icon-addon">
              <svg xmlns="http://www.w3.org/2000/svg" class="icon" width="24" height="24" viewBox="0 0 24 24"
                stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                <circle cx="10" cy="10" r="7" />
                <line x1="21" y1="21" x2="15" y2="15" />
              </svg>
            </span>
          </div>
        </div>
        <div class="d-flex flex-column position-relative file-view">
          <div class="position-absolute top-0 end-0 start-0 bottom-0 overflow-x-auto">
            <FileGrid v-if="viewMode === 'grid'" :items="currentItems" @itemDblClick="onItemDblClick" />
            <FileTable v-if="viewMode === 'list'" :items="currentItems" @itemDblClick="onItemDblClick" />
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
import { useFileStore } from '@/stores/file';

const fileStore = useFileStore();
const viewMode = ref('grid') // or 'list'
const selectedPath = ref('');
const treeSidebar = ref(null)

const treeData = computed(() => [
  {
    title: 'Uploads',
    items: fileStore.files.map(f => ({
      name: f.name,
      path: f.path,
      type: f.type,
      link: f.type === 'folder' ? null : `/files/${f.path}`,
      children: f.children ?? (f.type === 'folder' ? null : undefined)
    }))
  }
]);

const currentTreeNode = computed(() => {
  function findNodeByPath(nodes, path) {
    for (const node of nodes) {
      if ((node.path || '') === (path || '')) return node;
      if (node.children && node.children.length) {
        const found = findNodeByPath(node.children, path);
        if (found) return found;
      }
    }
    return null;
  }
  const rootItems = treeData.value[0]?.items || [];
  return findNodeByPath(rootItems, selectedPath.value) || { children: rootItems };
});

async function onItemDblClick(item) {
  if (item.type === 'folder') {
    if (item.isParent) {
      const segments = selectedPath.value.split('/').filter(Boolean);
      segments.pop();
      selectedPath.value = segments.join('/');
    } else {
      const newPath = selectedPath.value
        ? `${selectedPath.value}/${item.name}`
        : item.name;
      selectedPath.value = newPath;
    }

    await nextTick();
    treeSidebar.value?.collapseAllExcept(selectedPath.value);
    treeSidebar.value?.expandAndScrollToPath(selectedPath.value);
  } else {
    window.open(`/files/${item.path}`, '_blank');
  }
}

async function onNavigate(path) {
  selectedPath.value = path.replace(/^\/+/, ''); // normalize path
  await nextTick();
  treeSidebar.value?.collapseAllExcept(selectedPath.value);
  treeSidebar.value?.expandAndScrollToPath(selectedPath.value);
}

const currentItems = computed(() => {
  let items = currentTreeNode.value.children || []
  // Parent-Folder (..) anzeigen, außer im Root
  if (selectedPath.value) {
    items = [
      { name: '..', type: 'folder', isParent: true },
      ...items
    ]
  }
  return items
})

async function refreshFiles() {
  try {
    await fileStore.fetchFiles();
  } catch (err) {
    console.error('Fehler beim Aktualisieren der Dateien:', err);
  }
}

function createFolder() {
  alert('Create folder clicked')
}

const sidebar = ref(null)
let isDragging = false

function startDragging(e) {
  isDragging = true
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDragging)
}

function onDrag(e) {
  if (!isDragging || !sidebar.value) return
  const newWidth = Math.max(150, e.clientX)
  sidebar.value.style.width = `${newWidth}px`
}

function stopDragging() {
  isDragging = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDragging)
}

const breadcrumbItems = computed(() => {
  const items = [{ name: 'Uploads', path: '' }];
  if (!selectedPath.value) return items;

  const segments = selectedPath.value.split('/').filter(Boolean);
  const breadcrumbs = segments.map((segment, index) => {
    return {
      name: segment,
      path: '/' + segments.slice(0, index + 1).join('/')
    };
  });

  return items.concat(breadcrumbs);
});

onMounted(async () => {
  await fileStore.fetchFiles();
  await nextTick();
  if (selectedPath.value) {
    treeSidebar.value?.collapseAllExcept(selectedPath.value);
    treeSidebar.value?.expandAndScrollToPath(selectedPath.value);
  }
});
</script>

<style scoped>
.file-view {
  height: calc(100% - 155px);
}

.resizable-grid {
  display: flex;
  flex-direction: column;
  overflow: auto;
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
  /* IE and Edge */
  scrollbar-width: none;
  /* Firefox */
  max-height: 100vh;
}

.file-view::-webkit-scrollbar {
  display: none;
  /* Chrome, Safari, Opera */
}
</style>