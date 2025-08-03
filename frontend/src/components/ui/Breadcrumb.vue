<script setup>
defineProps({
  segments: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['navigate']);
const isObject = val => typeof val === 'object' && val !== null;
</script>
<template>
  <ol class="breadcrumb breadcrumb-muted mb-0  breadcrumb-truncate">
    <li v-for="(seg, idx) in segments" :key="idx" class="breadcrumb-item"
      :class="{ active: idx === segments.length - 1 }" :aria-current="idx === segments.length - 1 ? 'page' : null">
      <template v-if="idx < segments.length - 1">
        <a
          :href="isObject(seg) ? seg.path : '#'"
          @click.prevent="emit('navigate', isObject(seg) ? seg.path : '')"
          :title="isObject(seg) ? seg.name : seg"
        >
          {{ isObject(seg) ? seg.name : seg }}
        </a>
      </template>
      <template v-else>
        <span :title="isObject(seg) ? seg.name : seg">{{ isObject(seg) ? seg.name : seg }}</span>
      </template>
    </li>
  </ol>
</template>

<style scoped>
.breadcrumb-truncate {
  display: flex;
  flex-wrap: nowrap;
  overflow: hidden;
  white-space: nowrap;
  max-width: 100%;
}
.breadcrumb-truncate .breadcrumb-item {
  min-width: 0;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.breadcrumb-truncate .breadcrumb-item a,
.breadcrumb-truncate .breadcrumb-item span {
  display: inline-block;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
}
</style>