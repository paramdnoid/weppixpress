<template>
  <div class="d-flex flex-column justify-content-center align-items-center text-center text-danger flex-grow-1">
    <Icon
      :icon="icon"
      class="error-icon mb-2"
    />
    <div v-text="message" />
    <button
      v-if="showRetry"
      type="button"
      class="btn btn-sm btn-outline-primary mt-2"
      @click="$emit('retry')"
    >
      <Icon
        icon="mdi:refresh"
        width="16"
        height="16"
        class="me-1"
      />
      {{ retryText }}
    </button>
  </div>
</template>

<script setup>
defineProps({
  icon: {
    type: String,
    default: 'mdi:alert-circle'
  },
  message: {
    type: String,
    required: true
  },
  showRetry: {
    type: Boolean,
    default: true
  },
  retryText: {
    type: String,
    default: 'Try Again'
  }
})

defineEmits(['retry'])
</script>

<style scoped>
.error-icon {
  font-size: 64px;
  color: var(--tblr-danger);
}
</style>