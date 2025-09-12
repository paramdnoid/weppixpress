<template>
  <div :class="containerClasses">
    <div
      v-if="overlay"
      class="loading-overlay"
    >
      <div class="loading-content">
        <div :class="spinnerClasses" />
        <p
          v-if="message"
          class="loading-message mt-3"
        >
          {{ message }}
        </p>
      </div>
    </div>
    <div
      v-else
      :class="spinnerClasses"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info'
  overlay?: boolean
  message?: string
  centered?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  variant: 'primary',
  overlay: false,
  message: '',
  centered: true
})

const containerClasses = computed(() => {
  const classes: string[] = []
  
  if (props.centered && !props.overlay) {
    classes.push('d-flex', 'justify-content-center', 'align-items-center')
  }
  
  if (props.overlay) {
    classes.push('position-relative')
  }
  
  return classes
})

const spinnerClasses = computed(() => {
  const classes = ['spinner-border']
  
  if (props.variant) {
    classes.push(`text-${props.variant}`)
  }
  
  if (props.size && props.size !== 'md') {
    classes.push(`spinner-border-${props.size}`)
  }
  
  return classes
})
</script>

<style scoped>
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.loading-content {
  text-align: center;
}

.loading-message {
  margin: 0;
  color: var(--tblr-muted);
  font-size: 0.875rem;
}
</style>