<template>
  <div>
    <a ref="nodeLink" :class="['nav-link', { active: isActive }]" href="#"
      :data-path="node.path" @click.prevent="toggleOpen">
      {{ node.name }}
      <span class="nav-link-toggle" v-if="hasSubfolder" />
    </a>

    <nav v-if="hasSubfolder" class="nav nav-vertical" v-show="isOpen" :id="collapseId">
      <TreeNode
        v-for="(child, i) in sortedChildren"
        :key="child.path"
        :node="child"
        :selectedPath="selectedPath"
        :loadChildren="loadChildren"
      />
      <div v-if="loading" class="ps-3 text-muted small">Loading…</div>
    </nav>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useFileStore } from '@/stores/files'
import TreeNode from './TreeNode.vue'

const props = defineProps({
  node: { type: Object, required: true },
  selectedPath: { type: String, required: false },
  loadChildren: { type: Function, required: false }
})

const fileStore = useFileStore()

const isOpen = ref(false)
const loading = ref(false)
const children = ref(props.node.children ?? null)

const collapseId = computed(() => `collapse-${props.node.path}`)

const hasSubfolder = computed(() => Array.isArray(children.value) && children.value.length > 0)

const sortedChildren = computed(() => {
  return [...(children.value || [])].sort((a, b) => {
    if (a.type === 'folder' && b.type !== 'folder') return -1
    if (a.type !== 'folder' && b.type === 'folder') return 1
    return a.name.localeCompare(b.name)
  })
})

const isActive = computed(() => props.node.path === fileStore.selectedPath)

const toggleOpen = async () => {
  if (!isOpen.value && children.value === null && props.node.type === 'folder' && props.loadChildren) {
    loading.value = true
    children.value = await props.loadChildren(props.node)
    loading.value = false
  }
  isOpen.value = !isOpen.value
}
</script>