<template>
  <div 
    class="file-icon-wrapper" 
    :style="{ 
      width: `${size}px`, 
      height: `${size}px` 
    }"
  >
    <Icon 
      :icon="fileIcon" 
      :width="size" 
      :height="size"
      :class="`text-${fileColor}`"
      :style="{ fontSize: `${size}px` }"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Icon } from '@iconify/vue';
import { useFileManager } from '@/composables/useFileManager';
import type { FileItem } from '../../types';

interface Props {
  item: FileItem;
  size?: number;
  lazy?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  size: 24,
  lazy: false
});

const { getFileIcon, getFileColor } = useFileManager();

const fileIcon = computed(() => getFileIcon(props.item));
const fileColor = computed(() => getFileColor(props.item));
</script>

<style scoped lang="scss">
.file-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
</style>