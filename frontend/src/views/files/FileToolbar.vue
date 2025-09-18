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
        <div class="dropdown-menu dropdown-menu-start context-menu-styled">
          <div class="context-menu-content">
            <div
              class="context-menu-item"
              :class="{ disabled: isLoading }"
              @click="!isLoading && $emit('createFolder')"
            >
              <Icon
                icon="mdi:folder-plus"
                class="menu-icon"
              />
              <span class="menu-label">New Folder</span>
            </div>
            <div class="context-menu-item separator">
              <div class="separator" />
            </div>
            <div
              class="context-menu-item"
              @click="$emit('openUploadSettings')"
            >
              <Icon
                icon="tabler:settings"
                class="menu-icon"
              />
              <span class="menu-label">Upload Settings</span>
            </div>
            <div class="context-menu-item separator">
              <div class="separator" />
            </div>
            <div class="context-menu-item">
              <label class="d-flex align-items-center cursor-pointer mb-0 w-100">
                <input
                  type="file"
                  multiple
                  class="d-none"
                  @change="handleFileUpload"
                >
                <Icon
                  icon="mdi:upload"
                  class="menu-icon"
                />
                <span class="menu-label">Upload Files</span>
              </label>
            </div>
            <div class="context-menu-item">
              <label class="d-flex align-items-center cursor-pointer mb-0 w-100">
                <input
                  type="file"
                  webkitdirectory
                  class="d-none"
                  @change="handleFolderUpload"
                >
                <Icon
                  icon="mdi:folder-upload"
                  class="menu-icon"
                />
                <span class="menu-label">Upload Folder</span>
              </label>
            </div>
            <div
              v-if="selectedCount > 0"
              class="context-menu-item separator"
            >
              <div class="separator" />
            </div>
            <div
              v-if="selectedCount === 1"
              class="context-menu-item"
              :class="{ disabled: isLoading }"
              @click="!isLoading && $emit('renameSelected')"
            >
              <Icon
                icon="mdi:rename"
                class="menu-icon"
              />
              <span class="menu-label">Rename</span>
            </div>
            <div
              v-if="selectedCount > 0"
              class="context-menu-item"
              :class="{ disabled: isLoading }"
              @click="!isLoading && $emit('copySelected')"
            >
              <Icon
                icon="mdi:content-copy"
                class="menu-icon"
              />
              <span class="menu-label">Copy ({{ selectedCount }})</span>
            </div>
            <div
              v-if="selectedCount > 0"
              class="context-menu-item"
              :class="{ disabled: isLoading }"
              @click="!isLoading && $emit('cutSelected')"
            >
              <Icon
                icon="mdi:content-cut"
                class="menu-icon"
              />
              <span class="menu-label">Cut ({{ selectedCount }})</span>
            </div>
            <div
              v-if="selectedCount > 0"
              class="context-menu-item"
              :class="{ disabled: isLoading }"
              @click="!isLoading && $emit('downloadAsZip')"
            >
              <Icon
                icon="mdi:download"
                class="menu-icon"
              />
              <span class="menu-label">Download as ZIP ({{ selectedCount }})</span>
            </div>
            <div
              class="context-menu-item"
              :class="{ disabled: isLoading || (!clipboardHasItems && clipboardItemCount === 0) }"
              @click="!(isLoading || (!clipboardHasItems && clipboardItemCount === 0)) && $emit('pasteItems')"
            >
              <Icon
                icon="mdi:content-paste"
                class="menu-icon"
              />
              <span class="menu-label">
                Paste
                <span v-if="clipboardItemCount > 0"> ({{ clipboardItemCount }})</span>
              </span>
            </div>
            <div
              v-if="selectedCount > 0"
              class="context-menu-item separator"
            >
              <div class="separator" />
            </div>
            <div
              v-if="selectedCount > 0"
              class="context-menu-item danger"
              :class="{ disabled: isLoading }"
              @click="!isLoading && $emit('deleteSelected')"
            >
              <Icon
                icon="mdi:delete"
                class="menu-icon"
              />
              <span class="menu-label">Delete ({{ selectedCount }})</span>
            </div>
          </div>
        </div>
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
        <div class="dropdown-menu dropdown-menu-end context-menu-styled">
          <div class="context-menu-content">
            <div
              v-for="option in sortOptions"
              :key="option.value"
              class="context-menu-item"
              @click="$emit('sort', option.value)"
            >
              <span class="menu-label">{{ option.label }}</span>
              <Icon
                v-if="sortKey === option.value"
                :icon="sortDir === 'asc' ? 'mdi:arrow-up' : 'mdi:arrow-down'"
                class="menu-icon-end"
              />
            </div>
          </div>
        </div>
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
  'renameSelected',
  'deleteSelected',
  'clearSelection',
  'copySelected',
  'cutSelected',
  'downloadAsZip',
  'pasteItems',
  'search',
  'sort',
  'viewMode',
  'filesSelected',
  'openUploadSettings'
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

/* ContextMenu Styling for Dropdowns */
.context-menu-styled {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  min-width: 220px;
  max-width: 300px;
  user-select: none;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.context-menu-content {
  padding: 6px 0;
}

.context-menu-item {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  cursor: pointer;
  font-size: 0.875rem;
  color: #374151;
  transition: all 0.15s ease;
  font-weight: 400;
}

.context-menu-item:not(.separator):not(.disabled):hover {
  background-color: #f9fafb;
  color: #111827;
}

.context-menu-item.disabled {
  color: #9ca3af;
  cursor: not-allowed;
  opacity: 0.6;
}

.context-menu-item.danger {
  color: #dc2626;
}

.context-menu-item.danger:hover {
  background-color: #fef2f2;
  color: #b91c1c;
}

.context-menu-item.danger .menu-icon {
  color: #dc2626;
}

.context-menu-item.danger:hover .menu-icon {
  color: #b91c1c;
}

.context-menu-item.separator {
  padding: 0;
  cursor: default;
}

.separator {
  height: 1px;
  background-color: #f3f4f6;
  margin: 6px 0;
}

.menu-icon {
  width: 18px;
  height: 18px;
  margin-right: 12px;
  flex-shrink: 0;
  color: #6b7280;
}

.menu-icon-end {
  width: 16px;
  height: 16px;
  margin-left: auto;
  flex-shrink: 0;
  color: #6b7280;
}

.context-menu-item:hover .menu-icon,
.context-menu-item:hover .menu-icon-end {
  color: #374151;
}

.menu-label {
  flex: 1;
  font-weight: 400;
  letter-spacing: 0.01em;
}

/* Focus styles */
.context-menu-item:focus {
  outline: none;
  background-color: #f3f4f6;
}

/* First and last item radius */
.context-menu-item:first-child {
  border-top-left-radius: 7px;
  border-top-right-radius: 7px;
}

.context-menu-item:last-child {
  border-bottom-left-radius: 7px;
  border-bottom-right-radius: 7px;
}

/* Upload label styling */
.context-menu-item label {
  display: flex;
  align-items: center;
  width: 100%;
  margin: 0;
  padding: 0;
  cursor: pointer;
}
</style>