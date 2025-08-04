<template>
  <div class="card h-100">
    <Topbar @refresh="refreshFiles" @create-folder="createFolder" v-model="viewMode" />

    <div class="d-flex border-top splitter-container h-100 position-relative">
      <!-- Sidebar -->
      <div ref="sidebar" class="border-end p-2" style="min-width: 20%">
        <TreeSidebar :items="treeData" @select="selectFolder" :selected="selectedFolder" />
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
            <input type="text" value="" class="form-control form-control-sm shadow-none"placeholder="Search…" />
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

        <FileGrid v-if="viewMode === 'grid'" :items="treeData" />
        <FileTable v-if="viewMode === 'list'" :items="treeData" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import Topbar from './Topbar.vue'
import TreeSidebar from './TreeSidebar.vue'
import Breadcrumb from './ui/Breadcrumb.vue'
import FileTable from './FileTable.vue'
import FileGrid from './FileGrid.vue'
import { useFileStore } from '@/stores/file';

const fileStore = useFileStore();
const viewMode = ref('grid') // or 'list'
const selectedPath = ref('');

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

onMounted(() => {
   fileStore.fetchFiles();
})
</script>

<style scoped>
.resizable-grid {
  display: flex;
  flex-direction: column;
}

.splitter-container {
  display: flex;
  position: relative;
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
  border: 1px solid var(--tblr-gray-100) ;
}
</style>