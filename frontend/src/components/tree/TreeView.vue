<template>
  <nav class="space-y space-y-5 py-3" id="menu" ref="treeRoot">
    <div v-for="(group, index) in treeData" :key="index">
      <div class="subheader mb-2">{{ group.title }}</div>
      <nav class="nav nav-vertical">
        <TreeNode v-for="(node, i) in group.items" :key="i" :node="node" :selectedPath="selectedPath"
          @select="$emit('select', $event)" />
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

import { ref, nextTick, defineExpose } from 'vue';
const treeRoot = ref(null);

function scrollToPath(path) {
  nextTick(() => {

    const el = treeRoot.value?.querySelector(`[data-path="${path}"]`);
    if (el) el.classList.add('active');
  });
}

defineExpose({ scrollToPath });
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
}

#menu::-webkit-scrollbar {
  display: none;
  /* Chrome, Safari, Opera */
}
</style>
