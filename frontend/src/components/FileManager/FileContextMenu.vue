<template>
  <div
    v-if="isVisible"
    ref="contextMenuRef"
    class="context-menu"
    :style="{
      top: position.y + 'px',
      left: position.x + 'px'
    }"
  >
    <div class="context-menu-content">
      <!-- DEBUG: Always show test content -->
      <div style="padding: 10px; background: #ff0000; color: white; font-weight: bold;">
        TEST MENU - {{ selectedItem?.name || 'No item' }}
      </div>

      <!-- File-specific actions (when item is provided) -->
      <template v-if="selectedItem">
        <button
          type="button"
          class="context-menu-item"
          :disabled="isLoading"
          @click="handleAction('rename')"
        >
          <Icon icon="mdi:rename" width="16" height="16" class="me-2" />
          Rename
        </button>
        <button
          type="button"
          class="context-menu-item"
          :disabled="isLoading"
          @click="handleAction('copy')"
        >
          <Icon icon="mdi:content-copy" width="16" height="16" class="me-2" />
          Copy
        </button>
        <button
          type="button"
          class="context-menu-item"
          :disabled="isLoading"
          @click="handleAction('cut')"
        >
          <Icon icon="mdi:content-cut" width="16" height="16" class="me-2" />
          Cut
        </button>
        <hr class="context-menu-divider">
        <button
          type="button"
          class="context-menu-item text-danger"
          :disabled="isLoading"
          @click="handleAction('delete')"
        >
          <Icon icon="mdi:delete" width="16" height="16" class="me-2" />
          Delete
        </button>
        <hr class="context-menu-divider">
      </template>

      <!-- General actions -->
      <button
        type="button"
        class="context-menu-item"
        :disabled="isLoading"
        @click="handleAction('createFolder')"
      >
        <Icon icon="mdi:folder-plus" width="16" height="16" class="me-2" />
        New Folder
      </button>

      <button
        type="button"
        class="context-menu-item"
        :disabled="isLoading || (!clipboardHasItems && clipboardItemCount === 0)"
        @click="handleAction('paste')"
      >
        <Icon icon="mdi:content-paste" width="16" height="16" class="me-2" />
        Paste<span v-if="clipboardItemCount > 0"> ({{ clipboardItemCount }})</span>
      </button>

      <hr class="context-menu-divider">

      <!-- Upload options -->
      <div class="context-menu-upload">
        <label class="context-menu-item context-menu-upload-item">
          <input
            type="file"
            multiple
            class="d-none"
            @change="handleFileUpload"
          >
          <Icon icon="mdi:upload" width="16" height="16" class="me-2" />
          Upload Files
        </label>
      </div>

      <div class="context-menu-upload">
        <label class="context-menu-item context-menu-upload-item">
          <input
            type="file"
            webkitdirectory
            class="d-none"
            @change="handleFolderUpload"
          >
          <Icon icon="mdi:folder-upload" width="16" height="16" class="me-2" />
          Upload Folder
        </label>
      </div>

      <hr class="context-menu-divider">

      <button
        type="button"
        class="context-menu-item"
        @click="handleAction('uploadSettings')"
      >
        <Icon icon="tabler:settings" width="16" height="16" class="me-2" />
        Upload Settings
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'

interface Props {
  selectedItem?: any
  selectedCount?: number
  isLoading?: boolean
  clipboardHasItems?: boolean
  clipboardItemCount?: number
}

const props = withDefaults(defineProps<Props>(), {
  selectedItem: null,
  selectedCount: 0,
  isLoading: false,
  clipboardHasItems: false,
  clipboardItemCount: 0
})

const emit = defineEmits([
  'action',
  'close',
  'filesSelected',
  'updateSelectedItem'
])

const isVisible = ref(false)
const position = ref({ x: 0, y: 0 })
const contextMenuRef = ref<HTMLElement>()

