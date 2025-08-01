<template>
  <nav class="space-y space-y-5 py-3" id="menu">
    <div v-for="(group, index) in treeData" :key="index">
      <div class="subheader mb-2">{{ group.title }}</div>
      <nav class="nav nav-vertical">
        <TreeNode
          v-for="(node, i) in group.items"
          :key="i"
          :node="node"
          @expand="handleExpand"
        />
      </nav>
    </div>
  </nav>
</template>

<script setup>
import TreeNode from './TreeNode.vue'
import { useFileStore } from '@/stores/file'
import { computed } from 'vue'

const props = defineProps({
  treeData: {
    type: Array,
    required: true
  }
});

// File Store holen
const file = useFileStore()

// Handler für expand Event vom TreeNode
const handleExpand = async (path) => {
  const children = await file.loadChildrenForPath(path);
  const targetNode = findNodeByPath(props.treeData, path);
  if (targetNode) {
    targetNode.children = children.map(f => ({
      name: f.name,
      path: f.path,
      type: f.type,
      link: f.type === 'folder' ? null : `/files/${f.path}`,
      children: f.type === 'folder' ? null : undefined
    }));
  }
}

// TreeNode im Tree finden anhand Pfad
function findNodeByPath(groups, path) {
  for (const group of groups) {
    for (const node of group.items) {
      const found = search(node, path);
      if (found) return found;
    }
  }
  return null;
}

function search(node, path) {
  if (node.path === path) return node;
  if (!node.children) return null;
  for (const child of node.children) {
    const found = search(child, path);
    if (found) return found;
  }
  return null;
}
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
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;     /* Firefox */
}
#menu::-webkit-scrollbar {
  display: none;             /* Chrome, Safari, Opera */
}
</style>
