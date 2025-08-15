<template>
  <div class="topbar d-flex justify-content-between align-items-center py-1 px-1 bg-body gap-1">
    <nav class="d-flex align-items-center flex-fill gap-1" role="toolbar">
      <!-- Sidebar Toggle -->
      <button 
        type="button" 
        class="btn btn-sm" 
        @click="$emit('toggleSidebar')"
        :aria-label="isSidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'"
      >
        <Icon icon="mdi:file-tree" width="20" height="20" />
        <span class="d-none d-lg-inline ms-1">Toggle Sidebar</span>
      </button>

      <!-- New Folder -->
      <button 
        type="button" 
        class="btn btn-sm" 
        @click="$emit('createFolder')" 
        :disabled="isLoading"
        aria-label="Create new folder"
      >
        <Icon icon="mdi:folder-plus" width="20" height="20" class="me-1" />
        New Folder
      </button>

      <!-- Upload Button -->
      <label class="btn btn-sm btn-outline-primary position-relative">
        <Icon icon="mdi:upload" width="20" height="20" class="me-1" />
        Upload
        <input 
          ref="fileInput" 
          type="file" 
          multiple 
          class="d-none" 
          @change="handleFileUpload"
          :disabled="isLoading || isUploading" 
        />
        <div 
          v-if="isUploading" 
          class="position-absolute top-0 start-0 h-100 bg-primary opacity-25"
          :style="`width: ${uploadProgress}%`"
        />
      </label>

      <!-- Sort Options -->
      <div class="ms-auto position-relative">
        <button 
          type="button" 
          class="btn btn-sm" 
          data-bs-toggle="dropdown" 
          aria-expanded="false"
          aria-label="Sort options"
        >
          <Icon icon="mdi:sort-variant" width="20" height="20" />
          <span class="d-none d-lg-inline ms-1">Sort By</span>
        </button>
        <ul class="dropdown-menu dropdown-menu-end">
          <li v-for="option in sortOptions" :key="option.value">
            <button 
              type="button" 
              class="dropdown-item d-flex align-items-center justify-content-between"
              @click="$emit('sort', option.value)"
            >
              {{ option.label }}
              <Icon 
                v-if="sortKey === option.value" 
                :icon="sortDir === 'asc' ? 'mdi:arrow-up' : 'mdi:arrow-down'"
                width="16" 
                height="16" 
              />
            </button>
          </li>
        </ul>
      </div>
    </nav>

    <!-- View Mode Selector -->
    <nav class="nav nav-segmented nav-sm" role="tablist">
      <button 
        v-for="mode in viewModes" 
        :key="mode.key" 
        type="button" 
        class="nav-link"
        :class="{ active: viewMode === mode.key }" 
        :aria-selected="viewMode === mode.key"
        @click="$emit('viewMode', mode.key)" 
        :title="mode.title"
      >
        <Icon :icon="mode.icon" width="20" height="20" />
        <span class="d-none d-lg-inline ms-1">{{ mode.label }}</span>
      </button>
    </nav>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  isSidebarCollapsed: { type: Boolean, default: false },
  isLoading: { type: Boolean, default: false },
  isUploading: { type: Boolean, default: false },
  uploadProgress: { type: Number, default: 0 },
  sortKey: { type: String, default: 'name' },
  sortDir: { type: String, default: 'asc' },
  sortOptions: { type: Array, required: true },
  viewMode: { type: String, default: 'grid' },
  viewModes: { type: Array, required: true }
})

const emit = defineEmits([
  'toggleSidebar',
  'createFolder', 
  'fileUpload',
  'sort',
  'viewMode'
])

const fileInput = ref(null)

function handleFileUpload(event) {
  emit('fileUpload', event)
}
</script>