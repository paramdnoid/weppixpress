<template>
  <DefaultLayout>
    <aside class="open col-docs flex-fill">
      <TreeView v-if="treeData?.length" :treeData="treeData" />
    </aside>
    <main class="content">

    </main>
  </DefaultLayout>
</template>

<script setup>
import DefaultLayout from '@/layouts/DefaultLayout.vue';
import TreeView from '@/components/tree/TreeView.vue'
import { computed, onMounted } from 'vue';
import { useFileStore } from '@/stores/file';

const fileStore = useFileStore();
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

onMounted(() => {
  fileStore.fetchFiles();
});
</script>