<template>
  <FileItemBase
    :item="item"
    :is-selected="isSelected"
    :icon-size="48"
    :tabindex="tabindex"
    class="explorer-item file-grid-item"
    role="gridcell"
    @click="$emit('click', item, $event)"
    @dblclick="$emit('dblclick', item, $event)"
    @contextmenu="$emit('contextmenu', item, $event)"
  >
    <template #default="{ item: fileItem }">
      <div class="icon-wrap">
        <FileIcon
          :item="fileItem"
          :size="48"
          class="explorer-icon"
        />
      </div>
      <div
        class="explorer-label"
        :title="fileItem.name"
        v-text="fileItem.name"
      />
    </template>
  </FileItemBase>
</template>

<script setup>
import FileItemBase from './FileItemBase.vue'
import FileIcon from './FileIcon.vue'

defineProps({
  item: {
    type: Object,
    required: true
  },
  isSelected: {
    type: Boolean,
    default: false
  },
  tabindex: {
    type: Number,
    default: -1
  }
})

defineEmits(['click', 'dblclick', 'contextmenu'])
</script>

<style scoped>
.explorer-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  outline: none;
  cursor: pointer;
  transition: all 0.15s ease;
  border-radius: 8px;
  padding: 12px 8px 8px;
  position: relative;
  border: 1px solid transparent;
  background: transparent;
}

.explorer-item.selected {
  background: var(--tblr-gray-100);
  border-color: var(--tblr-gray-200);
}

.explorer-item:hover {
  background-color: var(--tblr-gray-50);
  transform: translateY(-1px);
}

.icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 64px;
  width: 64px;
  margin-bottom: 8px;
}

.explorer-icon {
  font-size: 48px;
  width: 48px;
  height: 48px;
  display: block;
  transition: transform 0.15s ease;
}

.explorer-item:hover .explorer-icon {
  transform: scale(1.05);
}

.explorer-label {
  width: 100%;
  text-align: center;
  font-size: 0.875rem;
  font-weight: 400;
  color: var(--tblr-dark);
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
  line-height: 1.3;
  user-select: none;
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .explorer-item,
  .explorer-icon {
    transition: none;
  }

  .explorer-item:hover {
    transform: none;
  }

  .explorer-item:hover .explorer-icon {
    transform: none;
  }
}
</style>