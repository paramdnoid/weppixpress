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
          <h5 class="modal-title" :id="`${modalId}Label`">
            Rename {{ item?.name }}
          </h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close" />
        </div>
        <form @submit.prevent="handleSubmit">
          <div class="modal-body">
            <div class="mb-3">
              <label :for="`${modalId}Input`" class="form-label">New name</label>
              <input 
                ref="inputElement" 
                type="text" 
                class="form-control" 
                :id="`${modalId}Input`" 
                v-model="fileName"
                :placeholder="item?.name" 
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
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'

const props = defineProps({
  item: { type: Object, default: null },
  isLoading: { type: Boolean, default: false },
  modalId: { type: String, default: 'renameModal' }
})

const emit = defineEmits(['rename'])

const modalElement = ref(null)
const inputElement = ref(null)
const fileName = ref('')

watch(() => props.item, (newItem) => {
  if (newItem) {
    fileName.value = newItem.name
    nextTick(() => {
      inputElement.value?.focus()
      inputElement.value?.select()
    })
  }
}, { immediate: true })

function handleSubmit() {
  const name = fileName.value.trim()
  if (!name || !props.item || name === props.item.name) return
  
  emit('rename', {
    oldName: props.item.name,
    newName: name,
    item: props.item
  })
}

function show() {
  if (modalElement.value && window.bootstrap) {
    const modal = new window.bootstrap.Modal(modalElement.value)
    modal.show()
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