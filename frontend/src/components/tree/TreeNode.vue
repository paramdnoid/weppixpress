<script setup>
import TreeNode from './TreeNode.vue'
import { useTreeNode } from '@/composables/useTreeNode'

const props = defineProps({
  node: { type: Object, required: true }
})

// pull in all your state + funcs from the composable:
const { isOpen, toggle, hasSubfolder, collapseId, sortedChildren } =
  useTreeNode(props.node)
</script>

<template>
  <div>
    <a
      class="nav-link"
      href="#"
      @click.prevent="toggle"
      :data-bs-toggle="hasSubfolder ? 'collapse' : null"
      :data-bs-target="hasSubfolder ? '#' + collapseId : null"
      :aria-expanded="isOpen.toString()"
    >
      {{ node.label || node.name }}
      <span class="nav-link-toggle" v-if="hasSubfolder">
        <i :class="isOpen ? 'ti ti-chevron-down' : 'ti ti-chevron-right'"/>
      </span>
    </a>

    <nav
      v-if="hasSubfolder"
      class="nav nav-vertical collapse"
      :class="{ show: isOpen }"
      :id="collapseId"
    >
      <TreeNode
        v-for="child in sortedChildren"
        :key="child.path"
        :node="child"
      />
    </nav>
  </div>
</template>