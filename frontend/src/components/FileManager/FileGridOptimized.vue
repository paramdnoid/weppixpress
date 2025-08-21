<template>
  <div class="optimized-grid" :style="{ height: containerHeight + 'px' }">
    <RecycleScroller
      class="scroller"
      :items="items"
      :item-size="itemSize"
      key-field="path"
      v-slot="{ item, index }"
    >
      <FileGridItem
        :item="item"
        :index="index"
        :is-selected="isSelected(item)"
        @select="$emit('itemSelect', item, $event)"
        @doubleClick="$emit('itemDoubleClick', item)"
      />
    </RecycleScroller>
  </div>
</template>

<script setup lang="ts">
import { withDefaults } from 'vue'
import { RecycleScroller } from 'vue-virtual-scroller'
import FileGridItem from './FileGridItem.vue'

const props = withDefaults(defineProps<{
  items: any[]
  itemSize?: number
  containerHeight?: number
  selectedItems?: Set<string>
}>(), {
  itemSize: 120,
  containerHeight: 600,
  selectedItems: () => new Set()
})

defineEmits(['itemSelect', 'itemDoubleClick'])

const isSelected = (item: any) => {
  return props.selectedItems?.has(item.path) || false
}
</script>

<style scoped>
.optimized-grid {
  width: 100%;
  overflow: hidden;
}

.scroller {
  height: 100%;
  width: 100%;
}
</style>