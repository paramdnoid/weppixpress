<template>
  <div>
    <!-- Rename Modal -->
    <div 
      id="renameModal" 
      ref="renameModalElement" 
      class="modal fade" 
      tabindex="-1" 
      aria-labelledby="renameModalLabel"
      aria-hidden="true"
    >
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5
              id="renameModalLabel"
              class="modal-title"
            >
              <span>Rename </span><span v-text="itemToRename?.name" />
            </h5>
            <button
              type="button"
              class="btn-close"
              data-bs-dismiss="modal"
              aria-label="Close"
            />
          </div>
          <form @submit.prevent="handleRenameSubmit">
            <div class="modal-body">
              <div class="mb-3">
                <label
                  for="renameInput"
                  class="form-label"
                >New name</label>
                <input 
                  id="renameInput" 
                  ref="renameInputElement" 
                  v-model="fileName" 
                  type="text" 
                  class="form-control"
                  :placeholder="itemToRename?.name" 
                  required 
                  maxlength="255"
                  :class="{ 'is-invalid': renameValidationError }"
                >
                <div
                  v-if="renameValidationError"
                  class="invalid-feedback"
                  v-text="renameValidationError"
                />
              </div>
            </div>
            <div class="modal-footer">
              <button
                type="button"
                class="btn btn-secondary"
                data-bs-dismiss="modal"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                class="btn btn-primary" 
                :disabled="!fileName?.trim() || isLoading || !!renameValidationError"
              >
                <span
                  v-if="isLoading"
                  class="spinner-border spinner-border-sm me-1"
                />
                Rename
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- New Folder Modal -->
    <div 
      id="newFolderModal"
      ref="folderModalElement"
      :class="['modal', 'fade', { show: isFolderModalVisible }]" 
      :style="isFolderModalVisible ? 'display: block;' : ''" 
      tabindex="-1" 
      role="dialog"
      aria-labelledby="newFolderModalLabel"
      :aria-hidden="(!isFolderModalVisible).toString()"
      @keydown.esc.prevent.stop="hideNewFolderModal"
    >
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5
              id="newFolderModalLabel"
              class="modal-title"
            >
              Create New Folder
            </h5>
            <button
              type="button"
              class="btn-close"
              aria-label="Close"
              @click="hideNewFolderModal"
            />
          </div>
          <form @submit.prevent="handleFolderSubmit">
            <div class="modal-body">
              <div class="mb-3">
                <label
                  for="folderNameInput"
                  class="form-label"
                >Folder name</label>
                <input 
                  id="folderNameInput" 
                  ref="folderInputElement" 
                  v-model="folderName" 
                  type="text" 
                  class="form-control"
                  placeholder="Enter folder name" 
                  required 
                  maxlength="255"
                  :class="{ 'is-invalid': folderValidationError }"
                >
                <div
                  v-if="folderValidationError"
                  class="invalid-feedback"
                  v-text="folderValidationError"
                />
              </div>
            </div>
            <div class="modal-footer">
              <button
                type="button"
                class="btn btn-secondary"
                @click="hideNewFolderModal"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                class="btn btn-primary" 
                :disabled="!folderName?.trim() || isFolderSubmitting || !!folderValidationError"
              >
                <span
                  v-if="isFolderSubmitting"
                  class="spinner-border spinner-border-sm me-1"
                />
                Create
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    <div
      v-if="isFolderModalVisible"
      class="modal-backdrop fade show"
    />
  </div>
</template>

<script setup>
import { ref, watch, nextTick, onBeforeUnmount, computed } from 'vue'
import { ValidationService } from '@/services/validationService'

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

// Validation
const renameValidationError = computed(() => {
  if (!fileName.value || fileName.value === props.itemToRename?.name) {
    return null
  }
  const result = ValidationService.validateFileName(fileName.value)
  return result.isValid ? null : result.error
})

const folderValidationError = computed(() => {
  if (!folderName.value.trim()) {
    return null
  }
  const result = ValidationService.validateFolderName(folderName.value)
  return result.isValid ? null : result.error
})

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
  
  // Additional validation before submit
  const validationResult = ValidationService.validateFileName(name)
  if (!validationResult.isValid) {
    console.error('Invalid filename:', validationResult.error)
    return
  }
  
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

  // Additional validation before submit
  const validationResult = ValidationService.validateFolderName(name)
  if (!validationResult.isValid) {
    console.error('Invalid folder name:', validationResult.error)
    return
  }

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