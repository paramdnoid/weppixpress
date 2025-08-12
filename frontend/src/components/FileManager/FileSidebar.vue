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
        <nav class="nav nav-vertical" v-for="group in props.treeData" :key="group.id || group.title || Math.random().toString(36)">

          <!-- Error State -->
          <div v-if="group.error" class="alert alert-warning m-2">
            <i class="icon ti ti-alert-triangle"></i>
            {{ group.error }}
          </div>
          
          <!-- Loading State for Root -->
          <div v-else-if="group.loading && (!group.items || group.items.length === 0)" 
               class="d-flex justify-content-center p-3">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
          </div>
          
          <!-- Empty State -->
          <div v-else-if="!group.loading && group.items.length === 0" 
               class="text-muted text-center p-3">
            No files found
          </div>
          
          <!-- Tree Nodes -->
          <TreeNode 
            v-for="node in group.items" 
            :key="node.path" 
            :node="node" 
            :selectedPath="selectedPath"
            :loadChildren="props.loadChildren" 
            @nodeToggle="(event) => emit('nodeToggle', event)" 
          />
        </nav>
      </nav>
    </div>
  </aside>
</template>

<script setup>
import { computed, ref } from 'vue'
import TreeNode from './FileTreeNode.vue'

const props = defineProps({
  isCollapsed: { type: Boolean, default: false },
  width: { type: Number, default: 250 },
  treeData: { type: Array, required: true },
  selectedPath: { type: String, default: '' },
  loadChildren: { type: Function, required: true }
})

const emit = defineEmits(['nodeToggle', 'treeUpdate'])

// Refs
const sidebarElement = ref(null)
const treeRoot = ref(null)

// Computed
const sidebarStyle = computed(() => ({
  width: props.isCollapsed ? '0' : `${props.width}px`,
  minWidth: props.isCollapsed ? '0' : 'auto'
}))

// Expose methods and data
defineExpose({
  sidebarElement,
  treeRoot
})
</script>

<style scoped>
.sidebar {
  min-width: 0;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  will-change: width, min-width;
  flex-shrink: 0;
  background: var(--bs-body-bg, white);
}

.sidebar.w-0 {
  width: 0 !important;
  min-width: 0 !important;
}

.nav-group-title {
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-size: 0.75rem;
  opacity: 0.7;
  border-bottom: 1px solid var(--tblr-border-color, #dee2e6);
  margin-bottom: 0.5rem;
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
  max-height: calc(100vh - 2rem);
  padding-bottom: 1rem;
}

#menu::-webkit-scrollbar {
  width: 8px;
}

#menu::-webkit-scrollbar-track {
  background: var(--tblr-gray-50, #f8f9fa);
}

#menu::-webkit-scrollbar-thumb {
  background: var(--tblr-gray-300, #dee2e6);
  border-radius: 4px;
}

#menu::-webkit-scrollbar-thumb:hover {
  background: var(--tblr-gray-400, #ced4da);
}

/* Smooth animations */
.nav-vertical {
  transition: all 0.3s ease;
}

/* Loading indicator styles */
.spinner-border {
  width: 1.5rem;
  height: 1.5rem;
  border-width: 0.2em;
}

/* Alert styles */
.alert {
  font-size: 0.875rem;
  padding: 0.5rem 0.75rem;
}
</style>