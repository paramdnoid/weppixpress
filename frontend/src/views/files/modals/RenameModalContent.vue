<template>
  <form @submit.prevent="handleSubmit">
    <div class="mb-3">
      <label
        for="renameInput"
        class="form-label"
      >New name</label>
      <input
        id="renameInput"
        ref="inputElement"
        v-model="fileName"
        type="text"
        class="form-control"
        :placeholder="itemToRename?.name"
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
  itemToRename?: {
    name: string
    type: string
  }
  onRename?: (data: { oldName: string; newName: string; item: any }) => void
}

const props = withDefaults(defineProps<Props>(), {
  modalId: '',
  itemToRename: () => ({ name: '', type: 'file' }),
  onRename: undefined
})
defineEmits<{
  close: []
  confirm: []
  rename: [data: { oldName: string; newName: string; item: any }]
}>()

const inputElement = ref<HTMLInputElement>()
const fileName = ref(props.itemToRename?.name || '')

const validationError = computed(() => {
  if (!fileName.value || fileName.value === props.itemToRename?.name) {
    return null
  }
  const result = ValidationService.validateFileName(fileName.value)
  return result.isValid ? null : result.error
})

function handleSubmit() {
  const name = fileName.value.trim()
  if (!name || !props.itemToRename || name === props.itemToRename.name) {
    return
  }

  // Additional validation before submit
  const validationResult = ValidationService.validateFileName(name)
  if (!validationResult.isValid) {
    console.error('Invalid filename:', validationResult.error)
    return
  }

  const renameData = {
    oldName: props.itemToRename.name,
    newName: name,
    item: props.itemToRename
  }

  // Call the callback if provided
  if (props.onRename) {
    props.onRename(renameData)
  }

  // Don't emit 'rename' - it causes duplicate calls!
  // The callback handles everything we need
}

onMounted(() => {
  nextTick(() => {
    inputElement.value?.focus()
    inputElement.value?.select()
  })
})

defineExpose({
  handleSubmit
})
</script>