<template>
    <DefaultLayout :treeData="treeData" />
</template>

<script setup>
import DefaultLayout from '@/layouts/DefaultLayout.vue';
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