<template>
  <div 
    :class="['modal', 'fade', { show: isVisible }]"
    :style="isVisible ? 'display: block;' : ''"
    :id="modalId" 
    ref="modalElement" 
    tabindex="-1" 
    role="dialog"
    :aria-labelledby="`${modalId}Label`"
    :aria-hidden="(!isVisible).toString()"
    @keydown.esc.prevent.stop="hide"
  >
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" :id="`${modalId}Label`">Create New Folder</h5>
          <button type="button" class="btn-close" @click="hide" aria-label="Close" />
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
            <button type="button" class="btn btn-secondary" @click="hide">
              Cancel
            </button>
            <button 
              type="submit" 
              class="btn btn-primary" 
              :disabled="!folderName?.trim() || isSubmitting"
            >
              <span v-if="isSubmitting" class="spinner-border spinner-border-sm me-1" />
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
  <div v-if="isVisible" class="modal-backdrop fade show" />
</template>

<script setup>
import { ref, nextTick, watch, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  isLoading: { type: Boolean, default: false },
  modalId: { type: String, default: 'newFolderModal' }
})

const emit = defineEmits(['create'])

const modalElement = ref(null)
const inputElement = ref(null)
const folderName = ref('')
const isSubmitting = ref(false)
const isVisible = ref(false)

watch(isVisible, (v) => {
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

function handleSubmit() {
  const name = folderName.value.trim()
  if (!name) return

  isSubmitting.value = true
  emit('create', name)
}

function show() {
  folderName.value = ''
  isSubmitting.value = false
  isVisible.value = true

  if (modalElement.value && window.bootstrap) {
    const modal = new window.bootstrap.Modal(modalElement.value)
    modal.show()
  }

  nextTick(() => {
    inputElement.value?.focus()
  })
}

function hide() {
  isVisible.value = false
  isSubmitting.value = false
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