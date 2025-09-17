<template>
  <div class="d-flex flex-column justify-content-center align-items-center text-center text-muted flex-grow-1">
    <Icon
      :icon="icon"
      class="empty-icon mb-2"
    />
    <div v-text="message" />
    <div
      v-if="actionVisible"
      class="small mt-1"
    >
      <button
        v-if="actionText"
        type="button"
        class="btn btn-link btn-sm p-0"
        @click="$emit('action')"
      >
        {{ actionText }}
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  icon: {
    type: String,
    default: 'tabler:folder-off'
  },
  message: {
    type: String,
    required: true
  },
  actionText: {
    type: String,
    default: ''
  },
  actionVisible: {
    type: Boolean,
    default: false
  }
})

defineEmits(['action'])
</script>

<style scoped>
.empty-icon {
  font-size: 64px;
  color: var(--tblr-gray-300);
}
</style>