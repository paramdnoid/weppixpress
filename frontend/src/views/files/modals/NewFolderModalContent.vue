<template>
  <form @submit.prevent="handleSubmit">
    <div class="mb-3">
      <label
        for="folderNameInput"
        class="form-label"
      >Folder name</label>
      <input
        id="folderNameInput"
        ref="inputElement"
        v-model="folderName"
        type="text"
        class="form-control"
        placeholder="Enter folder name"
        required
        maxlength="255"
        :class="{ 'is-invalid': validationError }"
      >
      <div
        v-if="validationError"
        class="invalid-feedback"
        v-text="validationError"
      />
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue'
import { ValidationService } from '@/services/validationService'

interface Props {
  modalId?: string
  onCreateFolder?: (name: string) => void
}

const props = withDefaults(defineProps<Props>(), {
  modalId: '',
  onCreateFolder: undefined
})
const _emit = defineEmits<{
  close: []
  confirm: []
  createFolder: [name: string]
}>()

const inputElement = ref<HTMLInputElement>()
const folderName = ref('')

const validationError = computed(() => {
  if (!folderName.value.trim()) {
    return null
  }
  const result = ValidationService.validateFolderName(folderName.value)
  return result.isValid ? null : result.error
})

function handleSubmit() {
  const name = folderName.value.trim()
  if (!name) return

  // Additional validation before submit
  const validationResult = ValidationService.validateFolderName(name)
  if (!validationResult.isValid) {
    console.error('Invalid folder name:', validationResult.error)
    return
  }

  // Call the callback if provided
  if (props.onCreateFolder) {
    props.onCreateFolder(name)
  }
}

onMounted(() => {
  nextTick(() => {
    inputElement.value?.focus()
  })
})

defineExpose({
  handleSubmit
})
</script>