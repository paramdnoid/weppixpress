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
  <ol class="breadcrumb breadcrumb-muted mb-0">
    <li v-for="(seg, idx) in segments" :key="idx" class="breadcrumb-item"
      :class="{ active: idx === segments.length - 1 }" :aria-current="idx === segments.length - 1 ? 'page' : null">
      <template v-if="idx < segments.length - 1">
        <a :href="isObject(seg) ? seg.path : '#'" @click.prevent="emit('navigate', isObject(seg) ? seg.path : '')">
          {{ isObject(seg) ? seg.name : seg }}
        </a>
      </template>
      <template v-else>
        <span>{{ isObject(seg) ? seg.name : seg }}</span>
      </template>
    </li>
  </ol>
</template>