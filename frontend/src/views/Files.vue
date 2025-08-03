<template>
  <DefaultLayout>
    <aside class="open col-docs flex-fill">
      <div class="input-icon p-2">
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
      <TreeView ref="treeView" v-if="treeData?.length" :treeData="treeData" :selectedPath="selectedPath"
        @select="selectedPath = $event" />
    </aside>

    <main class="content">
      <div class="d-flex justify-content-between align-items-center sticky-top bg-gray-50"
        style="z-index:11; top:0; padding:8px;">
        <Breadcrumb :segments="breadcrumbItems" @navigate="onNavigate" />
        <ViewSwitcher v-model="viewMode" />
      </div>

      <GridView v-if="viewMode === 'grid'" :items="currentItems" @itemClick="onFileItemClick"
        @itemDblClick="onFileItemDblClick">
        <template #default="{ item }">
          <div class="col">
            <div class="card card-sm">
              <div class="card-body p-2 text-center">
                <span class="avatar avatar-sm bg-blue-lt mb-1" v-if="item.type === 'folder'">
                  <Icon icon="mdi:folder" width="24" height="24" />
                </span>
                <span class="avatar avatar-sm bg-gray-lt mb-1" v-else>
                  <Icon icon="mdi:file" width="24" height="24" />
                </span>
                <div class="fw-bold text-truncate">{{ item.name }}</div>
              </div>
            </div>
          </div>
        </template>
      </GridView>
      <ListView v-else :items="currentItems" @itemClick="onFileItemClick" @itemDblClick="onFileItemDblClick">
        <template #default="{ item }">
          <div class="list-group-item d-flex align-items-center">
            <span class="me-2">
              <Icon v-if="item.type === 'folder'" icon="mdi:folder" width="22" height="22" class="text-blue" />
              <Icon v-else icon="mdi:file" width="22" height="22" class="text-muted" />
            </span>
            <span class="flex-fill text-truncate">{{ item.name }}</span>
          </div>
        </template>
      </ListView>
    </main>
  </DefaultLayout>
</template>

<script setup>
import DefaultLayout from '@/layouts/DefaultLayout.vue';
import TreeView from '@/components/tree/TreeView.vue'
import Breadcrumb from '@/components/ui/Breadcrumb.vue'
import GridView from '@/components/GridView.vue';
import ListView from '@/components/ListView.vue';
import ViewSwitcher from '@/components/ui/ViewSwitcher.vue';
import { Icon } from '@iconify/vue'
import { ref, computed, onMounted, nextTick } from 'vue';
import { useFileStore } from '@/stores/file';

const fileStore = useFileStore();
const viewMode = ref('grid') // or 'list'
const selectedPath = ref('');
const treeView = ref(null);
const treeData = computed(() => [
  {
    title: 'Uploads',
    items: (Array.isArray(fileStore.files) ? fileStore.files : []).map(f => ({
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


function normalizePath(path) {
  if (!path) return '';
  return path.replace(/\/+$/, '').replace(/^\/+/, ''); // entfernt vorne und hinten Slashes
}

function onNavigate(path) {
  selectedPath.value = normalizePath(path);
  nextTick(() => {
    treeView.value?.expandAndScrollToPath(selectedPath.value);
  });
}

onMounted(() => {
  fileStore.fetchFiles();
});

function onFileItemClick(item) {
  //onNavigate(item.path)
  // Einzelauswahl oder Info anzeigen
  //console.log('Clicked:', item)
}

function onFileItemDblClick(item) {
  // Parent Ordner ("..") Handling
  if (item.name === '..' && item.type === 'folder') {
    const path = selectedPath.value
    if (path) {
      const segments = path.split('/').filter(Boolean)
      segments.pop()
      selectedPath.value = segments.join('/')
      nextTick(() => {
        treeView.value?.expandAndScrollToPath(selectedPath.value)
      })
    }
    return
  }
  // Normale Ordnernavigation
  if (item.type === 'folder') {
    onNavigate(item.path)
  } else {
    // Datei-Preview oder Download
    console.log('DoubleClicked file:', item)
  }
}
</script>