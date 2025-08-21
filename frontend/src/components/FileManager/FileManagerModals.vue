<template>
  <div>
    <!-- Rename Modal -->
    <div 
      class="modal fade" 
      id="renameModal" 
      ref="renameModalElement" 
      tabindex="-1" 
      aria-labelledby="renameModalLabel"
      aria-hidden="true"
    >
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="renameModalLabel">
              Rename {{ itemToRename?.name }}
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close" />
          </div>
          <form @submit.prevent="handleRenameSubmit">
            <div class="modal-body">
              <div class="mb-3">
                <label for="renameInput" class="form-label">New name</label>
                <input 
                  ref="renameInputElement" 
                  type="text" 
                  class="form-control" 
                  id="renameInput" 
                  v-model="fileName"
                  :placeholder="itemToRename?.name" 
                  required 
                />
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                Cancel
              </button>
              <button 
                type="submit" 
                class="btn btn-primary" 
                :disabled="!fileName?.trim() || isLoading"
              >
                <span v-if="isLoading" class="spinner-border spinner-border-sm me-1" />
                Rename
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- New Folder Modal -->
    <div 
      :class="['modal', 'fade', { show: isFolderModalVisible }]"
      :style="isFolderModalVisible ? 'display: block;' : ''"
      id="newFolderModal" 
      ref="folderModalElement" 
      tabindex="-1" 
      role="dialog"
      aria-labelledby="newFolderModalLabel"
      :aria-hidden="(!isFolderModalVisible).toString()"
      @keydown.esc.prevent.stop="hideNewFolderModal"
    >
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="newFolderModalLabel">Create New Folder</h5>
            <button type="button" class="btn-close" @click="hideNewFolderModal" aria-label="Close" />
          </div>
          <form @submit.prevent="handleFolderSubmit">
            <div class="modal-body">
              <div class="mb-3">
                <label for="folderNameInput" class="form-label">Folder name</label>
                <input 
                  ref="folderInputElement" 
                  type="text" 
                  class="form-control" 
                  id="folderNameInput" 
                  v-model="folderName"
                  placeholder="Enter folder name" 
                  required 
                />
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" @click="hideNewFolderModal">
                Cancel
              </button>
              <button 
                type="submit" 
                class="btn btn-primary" 
                :disabled="!folderName?.trim() || isFolderSubmitting"
              >
                <span v-if="isFolderSubmitting" class="spinner-border spinner-border-sm me-1" />
                Create
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    <div v-if="isFolderModalVisible" class="modal-backdrop fade show" />
  </div>
</template>

<script setup>
import { ref, watch, nextTick, onBeforeUnmount } from 'vue'

const props = defineProps({
  itemToRename: { type: Object, default: null },
  isLoading: { type: Boolean, default: false }
})

const emit = defineEmits(['rename', 'createFolder'])

// Refs
const renameModalElement = ref(null)
const renameInputElement = ref(null)
const folderModalElement = ref(null)
const folderInputElement = ref(null)

// Rename Modal State
const fileName = ref('')

// New Folder Modal State
const folderName = ref('')
const isFolderSubmitting = ref(false)
const isFolderModalVisible = ref(false)

// Watch for item changes to update rename modal
watch(() => props.itemToRename, (newItem) => {
  if (newItem) {
    fileName.value = newItem.name
    nextTick(() => {
      renameInputElement.value?.focus()
      renameInputElement.value?.select()
    })
  }
}, { immediate: true })

// Watch folder modal visibility for body class
watch(isFolderModalVisible, (v) => {
  const body = document.body
  if (!body) return
  if (v) {
    body.classList.add('modal-open')
  } else {
    body.classList.remove('modal-open')
  }
})

onBeforeUnmount(() => {
  document.body.classList.remove('modal-open')
})

// Rename Modal Functions
function handleRenameSubmit() {
  const name = fileName.value.trim()
  if (!name || !props.itemToRename || name === props.itemToRename.name) return
  
  emit('rename', {
    oldName: props.itemToRename.name,
    newName: name,
    item: props.itemToRename
  })
}

function showRenameModal() {
  if (renameModalElement.value && window.bootstrap) {
    const modal = new window.bootstrap.Modal(renameModalElement.value)
    modal.show()
  }
}

function hideRenameModal() {
  if (renameModalElement.value && window.bootstrap) {
    const modal = window.bootstrap.Modal.getInstance(renameModalElement.value)
    modal?.hide()
  }
}

// New Folder Modal Functions
function handleFolderSubmit() {
  const name = folderName.value.trim()
  if (!name) return

  isFolderSubmitting.value = true
  emit('createFolder', name)
}

function showNewFolderModal() {
  folderName.value = ''
  isFolderSubmitting.value = false
  isFolderModalVisible.value = true

  if (folderModalElement.value && window.bootstrap) {
    const modal = new window.bootstrap.Modal(folderModalElement.value)
    modal.show()
  }

  nextTick(() => {
    folderInputElement.value?.focus()
  })
}

function hideNewFolderModal() {
  isFolderModalVisible.value = false
  isFolderSubmitting.value = false
  if (folderModalElement.value && window.bootstrap) {
    const modal = window.bootstrap.Modal.getInstance(folderModalElement.value)
    modal?.hide()
  }
}

defineExpose({
  showNewFolderModal,
  hideNewFolderModal,
  showRenameModal,
  hideRenameModal,
  newFolderModal: { hide: hideNewFolderModal }
})
</script>