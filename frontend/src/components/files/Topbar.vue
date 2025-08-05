<template>
  <div class="topbar d-flex justify-content-between align-items-center py-1 px-1 bg-body gap-1">
    <nav class="d-flex align-items-center flex-fill gap-1" role="toolbar">
      <button type="button" class="btn btn-sm" @click="toggleSidebar">
        <Icon icon="mdi:file-tree" width="20" height="20" />
        <span class="d-none d-lg-inline ms-1">Toggle Sidebar</span>
      </button>
      <button type="button" class="btn btn-sm" @click="createFolder">
        <Icon icon="mdi:folder-plus" width="20" height="20" class="me-1" />
        New Folder
      </button>
      <div class="ms-auto position-relative">
        <button
          type="button"
          class="btn btn-sm"
          data-bs-toggle="dropdown"
          aria-expanded="false"
        >
          <Icon icon="mdi:sort-variant" width="20" height="20" />
          <span class="d-none d-lg-inline ms-1">Sort By</span>
        </button>
        <ul class="dropdown-menu dropdown-menu-end">
          <li
            v-for="option in sortOptions"
            :key="option.value"
          >
            <a
              href="#"
              class="dropdown-item"
              @click.prevent="onSort(option.value)"
            >
              {{ option.label }}
            </a>
          </li>
        </ul>
      </div>
    </nav>

    <nav class="nav nav-segmented nav-sm" role="tablist">
      <button
        v-for="mode in viewModes"
        :key="mode.value"
        type="button"
        class="nav-link"
        :class="{ active: modelValue === mode.value }"
        :aria-selected="modelValue === mode.value"
        :aria-current="modelValue === mode.value"
        @click="updateView(mode.value)"
        :title="mode.title"
      >
        <Icon :icon="mode.icon" width="20" height="20" />
        <span class="d-none d-lg-inline ms-1">{{ mode.label }}</span>
      </button>
    </nav>
  </div>
</template>

<script setup>
import { Icon } from '@iconify/vue'

const props = defineProps({
  modelValue: {
    type: String,
    required: true
  }
})

const emit = defineEmits([
  'toggle-sidebar',
  'create-folder',
  'sort',
  'update:modelValue'
])

const sortOptions = [
  { value: 'name', label: 'Name' },
  { value: 'modified', label: 'Date' },
  { value: 'size', label: 'Size' }
]

const viewModes = [
  { value: 'grid', icon: 'mdi:view-grid', title: 'Grid view', label: 'Grid' },
  { value: 'list', icon: 'mdi:view-list', title: 'List view', label: 'List' }
]

function toggleSidebar() {
  emit('toggle-sidebar')
}

function createFolder() {
  emit('create-folder')
}

function onSort(key) {
  emit('sort', key)
}

function updateView(mode) {
  emit('update:modelValue', mode)
}
</script>

<style scoped>
.topbar .btn {
  margin: 1px;
  box-shadow: none;
  padding: 2px 5px 3px;
}
</style>