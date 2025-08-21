<template>
  <div v-if="isVisible" class="modal modal-blur fade show" :class="{ 'modal-fullscreen': fullscreen }" style="display: block;" @click="handleBackdropClick">
    <div class="modal-dialog" :class="modalClasses" @click.stop>
      <div class="modal-content">
        <div class="modal-header" v-if="!hideHeader">
          <h4 class="modal-title">
            <slot name="title">{{ title }}</slot>
          </h4>
          <button 
            v-if="!hideClose"
            type="button" 
            class="btn-close" 
            @click="handleClose"
            :disabled="loading"
          ></button>
        </div>
        
        <div class="modal-body" :class="{ 'p-0': noPadding }">
          <slot />
        </div>
        
        <div class="modal-footer" v-if="!hideFooter">
          <slot name="footer">
            <BaseButton 
              variant="secondary" 
              @click="handleClose"
              :disabled="loading"
            >
              Cancel
            </BaseButton>
            <BaseButton 
              :variant="confirmVariant"
              @click="handleConfirm"
              :loading="loading"
            >
              {{ confirmText }}
            </BaseButton>
          </slot>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import BaseButton from './BaseButton.vue'

interface Props {
  modelValue: boolean
  title?: string
  confirmText?: string
  confirmVariant?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  fullscreen?: boolean
  hideHeader?: boolean
  hideFooter?: boolean
  hideClose?: boolean
  noPadding?: boolean
  loading?: boolean
  persistent?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  confirmText: 'Confirm',
  confirmVariant: 'primary',
  size: 'md',
  fullscreen: false,
  hideHeader: false,
  hideFooter: false,
  hideClose: false,
  noPadding: false,
  loading: false,
  persistent: false
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: []
  close: []
}>()

const isVisible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})

const modalClasses = computed(() => {
  const classes: string[] = []
  
  if (props.size && props.size !== 'md') {
    classes.push(`modal-${props.size}`)
  }
  
  return classes
})

function handleClose() {
  if (!props.loading) {
    emit('close')
    isVisible.value = false
  }
}

function handleConfirm() {
  emit('confirm')
}

function handleBackdropClick() {
  if (!props.persistent && !props.loading) {
    handleClose()
  }
}

watch(isVisible, (visible) => {
  if (visible) {
    document.body.classList.add('modal-open')
  } else {
    document.body.classList.remove('modal-open')
  }
})
</script>