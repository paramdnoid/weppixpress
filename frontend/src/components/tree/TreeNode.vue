<template>
  <div>
    <div v-if="node && node.type === 'folder' || !node.type">
      <a class="nav-link" href="#" @click.prevent="toggle" :data-bs-toggle="hasSubfolder ? 'collapse' : null"
        :data-bs-target="hasSubfolder ? '#' + collapseId : null" :aria-expanded="isOpen.toString()">
        {{ node.label || node.name }}
        <span class="nav-link-toggle" v-if="hasSubfolder"></span>
      </a>

      <nav v-if="hasSubfolder" class="nav nav-vertical collapse" :class="{ show: isOpen }" :id="collapseId">
        <div v-for="(child, idx) in sortedChildren" :key="idx">
          <TreeNode :node="child" />
        </div>
      </nav>
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
const hasSubfolder = computed(() =>
  (props.node.children || []).some(child => child.type === 'folder')
);
const collapseId = computed(() => props.node.path.replace(/[^\w-]/g, '_'));
const sortedChildren = computed(() => {
  return [...(props.node.children || [])]
    .filter(child => child.type === 'folder')
    .sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === 'folder' ? -1 : 1;
    });
});
</script>

<style scoped>

</style>