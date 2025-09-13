<template>
  <div class="topbar d-flex justify-content-between align-items-center py-1 px-1 bg-body gap-1">
    <nav
      class="d-flex align-items-center flex-fill gap-1"
      role="toolbar"
    >
      <!-- Sidebar Toggle -->
      <button
        type="button"
        class="btn btn-sm nav-link-sized"
        :aria-label="isSidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'"
        @click="$emit('toggleSidebar')"
      >
        <Icon
          icon="mdi:file-tree"
          width="20"
          height="20"
        />
        <span class="d-none d-lg-inline ms-1">Toggle Sidebar</span>
      </button>


      <!-- Menu Dropdown -->
      <div class="position-relative">
        <button
          type="button"
          class="btn btn-sm nav-link-sized"
          data-bs-toggle="dropdown"
          aria-expanded="false"
          aria-label="Menu"
        >
          <Icon
            icon="mdi:menu"
            width="20"
            height="20"
          />
          <span class="d-none d-lg-inline ms-1">Menu</span>
        </button>
        <ul class="dropdown-menu dropdown-menu-end">
          <li>
            <button
              type="button"
              class="dropdown-item d-flex align-items-center"
              :disabled="isLoading"
              @click="$emit('createFolder')"
            >
              <Icon
                icon="mdi:folder-plus"
                width="16"
                height="16"
                class="me-2"
              />
              New Folder
            </button>
          </li>
          <li>
            <hr class="dropdown-divider">
          </li>
          <li>
            <div class="px-3 py-2">
              <label class="d-flex align-items-center cursor-pointer mb-0">
                <input
                  type="file"
                  multiple
                  class="d-none"
                  @change="handleFileUpload"
                >
                <Icon
                  icon="mdi:upload"
                  width="16"
                  height="16"
                  class="me-2"
                />
                Upload Files
              </label>
            </div>
          </li>
          <li>
            <div class="px-3 py-2">
              <label class="d-flex align-items-center cursor-pointer mb-0">
                <input
                  type="file"
                  webkitdirectory
                  class="d-none"
                  @change="handleFolderUpload"
                >
                <Icon
                  icon="mdi:folder-upload"
                  width="16"
                  height="16"
                  class="me-2"
                />
                Upload Folder
              </label>
            </div>
          </li>
          <li v-if="selectedCount > 0">
            <hr class="dropdown-divider">
          </li>
          <li v-if="selectedCount > 0">
            <button
              type="button"
              class="dropdown-item d-flex align-items-center"
              :disabled="isLoading"
              @click="$emit('copySelected')"
            >
              <Icon
                icon="mdi:content-copy"
                width="16"
                height="16"
                class="me-2"
              />
              Copy (<span v-text="selectedCount" />)
            </button>
          </li>
          <li v-if="selectedCount > 0">
            <button
              type="button"
              class="dropdown-item d-flex align-items-center"
              :disabled="isLoading"
              @click="$emit('cutSelected')"
            >
              <Icon
                icon="mdi:content-cut"
                width="16"
                height="16"
                class="me-2"
              />
              Cut (<span v-text="selectedCount" />)
            </button>
          </li>
          <li>
            <button
              type="button"
              class="dropdown-item d-flex align-items-center"
              :disabled="isLoading || (!clipboardHasItems && clipboardItemCount === 0)"
              @click="$emit('pasteItems')"
            >
              <Icon
                icon="mdi:content-paste"
                width="16"
                height="16"
                class="me-2"
              />
              Paste<span v-if="clipboardItemCount > 0"> (<span v-text="clipboardItemCount" />)</span>
            </button>
          </li>
          <li v-if="selectedCount > 0">
            <hr class="dropdown-divider">
          </li>
          <li v-if="selectedCount > 0">
            <button
              type="button"
              class="dropdown-item d-flex align-items-center text-danger"
              :disabled="isLoading"
              @click="$emit('deleteSelected')"
            >
              <Icon
                icon="mdi:delete"
                width="16"
                height="16"
                class="me-2"
              />
              Delete (<span v-text="selectedCount" />)
            </button>
          </li>
        </ul>
      </div>

      <!-- Search Input -->
      <div class="input-icon position-relative flex-fill">
        <input
          ref="searchInput"
          v-model="searchQuery"
          type="text"
          class="form-control form-control-sm shadow-none"
          placeholder="Search in files…"
          aria-label="Search files and folders"
          @input="handleSearchInput"
          @keydown.escape="clearSearch"
        >
        <span
          class="input-icon-addon"
          aria-hidden="true"
        >
          <Icon
            v-if="!searchQuery"
            icon="mdi:magnify"
            width="20"
            height="20"
          />
          <button
            v-else
            type="button"
            class="btn btn-sm p-0 border-0 bg-transparent"
            aria-label="Clear search"
            @click="clearSearch"
          >
            <Icon
              icon="mdi:close"
              width="16"
              height="16"
            />
          </button>
        </span>
      </div>

      <!-- Sort Options -->
      <div class="position-relative">
        <button
          type="button"
          class="btn btn-sm nav-link-sized"
          data-bs-toggle="dropdown"
          aria-expanded="false"
          aria-label="Sort options"
        >
          <Icon
            icon="mdi:sort-variant"
            width="20"
            height="20"
          />
          <span class="d-none d-lg-inline ms-1">Sort By</span>
        </button>
        <ul class="dropdown-menu dropdown-menu-end">
          <li
            v-for="option in sortOptions"
            :key="option.value"
          >
            <button
              type="button"
              class="dropdown-item d-flex align-items-center justify-content-between"
              @click="$emit('sort', option.value)"
            >
              <span v-text="option.label" />
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
    <nav
      class="nav nav-segmented nav-sm"
      role="tablist"
    >
      <button
        v-for="mode in viewModes"
        :key="mode.key"
        type="button"
        class="nav-link"
        :class="{ active: viewMode === mode.key }"
        :aria-selected="viewMode === mode.key"
        :title="mode.title"
        @click="$emit('viewMode', mode.key)"
      >
        <Icon
          :icon="mode.icon"
          width="20"
          height="20"
        />
        <span
          class="d-none d-lg-inline ms-1"
          v-text="mode.label"
        />
      </button>
    </nav>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  isSidebarCollapsed: { type: Boolean, default: false },
  isLoading: { type: Boolean, default: false },
  selectedCount: { type: Number, default: 0 },
  clipboardHasItems: { type: Boolean, default: false },
  clipboardItemCount: { type: Number, default: 0 },
  searchValue: { type: String, default: '' },
  sortKey: { type: String, default: 'name' },
  sortDir: { type: String, default: 'asc' },
  sortOptions: { type: Array, required: true },
  viewMode: { type: String, default: 'grid' },
  viewModes: { type: Array, required: true }
})

