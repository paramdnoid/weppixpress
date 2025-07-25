<template>
  <div>
    <a
      class="nav-link"
      :href="node.link || '#'"
      v-if="!hasChildren"
    >
      {{ node.label }}
    </a>

    <div v-else>
      <a
        class="nav-link"
        href="#"
        @click.prevent="toggle"
        :data-bs-toggle="`collapse`"
        :data-bs-target="`#${collapseId}`"
        :aria-expanded="isOpen.toString()"
      >
        {{ node.label }}
        <span class="nav-link-toggle"></span>
      </a>

      <nav
        class="nav nav-vertical collapse"
        :class="{ show: isOpen }"
        :id="collapseId"
      >
        <div v-for="(child, idx) in node.children" :key="idx">
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

const isOpen = ref(true)
const toggle = () => (isOpen.value = !isOpen.value)

const hasChildren = computed(() => props.node.children && props.node.children.length > 0)
const collapseId = `collapse-${btoa(props.node.label).replace(/=/g, '')}`
</script>

<style scoped>
.nav-link-toggle {
  float: right;
}
</style>