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
      <div class="flex-grow-1 d-flex flex-column">
        <!-- Grid View -->
        <FileGrid
          v-if="viewMode === 'grid'"
          :items="items"
          :item-key="itemKey"
          :breadcrumbs="breadcrumbs"
          :sort-key="sortKey"
          :sort-dir="sortDir"
          :selected-items="selectedItems"
          :loading="isLoading"
          :error="error"
          :empty-message="emptyMessage"
          :search-query="searchQuery"
          @item-double-click="item => $emit('item-dbl-click', item)"
          @navigate="item => $emit('navigate', item)"
          @selection-change="(items, additive) => $emit('selection-change', items, additive)"
          @item-context-menu="(item, event) => $emit('item-context-menu', item, event)"
          @retry="$emit('retry')"
          @clear-search="clearSearch"
        />

        <!-- Table View -->
        <FileTable
          v-else-if="viewMode === 'list' || viewMode === 'table'"
          :items="items"
          :item-key="itemKey"
          :sort-key="sortKey"
          :sort-dir="sortDir"
          :selected-items="selectedItems"
          :loading="isLoading"
          :error="error"
          :empty-message="emptyMessage"
          :search-query="searchQuery"
          @item-double-click="item => $emit('item-dbl-click', item)"
          @sort="$emit('sort', $event)"
          @retry="$emit('retry')"
          @clear-search="clearSearch"
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

</style>