function show(event: MouseEvent, item?: any) {
  console.log('FileContextMenu show() called')
  event.preventDefault()

  // Store the selected item for context menu actions
  if (item) {
    // Item is provided, so we're right-clicking on a specific file/folder
    // Update the local selectedItem prop that the template uses
    // We need to emit this to the parent to update the prop
    emit('updateSelectedItem', item)
  }

  // Position the context menu
  position.value = {
    x: event.clientX,
    y: event.clientY
  }

  console.log('Setting isVisible to true, position:', position.value)
  isVisible.value = true
  console.log('isVisible is now:', isVisible.value)

  nextTick(() => {
    console.log('nextTick: contextMenuRef.value:', contextMenuRef.value)
    console.log('nextTick: DOM element exists:', document.querySelector('.context-menu'))

    // Move the context menu to document.body to avoid container issues
    if (contextMenuRef.value && contextMenuRef.value.parentElement) {
      document.body.appendChild(contextMenuRef.value)
      console.log('Moved context menu to document.body')
    }

    // Adjust position if menu would be off-screen
    if (contextMenuRef.value) {
      const rect = contextMenuRef.value.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      // Adjust horizontal position
      if (rect.right > viewportWidth) {
        position.value.x = viewportWidth - rect.width - 10
      }

      // Adjust vertical position
      if (rect.bottom > viewportHeight) {
        position.value.y = viewportHeight - rect.height - 10
      }

      // Ensure minimum position
      position.value.x = Math.max(10, position.value.x)
      position.value.y = Math.max(10, position.value.y)
    }
  })
}

function hide() {
  isVisible.value = false
}

function handleAction(action: string) {
  emit('action', action, props.selectedItem)
  hide()
}

function handleFileUpload(event: Event) {
  const target = event.target as HTMLInputElement
  const files = Array.from(target.files || [])
  if (files.length > 0) {
    emit('filesSelected', files)
    target.value = '' // Clear for next selection
  }
  hide()
}

function handleFolderUpload(event: Event) {
  const target = event.target as HTMLInputElement
  const files = Array.from(target.files || [])
  if (files.length > 0) {
    emit('filesSelected', files)
    target.value = '' // Clear for next selection
  }
  hide()
}

function handleClickOutside(event: MouseEvent) {
  if (contextMenuRef.value && !contextMenuRef.value.contains(event.target as Node)) {
    hide()
  }
}

function handleEscape(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    hide()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('contextmenu', hide)
  document.addEventListener('keydown', handleEscape)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('contextmenu', hide)
  document.removeEventListener('keydown', handleEscape)
})

defineExpose({
  show,
  hide
})
</script>

<style>
.context-menu {
  position: fixed !important;
  z-index: 999999 !important;
  background: #ffffff !important;
  border: 5px solid #ff0000 !important;
  border-radius: 0.5rem !important;
  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15) !important;
  min-width: 200px !important;
  max-width: 280px !important;
  padding: 0.25rem 0 !important;
  font-size: 0.875rem !important;
  display: block !important;
  opacity: 1 !important;
  visibility: visible !important;
  top: 100px !important;
  left: 100px !important;
}

.context-menu-content {
  display: flex;
  flex-direction: column;
}

.context-menu-item {
  display: flex !important;
  align-items: center !important;
  width: 100% !important;
  padding: 0.375rem 0.75rem !important;
  border: none !important;
  background: transparent !important;
  color: #333333 !important;
  font-size: 0.875rem !important;
  text-align: left !important;
  cursor: pointer !important;
  transition: background-color 0.15s ease !important;
  text-decoration: none !important;
  border-radius: 0 !important;
}

.context-menu-item:hover:not(:disabled) {
  background-color: var(--tblr-gray-200) !important;
  color: var(--tblr-white);
}

.context-menu-item:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.context-menu-item.text-danger {
  color: var(--tblr-red);
}

.context-menu-item.text-danger:hover:not(:disabled) {
  background-color: var(--tblr-red);
  color: var(--tblr-white);
}

.context-menu-upload-item {
  cursor: pointer;
}

.context-menu-divider {
  margin: 0.25rem 0;
  border: none;
  border-top: 1px solid var(--tblr-border-color);
}

/* Animation */
.context-menu {
  animation: contextMenuShow 0.2s ease-out;
}

@keyframes contextMenuShow {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>