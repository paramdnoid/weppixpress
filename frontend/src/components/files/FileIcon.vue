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
// @ts-expect-error -- JS composable has no d.ts yet
import { useFiles } from '@/composables/useFiles';
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

const { getFileIcon, getFileColor } = useFiles() as { getFileIcon: (item: FileItem) => string; getFileColor: (item: FileItem) => string; };

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