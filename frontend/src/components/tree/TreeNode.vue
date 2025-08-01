<template>
  <div>
    <div v-if="node && node.type === 'folder' || !node.type">


      <a class="nav-link" href="#" @click.prevent="toggle" :data-bs-toggle="hasChildren ? 'collapse' : null"
        :data-bs-target="hasChildren ? '#' + collapseId : null" :aria-expanded="isOpen.toString()">
        {{ node.label || node.name }}
        <span class="nav-link-toggle" v-if="hasChildren">
          <i :class="isOpen ? 'ti ti-chevron-down' : 'ti ti-chevron-right'"></i>
        </span>
      </a>

      <nav v-if="hasChildren" class="nav nav-vertical collapse" :class="{ show: isOpen }" :id="collapseId">
        <div v-for="(child, idx) in sortedChildren" :key="idx">
          <TreeNode :node="child" />
        </div>
      </nav>
    </div>

        <!-- Datei -->
    <div v-else-if="node">
      <span class="nav-link disabled">{{ node.name }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import TreeNode from './TreeNode.vue'

const props = defineProps({
  node: {
    type: Object,
    required: true,
  },
})

const isOpen = ref(false)
const toggle = () => (isOpen.value = !isOpen.value)

const hasChildren = computed(() => props.node.children && props.node.children.length > 0)
const collapseId = `collapse-${btoa(props.node.name).replace(/=/g, '')}`

const sortedChildren = computed(() => {
  return [...(props.node.children || [])].sort((a, b) => {
    if (a.type === b.type) return a.name.localeCompare(b.name);
    return a.type === 'folder' ? -1 : 1;
  });
});
</script>

<style scoped>
.nav-link-toggle {
  float: right;
}
</style>