const emit = defineEmits([
  'toggleSidebar',
  'createFolder',
  'deleteSelected',
  'clearSelection',
  'copySelected',
  'cutSelected',
  'pasteItems',
  'search',
  'sort',
  'viewMode',
  'filesSelected'
])

const searchInput = ref(null)
const searchQuery = ref(props.searchValue)

// Watch for prop changes
watch(() => props.searchValue, (newValue) => {
  searchQuery.value = newValue
})


function handleSearchInput() {
  emit('search', searchQuery.value)
}

function clearSearch() {
  searchQuery.value = ''
  emit('search', '')
  searchInput.value?.focus()
}

// Upload handlers
function handleFileUpload(event) {
  const files = Array.from(event.target.files || [])
  if (files.length > 0) {
    emit('filesSelected', files)
    // Clear the input so the same files can be selected again
    event.target.value = ''
  }
}

function handleFolderUpload(event) {
  const files = Array.from(event.target.files || [])
  if (files.length > 0) {
    emit('filesSelected', files)
    // Clear the input so the same folder can be selected again
    event.target.value = ''
  }
}
</script>

<style>
/* Make sort button match the height of view mode selector */
.nav-link-sized {
  /* Match the height and padding of nav-segmented nav-sm buttons */
  height: 1.8rem;
  /* Same as nav-sm */
  min-height: 1.8rem;
  padding: 0.370rem 0.75rem;
  /* Same padding as nav-link in nav-sm */
  border-radius: 4px;
  /* Match border radius */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: none;
}

.form-control-sm {
  min-height: calc(1.25rem + 0.625rem + calc(var(--tblr-border-width) 1px * 2));
  padding: 0.22rem 0.5rem;
  font-size: 0.75rem;
  border-radius: var(--tblr-border-radius-sm);
}

.cursor-pointer {
  cursor: pointer;
}

/* Ensure proper alignment */
.nav-link-sized:focus,
.nav-link-sized:hover {
  box-shadow: none;
}

/* Style for delete action in dropdown */
.dropdown-item.text-danger:hover {
  background-color: var(--tblr-red-lt, #fdf2f2);
  color: var(--tblr-red, #d63384);
}

/* Ensure dropdown divider has proper spacing */
.dropdown-divider {
  margin: 0.5rem 0;
}

/* Spinner animation */
.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}
</style>