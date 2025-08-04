<template>
  <div class="d-flex justify-content-between align-items-center p-1 bg-body">
    <nav class="nav nav-segmented nav-sm bg-white" role="tablist">
      <button class="btn btn-sm nav-link" @click="$emit('create-folder')">
        <Icon icon="mdi:folder-plus" class="me-1" width="20" height="20" /> New folder
      </button>
      <button class="nav-link dropdown-toggle" data-bs-toggle="dropdown">
        <Icon icon="mdi:sort-variant" class="me-1" width="20" height="20" /> Sort by
      </button>
      <ul class="dropdown-menu">
        <li><a class="dropdown-item" href="#">Name</a></li>
        <li><a class="dropdown-item" href="#">Date</a></li>
        <li><a class="dropdown-item" href="#">Size</a></li>
      </ul>
      <button class="nav-link" @click="$emit('refresh')">
        <Icon icon="mdi:refresh" class="me-1" width="20" height="20" />
      </button>
    </nav>

    <div class="d-flex">
      <nav class="nav nav-segmented nav-sm" role="tablist">
        <button class="nav-link" :class="{ active: modelValue === 'grid' }" role="tab"
          :aria-selected="modelValue === 'grid'" :aria-current="modelValue === 'grid'"
          @click="$emit('update:modelValue', 'grid')" title="Gridansicht" type="button">
          <Icon icon="mdi:view-grid" width="20" height="20" class="me-1" />
          Grid
        </button>
        <button class="nav-link" :class="{ active: modelValue === 'list' }" role="tab"
          :aria-selected="modelValue === 'list'" :aria-current="modelValue === 'list'"
          @click="$emit('update:modelValue', 'list')" title="Listenansicht" type="button">
          <Icon icon="mdi:view-list" width="20" height="20" class="me-1" />
          Liste
        </button>
      </nav>
    </div>

  </div>
</template>

<script setup>
import { Icon } from '@iconify/vue'

defineProps({
  modelValue: {
    type: String,
    required: true
  }
})
defineEmits(['refresh', 'create-folder', 'update:modelValue'])
</script>