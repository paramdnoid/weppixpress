<template>
  <DefaultLayout>
    <aside class="open col-docs flex-fill">
      <TreeView ref="treeView" v-if="treeData?.length" :treeData="treeData" :selectedPath="selectedPath"
        @select="selectedPath = $event" />
    </aside>

    <main class="content p-3">
      <Breadcrumb :segments="breadcrumbItems" @navigate="onNavigate" />
    </main>
  </DefaultLayout>
</template>

<script setup>
import DefaultLayout from '@/layouts/DefaultLayout.vue';
import TreeView from '@/components/tree/TreeView.vue'
import Breadcrumb from '@/components/ui/Breadcrumb.vue'
import { ref, computed, onMounted, nextTick } from 'vue';
import { useFileStore } from '@/stores/file';

const fileStore = useFileStore();
const selectedPath = ref('');
const treeView = ref(null);
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
</script>