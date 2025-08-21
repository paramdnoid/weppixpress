<template>
  <div class="virtual-grid-container" @scroll="onScroll" :style="{ height: containerHeight + 'px' }">
    <div class="virtual-grid-spacer" :style="{ height: totalHeight + 'px' }">
      <div class="virtual-grid-content" :style="{ transform: `translateY(${offsetY}px)` }">
        <FileGridItem
          v-for="(item, index) in visibleItems"
          :key="getItemKey(item)"
          :item="item"
          :index="startIndex + index"
          :is-selected="isSelected(item)"
          @select="$emit('itemSelect', item, $event)"
          @doubleClick="$emit('itemDoubleClick', item)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { withDefaults } from 'vue'
import { useVirtualScroll } from '@/composables/useVirtualScroll'
import FileGridItem from './FileGridItem.vue'

const props = withDefaults(defineProps<{
  items: any[]
  itemHeight?: number
  containerHeight?: number
  selectedItems?: Set<string>
  getItemKey?: (item: any) => string
}>(), {
  itemHeight: 120,
  containerHeight: 600,
  selectedItems: () => new Set(),
  getItemKey: (item: any) => item.path || item.name
})

const emit = defineEmits(['itemSelect', 'itemDoubleClick'])

const {
  visibleItems,
  totalHeight,
  offsetY,
  onScroll,
  startIndex
} = useVirtualScroll(props.items, {
  itemHeight: props.itemHeight,
  containerHeight: props.containerHeight,
  overscan: 3
})

const isSelected = (item: any) => {
  return props.selectedItems?.has(props.getItemKey(item)) || false
}
</script>

<style scoped>
.virtual-grid-container {
  width: 100%;
  overflow-y: auto;
  overflow-x: hidden;
}

.virtual-grid-spacer {
  position: relative;
}

.virtual-grid-content {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 0.75rem;
  padding: 1rem;
}
</style>