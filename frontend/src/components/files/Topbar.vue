<template>
  <div class="d-flex justify-content-between align-items-center py-1 px-1 bg-body" style="column-gap: 2px;">
    <nav class="nav nav-segmented nav-sm flex-fill" role="tablist">
      <div class="d-flex align-items-center flex-fill" style="column-gap: 1px;">
        <button class="btn btn-sm" @click="$emit('toggle-sidebar')">
          <Icon icon="mdi:file-tree" width="20" height="20" /> 
          <span class="d-none d-lg-block ms-lg-1">Toggle Sidebar</span>
        </button>
        <button class="btn btn-sm" @click="$emit('create-folder')">
          <Icon icon="mdi:folder-plus" class="me-1" width="20" height="20" /> New folder
        </button>
        <div class="ms-auto">
          <button class="btn btn-sm d-none" @click="$emit('refresh')">
            <Icon icon="mdi:refresh" width="20" height="20" />
          </button>
          <button class="btn btn-sm" data-bs-toggle="dropdown">
            <Icon icon="mdi:sort-variant" width="20" height="20" /> 
            <span class="d-none d-lg-block ms-lg-1">SortBy</span>
          </button>
          <ul class="dropdown-menu">
            <li><a class="dropdown-item" href="#" @click.prevent="$emit('sort', 'name')">Name</a></li>
            <li><a class="dropdown-item" href="#" @click.prevent="$emit('sort', 'modified')">Date</a></li>
            <li><a class="dropdown-item" href="#" @click.prevent="$emit('sort', 'size')">Size</a></li>
          </ul>
        </div>
      </div>

    </nav>

    <div class="d-flex">
      <nav class="nav nav-segmented nav-sm" role="tablist">
        <button class="nav-link" :class="{ active: modelValue === 'grid' }" role="tab"
          :aria-selected="modelValue === 'grid'" :aria-current="modelValue === 'grid'"
          @click="$emit('update:modelValue', 'grid')" title="Gridansicht" type="button">
          <Icon icon="mdi:view-grid" width="20" height="20" />
          <span class="d-none d-lg-block">Grid</span>
        </button>
        <button class="nav-link" :class="{ active: modelValue === 'list' }" role="tab"
          :aria-selected="modelValue === 'list'" :aria-current="modelValue === 'list'"
          @click="$emit('update:modelValue', 'list')" title="Listenansicht" type="button">
          <Icon icon="mdi:view-list" width="20" height="20" />
          <span class="d-none d-lg-block">List</span>
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
defineEmits(['refresh', 'create-folder', 'update:modelValue', 'sort', 'toggle-sidebar'])
</script>

<style>
.btn.btn-sm {
  margin: 1px;
  box-shadow: none;
  padding: 2px 5px 3px;
}
</style>