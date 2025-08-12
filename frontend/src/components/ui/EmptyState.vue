<template>
  <div class="empty-state text-center py-5">
    <div class="empty-icon mb-3">
      <Icon v-if="icon" :name="icon" class="icon-lg" :class="iconClasses" />
    </div>
    
    <h3 v-if="title" class="empty-title">{{ title }}</h3>
    <p v-if="message" class="empty-message text-muted">{{ message }}</p>
    
    <div v-if="$slots.actions" class="empty-actions mt-4">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  title?: string
  message?: string
  icon?: string
  iconVariant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'muted'
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  message: '',
  icon: 'mdi:folder-outline',
  iconVariant: 'muted'
})

const iconClasses = computed(() => {
  return props.iconVariant ? `text-${props.iconVariant}` : ''
})
</script>

<style scoped>
.empty-state {
  min-height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.empty-icon {
  opacity: 0.6;
}

.empty-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.empty-message {
  font-size: 0.875rem;
  line-height: 1.5;
  max-width: 300px;
}

.icon-lg {
  width: 3rem;
  height: 3rem;
}
</style>