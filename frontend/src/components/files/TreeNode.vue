<template>
  <div>
    <a ref="nodeLink" :class="['nav-link', { active: isActive }]" href="#" @click.prevent="handleClick"
      :data-path="node.path">
      {{ node.name }}
      <span class="nav-link-toggle" v-if="hasSubfolder" />
    </a>

    <nav v-if="hasSubfolder" class="nav nav-vertical" v-show="isOpen" :id="collapseId">
      <TreeNode v-for="(child, i) in sortedChildren" :key="child.path" :node="child" :selectedPath="selectedPath"
        @select="emitSelect" :ref="el => {
          // ensure the array exists
          childRefs.value = childRefs.value || [];
          childRefs.value[i] = el;
        }" />
    </nav>
  </div>
</template>

<script setup>
import TreeNode from './TreeNode.vue'
import { useTreeNode } from '@/composables/useTreeNode'
import { ref, defineExpose, watch, defineEmits, computed } from 'vue';

const props = defineProps({
  node: { type: Object, required: true },
  selectedPath: { type: String, required: false }
})

const emit = defineEmits(['select']);
const isActive = computed(() => {
  const normalize = path => path?.replace(/\/+$/, '') || '';
  return normalize(props.node.path) === normalize(props.selectedPath);
});

// pull in all your state + funcs from the composable:
const { isOpen, toggle, hasSubfolder, collapseId, sortedChildren } = useTreeNode(props.node)

const childRefs = ref([]);

function handleClick() {
  toggle();
  emit('select', props.node.path);
}

function emitSelect(path) {
  emit('select', path);
}
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