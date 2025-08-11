<template>
  <aside 
    ref="sidebarElement" 
    class="border-end sidebar" 
    :class="{ 'w-0': isCollapsed }" 
    :style="sidebarStyle"
    :aria-hidden="isCollapsed"
  >
    <div class="col-docs flex-fill p-1">
      <nav id="menu" ref="treeRoot">
        <nav class="nav nav-vertical" v-for="group in treeData" :key="group.title">
          <div v-if="group.error" class="alert alert-warning m-2">
            <i class="icon ti ti-alert-triangle"></i>
            Authentication required to view files
          </div>
          <div v-else-if="group.loading" class="d-flex justify-content-center p-3">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
          </div>
          <div v-else-if="group.items.length === 0" class="text-muted text-center p-3">
            No files found
          </div>
          <TreeNode 
            v-for="node in group.items" 
            :key="node.path" 
            :node="node" 
            :selectedPath="selectedPath"
            :loadChildren="loadChildren" 
            @nodeSelect="$emit('nodeSelect', $event)" 
            @nodeToggle="$emit('nodeToggle', $event)" 
          />
        </nav>
      </nav>
    </div>
  </aside>
</template>

<script setup>
import { computed, ref } from 'vue'
import TreeNode from './TreeNode.vue'

const props = defineProps({
  isCollapsed: { type: Boolean, default: false },
  width: { type: Number, default: 250 },
  treeData: { type: Array, required: true },
  selectedPath: { type: String, default: '' },
  loadChildren: { type: Function, required: true }
})

defineEmits(['nodeSelect', 'nodeToggle'])

const sidebarElement = ref(null)
const treeRoot = ref(null)

const sidebarStyle = computed(() => ({
  width: props.isCollapsed ? '0' : `${props.width}px`
}))

defineExpose({
  sidebarElement,
  treeRoot
})
</script>

<style scoped>
.sidebar {
  min-width: 0;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  will-change: width;
  flex-shrink: 0;
}

.sidebar.w-0 {
  width: 0 !important;
  min-width: 0 !important;
}

@media (max-width: 768px) {
  .sidebar:not(.w-0) {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    z-index: 1000;
    background: white;
    box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
  }
}

#menu {
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  max-height: 100vh;
}

#menu::-webkit-scrollbar {
  width: 8px;
}

#menu::-webkit-scrollbar-track {
  background: var(--tblr-gray-50);
}

#menu::-webkit-scrollbar-thumb {
  background: var(--tblr-gray-300);
  border-radius: 4px;
}

#menu::-webkit-scrollbar-thumb:hover {
  background: var(--tblr-gray-400);
}
</style>