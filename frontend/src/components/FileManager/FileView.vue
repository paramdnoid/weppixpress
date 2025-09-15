<template>
  <main
    class="resizable-grid border-start"
    tabindex="0"
    @keydown="handleKeydown"
  >
    <!-- File Content Area -->
    <div
      class="d-flex flex-column position-relative file-view"
      @contextmenu="handleAreaContextMenu"
    >
      <div class="content-scroll overflow-auto flex-grow-1 d-flex flex-column">
        <!-- Navigation Bar (moved from FileGrid) -->
        <div class="nav-scroller bg-body p-1 border-bottom">
          <nav
            class="nav me-1"
            aria-label="Secondary navigation"
          >
            <!-- Breadcrumbs -->
            <nav aria-label="Breadcrumb">
              <ol class="breadcrumb breadcrumb-muted breadcrumb-arrows ps-2">
                <li
                  v-for="(item, idx) in breadcrumbs"
                  :key="item.path || idx"
                  class="breadcrumb-item"
                  :class="{ active: idx === breadcrumbs.length - 1 }"
                >
                  <button
                    v-if="item.path && idx < breadcrumbs.length - 1"
                    type="button"
                    class="btn btn-link p-0 m-0 border-0"
                    :title="item.name"
                    :aria-label="`Navigate to ${item.name}`"
                    @click.stop.prevent="$emit('navigate', item)"
                    v-text="item.name"
                  />
                  <span
                    v-else
                    :title="item.name"
                    v-text="item.name"
                  />
                </li>
              </ol>
            </nav>
          </nav>
        </div>

        <!-- Error State -->
        <div
          v-if="error"
          class="d-flex flex-column justify-content-center align-items-center text-center text-danger flex-grow-1"
        >
          <Icon
            icon="mdi:alert-circle"
            class="empty-icon mb-2"
          />
          <div v-text="error" />
          <button
            type="button"
            class="btn btn-sm btn-outline-primary mt-2"
            @click="$emit('retry')"
          >
            <Icon
              icon="mdi:refresh"
              width="16"
              height="16"
              class="me-1"
            />
            Try Again
          </button>
        </div>

        <!-- Empty State -->
        <div
          v-else-if="items.length === 0"
          class="d-flex flex-column justify-content-center align-items-center text-center text-muted flex-grow-1"
        >
          <Icon
            icon="tabler:folder-off"
            class="empty-icon mb-2"
          />
          <div v-text="emptyMessage" />
          <div
            v-if="searchQuery"
            class="small mt-1"
          >
            <button
              type="button"
              class="btn btn-link btn-sm p-0"
              @click="clearSearch"
            >
              Clear search to see all files
            </button>
          </div>
        </div>

        <!-- Grid View -->
        <FileGrid
          v-if="viewMode === 'grid' && !isLoading && !error && items.length > 0"
          :items="items"
          :item-key="itemKey"
          :breadcrumbs="breadcrumbs"
          :sort-key="sortKey"
          :sort-dir="sortDir"
          :selected-items="selectedItems"
          :loading="isLoading"
          :empty-message="emptyMessage"
          @item-double-click="item => $emit('item-dbl-click', item)"
          @navigate="item => $emit('navigate', item)"
          @selection-change="(items, additive) => $emit('selection-change', items, additive)"
          @item-context-menu="(item, event) => $emit('item-context-menu', item, event)"
        />

        <!-- Table View -->
        <FileTable
          v-else-if="(viewMode === 'list' || viewMode === 'table') && !isLoading && !error && items.length > 0"
          :items="items"
          :item-key="itemKey"
          :sort-key="sortKey"
          :sort-dir="sortDir"
          :selected-items="selectedItems"
          :loading="isLoading"
          :empty-message="emptyMessage"
          @item-double-click="item => $emit('item-dbl-click', item)"
          @sort="$emit('sort', $event)"
        />
      </div>
    </div>
  </main>
</template>

<script setup>
import { computed } from 'vue'
import FileGrid from './FileGrid.vue'
import FileTable from './FileTable.vue'

const props = defineProps({
  items: { type: Array, required: true },
  itemKey: { type: Function, default: item => item.id || item.name },
  breadcrumbs: { type: Array, required: true },
  searchValue: { type: String, default: '' },
  viewMode: { type: String, default: 'grid' },
  sortKey: { type: String, default: 'name' },
  sortDir: { type: String, default: 'asc' },
  selectedItems: { type: Set, default: () => new Set() },
  isLoading: { type: Boolean, default: false },
  error: { type: String, default: '' },
  emptyMessage: { type: String, default: 'This folder is empty' }
})

const emit = defineEmits([
  'navigate',
  'search',
  'retry',
  'item-dbl-click',
  'sort',
  'delete-selected',
  'selection-change',
  'area-context-menu',
  'item-context-menu'
])

const searchQuery = computed(() => props.searchValue)

function clearSearch() {
  emit('search', '')
}

function handleKeydown(event) {
  // Only handle keyboard shortcuts if not focused on input elements
  if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.target.isContentEditable) {
    return
  }

  switch (event.key) {
    case 'Delete':
    case 'Backspace':
      if (props.selectedItems.size > 0) {
        event.preventDefault()
        emit('delete-selected')
      }
      break
    case 'Escape':
      // Escape handling can be added here if needed
      break
    case 'a':
    case 'A':
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault()
        // Select all - would need to emit this event if we want to support it
      }
      break
  }
}

function handleAreaContextMenu(event) {
  // Only show context menu if clicking on empty area (not on file items)
  if (event.target.closest('.file-grid-item') || event.target.closest('.file-table-row')) {
    return
  }

  event.preventDefault()
  emit('area-context-menu', event)
}
</script>

<style scoped>
.file-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

.resizable-grid {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
}

.content-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
}

.empty-icon {
  font-size: 64px;
  color: var(--tblr-gray-300);
  margin-bottom: 1rem;
}


.content-scroll::-webkit-scrollbar {
  width: 8px;
}

.content-scroll::-webkit-scrollbar-track {
  background: var(--tblr-gray-50);
}

.content-scroll::-webkit-scrollbar-thumb {
  background: var(--tblr-gray-300);
  border-radius: 4px;
}

.content-scroll::-webkit-scrollbar-thumb:hover {
  background: var(--tblr-gray-400);
}

/* Breadcrumb / Navigation bar (moved from FileGrid) */
.nav-scroller {
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 2;
  overflow-y: hidden;
  gap: 1rem;
  flex: 0 0 auto;
  height: 40.5px;
  background: var(--tblr-body-bg, #fff);
}
.breadcrumb,
.breadcrumb-item {
  display: inline-flex;
  align-items: center;
  margin-bottom: 0;
}
.breadcrumb-item {
  min-width: 0;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.8rem;
  font-weight: 300;
}
.breadcrumb-item .btn-link {
  --tblr-btn-line-height: 1;
  color: var(--tblr-primary);
  text-decoration: none;
  font-size: inherit;
  font-weight: inherit;
  min-width: 0;
}
.breadcrumb-item .btn-link:hover {
  text-decoration: none;
  background-color: transparent;
}
.breadcrumb-item.active {
  font-weight: 400;
  color: var(--tblr-dark);
}
</style>
