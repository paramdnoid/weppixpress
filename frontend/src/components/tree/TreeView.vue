<template>
  <nav class="space-y space-y-5 px-2" id="menu">
    <div v-for="(group, index) in treeData" :key="index">
      <div class="subheader mb-2">{{ group.title }}</div>
      <nav class="nav nav-vertical">
        <TreeNode
          v-for="(node, i) in group.items"
          :key="i"
          :node="node"
        />
      </nav>
    </div>
  </nav>
</template>

<script setup>
import TreeNode from './TreeNode.vue'

defineProps({
  treeData: {
    type: Array,
    required: true,
  },
})
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
</style>