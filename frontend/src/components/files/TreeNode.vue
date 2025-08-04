<template>
  <div>
    <a ref="nodeLink" :class="['nav-link', { active: normalizePath(node.path) === normalizePath(selectedPath) }]"
      href="#" @click.prevent="() => { toggle(); $emit('select', node.path) }" :data-path="node.path">
      {{ node.name }}
      <span class="nav-link-toggle" v-if="hasSubfolder"></span>
    </a>

    <nav v-if="hasSubfolder" class="nav nav-vertical" v-show="isOpen" :id="collapseId">
      <TreeNode v-for="(child, i) in sortedChildren" :key="child.path" :node="child" :selectedPath="selectedPath"
        @select="$emit('select', $event)" :ref="el => { childRefs[i] = el }" />
    </nav>
  </div>
</template>

<script setup>
import TreeNode from './TreeNode.vue'
import { useTreeNode } from '@/composables/useTreeNode'
import { ref, defineExpose, watch } from 'vue';

const props = defineProps({
  node: { type: Object, required: true },
  selectedPath: { type: String, required: false }
})

// pull in all your state + funcs from the composable:
const { isOpen, toggle, hasSubfolder, collapseId, sortedChildren } = useTreeNode(props.node)

const childRefs = ref([]);
function expandToPath(path) {
  if (
    props.node.type === 'folder' &&
    path &&
    path.startsWith(props.node.path)
  ) {
    isOpen.value = true;
    childRefs.value.forEach(child => {
      if (child && typeof child.expandToPath === 'function') {
        child.expandToPath(path);
      }
    });
  } else {
    isOpen.value = false;
  }
}

function collapseAllExcept(path) {
  if (
    props.node.type === 'folder' &&
    props.node.path !== path &&
    !(path && path.startsWith(props.node.path + '/'))
  ) {
    isOpen.value = false;
  }
  // Children auch prüfen
  childRefs.value.forEach(child => {
    if (child && typeof child.collapseAllExcept === 'function') {
      child.collapseAllExcept(path);
    }
  });
}

function normalizePath(path) {
  if (!path) return '';
  return path.replace(/\/+$/, ''); // entfernt abschließende Slashes
}
defineExpose({ expandToPath, collapseAllExcept });

watch(
  () => props.selectedPath,
  (newPath) => {
    if (
      props.node.type === 'folder' &&
      newPath &&
      newPath.startsWith(props.node.path)
    ) {
      isOpen.value = true;
    } else {
      isOpen.value = false;
    }
  },
  { immediate: true }
);
</script>