<template>
  <nav class="nav nav-segmented nav-sm" role="tablist">
    <button
      class="nav-link"
      :class="{ active: modelValue === 'grid' }"
      role="tab"
      :aria-selected="modelValue === 'grid'"
      :aria-current="modelValue === 'grid'"
      @click="$emit('update:modelValue', 'grid')"
      title="Gridansicht"
      type="button"
    >
      <Icon icon="mdi:view-grid" width="20" height="20" class="me-1" />
      Grid
    </button>
    <button
      class="nav-link"
      :class="{ active: modelValue === 'list' }"
      role="tab"
      :aria-selected="modelValue === 'list'"
      :aria-current="modelValue === 'list'"
      @click="$emit('update:modelValue', 'list')"
      title="Listenansicht"
      type="button"
    >
      <Icon icon="mdi:view-list" width="20" height="20" class="me-1" />
      Liste
    </button>
  </nav>
</template>

<script setup>
import { Icon } from '@iconify/vue'

defineProps({
  modelValue: {
    type: String,
    required: true
  }
})
</script>