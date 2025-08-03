<script setup>
import TreeNode from './TreeNode.vue'
import { useTreeNode } from '@/composables/useTreeNode'

const props = defineProps({
  node: { type: Object, required: true },
  selectedPath: { type: String, required: false }
})

// pull in all your state + funcs from the composable:
const { isOpen, toggle, hasSubfolder, collapseId, sortedChildren } = useTreeNode(props.node)
</script>

<template>
  <div>
    <a ref="nodeLink" :class="['nav-link', { active: node.path === selectedPath }]" href="#"
      @click.prevent="() => { toggle(); $emit('select', node.path) }" :data-path="`/${node.path}`"
      :data-bs-toggle="hasSubfolder ? 'collapse' : null" :data-bs-target="hasSubfolder ? '#' + collapseId : null"
      :aria-expanded="isOpen.toString()">
      {{ node.name }}
      <span class="nav-link-toggle" v-if="hasSubfolder"></span>
    </a>

    <nav v-if="hasSubfolder" class="nav nav-vertical collapse" :class="{ show: isOpen }" :id="collapseId">
      <TreeNode v-for="child in sortedChildren" :key="child.path" :node="child" :selectedPath="selectedPath"
        @select="$emit('select', $event)" />
    </nav>
  </div>
</template>