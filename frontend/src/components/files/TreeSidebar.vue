<template>
  <div class="col-docs flex-fill p-1">
    <nav id="menu" ref="treeRoot">
      <nav class="nav nav-vertical" v-for="group in treeData" :key="group.title">
        <TreeNode
          v-for="node in group.items"
          :key="node.path"
          :node="node"
          :selectedPath="selectedPath"
          @select="$emit('select', $event)"
          ref="treeNodeRefs"
        />
      </nav>
    </nav>
  </div>
</template>

<script setup>
import TreeNode from './TreeNode.vue'
import { ref, nextTick, defineExpose, watch } from 'vue';

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

function collapseAllExcept(path) {
  treeNodeRefs.value.forEach(ref => {
    if (ref && typeof ref.collapseAllExcept === 'function') ref.collapseAllExcept(path);
  });
}

function expandAndScrollToPath(path) {
  collapseAllExcept(path);
  treeNodeRefs.value.forEach(ref => {
    if (ref && typeof ref.expandToPath === 'function') ref.expandToPath(path);
  });
  nextTick(() => scrollToPath(path));
}

defineExpose({ scrollToPath, expandAndScrollToPath, collapseAllExcept });

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
