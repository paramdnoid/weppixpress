<template>
  <div 
    class="modal fade" 
    :id="modalId" 
    ref="modalElement" 
    tabindex="-1" 
    :aria-labelledby="`${modalId}Label`"
    aria-hidden="true"
  >
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" :id="`${modalId}Label`">Create New Folder</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close" />
        </div>
        <form @submit.prevent="handleSubmit">
          <div class="modal-body">
            <div class="mb-3">
              <label :for="`${modalId}Input`" class="form-label">Folder name</label>
              <input 
                ref="inputElement" 
                type="text" 
                class="form-control" 
                :id="`${modalId}Input`" 
                v-model="folderName"
                placeholder="Enter folder name" 
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
              :disabled="!folderName?.trim() || isLoading"
            >
              <span v-if="isLoading" class="spinner-border spinner-border-sm me-1" />
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'

const props = defineProps({
  isLoading: { type: Boolean, default: false },
  modalId: { type: String, default: 'newFolderModal' }
})

const emit = defineEmits(['create'])

const modalElement = ref(null)
const inputElement = ref(null)
const folderName = ref('')

function handleSubmit() {
  const name = folderName.value.trim()
  if (!name) return
  
  emit('create', name)
}

function show() {
  folderName.value = ''
  if (modalElement.value && window.bootstrap) {
    const modal = new window.bootstrap.Modal(modalElement.value)
    modal.show()
    
    nextTick(() => {
      inputElement.value?.focus()
    })
  }
}

function hide() {
  if (modalElement.value && window.bootstrap) {
    const modal = window.bootstrap.Modal.getInstance(modalElement.value)
    modal?.hide()
  }
}

defineExpose({
  show,
  hide
})
</script>