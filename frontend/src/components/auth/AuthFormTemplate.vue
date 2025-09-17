<template>
  <AuthLayout>
    <template #auth-text>
      <div class="logo-lg">
        <span class="logo-txt">Willkommen bei weppixpress</span>
      </div>
      <p class="text-muted font-size-15 w-75 mx-auto mt-1 mb-0">
        <slot name="subtitle" />
      </p>
    </template>

    <div class="card border-0">
      <div class="card-body p-0">
        <div class="px-3 py-3">
          <div class="text-center">
            <h2 class="mb-0">
              <slot name="title" />
            </h2>
            <p class="text-muted mt-2">
              <slot name="description" />
            </p>
          </div>

          <!-- Main form content -->
          <slot />

          <!-- Error and info display -->
          <div
            v-if="error"
            class="alert alert-danger mt-3"
          >
            {{ error }}
          </div>
          <div
            v-if="info"
            class="alert alert-info mt-3"
          >
            {{ info }}
          </div>

          <!-- Footer links -->
          <div
            v-if="$slots.footer"
            class="mt-3 text-center"
          >
            <slot name="footer" />
          </div>
        </div>
      </div>
    </div>
  </AuthLayout>
</template>

<script setup>
import AuthLayout from '@/layouts/AuthLayout.vue'

defineProps({
  error: {
    type: String,
    default: ''
  },
  info: {
    type: String,
    default: ''
  }
})
</script>

<style scoped>
.form-disabled {
  pointer-events: none;
  opacity: 0.6;
}
</style>