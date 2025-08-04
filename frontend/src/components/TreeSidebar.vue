<template>
    <aside class="open col-docs flex-fill">
      <TreeView ref="treeView" v-if="items?.length" :treeData="items" :selectedPath="selectedPath"
        @select="selectedPath = $event" />
    </aside>
</template>

<script setup>
import TreeView from '@/components/tree/TreeView.vue'
import { Icon } from '@iconify/vue';

defineProps({ items: Array, selected: String })
defineEmits(['select'])
</script>