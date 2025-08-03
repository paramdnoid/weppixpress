<template>
  <nav class="space-y space-y-5 py-3" id="menu" ref="treeRoot">
    <div v-for="(group, index) in treeData" :key="index">
      <div class="subheader mb-2">{{ group.title }}</div>
      <nav class="nav nav-vertical">
        <TreeNode
          v-for="(node, i) in group.items"
          :key="i"
          :node="node"
          :selectedPath="selectedPath"
          @select="$emit('select', $event)"
          :ref="el => {
            if (!treeNodeRefs.value) treeNodeRefs.value = [];
            treeNodeRefs.value[i] = el;
          }"
        />
      </nav>
    </div>
  </nav>
</template>

<script setup>
import TreeNode from './TreeNode.vue'

const props = defineProps({
  treeData: {
    type: Array,
    required: true
  },
  selectedPath: {
    type: String,
    required: false
  }
});

import { ref, nextTick, defineExpose, watch } from 'vue';
const treeRoot = ref(null);
const treeNodeRefs = ref([]);

function scrollToPath(path) {
  nextTick(() => {
    const menu = treeRoot.value;
    if (!menu) return;
    const el = menu.querySelector(`[data-path="${path}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });
}

function expandAndScrollToPath(path) {
  treeNodeRefs.value.forEach(ref => {
    if (ref && typeof ref.expandToPath === 'function') ref.expandToPath(path);
  });
  nextTick(() => scrollToPath(path));
}

defineExpose({ scrollToPath, expandAndScrollToPath });

watch(() => props.selectedPath, (newPath) => {
  expandAndScrollToPath(newPath);
});
</script>

<style scoped>
.subheader {
  font-weight: bolder;
  font-size: 0.8rem;
  letter-spacing: -0.2px;
  color: var(--tblr-muted);
  text-transform: uppercase;
  margin-left: .5rem;
}

/* Hide scrollbar but allow scrolling */
#menu {
  overflow-y: auto;
  -ms-overflow-style: none;
  /* IE and Edge */
  scrollbar-width: none;
  /* Firefox */
  max-height: 100vh;
}

#menu::-webkit-scrollbar {
  display: none;
  /* Chrome, Safari, Opera */
}
</style>
