<template>
  <div
    aria-live="polite"
    aria-atomic="true"
    class="toast-container position-fixed bottom-0 end-0 p-3"
    style="z-index: 1060"
  >
    <div
      v-for="(toast, i) in toasts"
      :key="toast.id"
      class="toast show mb-2 fade-in"
      :class="[toast.variant, { 'fade-out': toast.removing }]"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div class="toast-header">
        <Icon
          v-if="toast.icon"
          :icon="toast.icon"
          class="me-2"
          :class="toast.iconClass"
        />
        <strong class="me-auto">{{ toast.title }}</strong>
        <small class="text-muted d-flex align-items-center">
          <Icon icon="tabler:clock" class="me-1" style="width: 0.75rem; height: 0.75rem;" />
          {{ toast.time }}
        </small>
        <button
          type="button"
          class="btn-close"
          aria-label="Close"
          @click="remove(i)"
        >
          <Icon icon="tabler:x" />
        </button>
      </div>
      <div class="toast-body">
        {{ toast.message }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { Icon } from '@iconify/vue';

const toasts = ref([]);
let toastId = 0;

function show(message, options = {}) {
  // options: { type: 'success' | 'danger' | 'info' | 'warning', timeout: ms, title: string }
  const typeConfig = {
    success: {
      title: 'Erfolg',
      icon: 'tabler:check',
      iconClass: 'text-success',
      variant: ''
    },
    danger: {
      title: 'Fehler',
      icon: 'tabler:x',
      iconClass: 'text-danger',
      variant: ''
    },
    warning: {
      title: 'Warnung',
      icon: 'tabler:alert-triangle',
      iconClass: 'text-warning',
      variant: ''
    },
    info: {
      title: 'Information',
      icon: 'tabler:info-circle',
      iconClass: 'text-info',
      variant: ''
    }
  };

  const config = typeConfig[options.type] || typeConfig.info;
  const timeout = options.timeout ?? 4000;
  const now = new Date();
  const timeString = now.toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const toast = {
    id: ++toastId,
    message,
    title: options.title || config.title,
    icon: options.icon || config.icon,
    iconClass: config.iconClass,
    variant: config.variant,
    time: timeString,
    removing: false
  };

  toasts.value.push(toast);

  // Auto-remove nach timeout
  if (timeout > 0) {
    setTimeout(() => {
      const index = toasts.value.findIndex(t => t.id === toast.id);
      if (index !== -1) {
        remove(index);
      }
    }, timeout);
  }
}

function remove(index) {
  if (toasts.value[index]) {
    // Fade-out Animation
    toasts.value[index].removing = true;
    setTimeout(() => {
      toasts.value.splice(index, 1);
    }, 150);
  }
}

// Globale Verfügbarkeit
if (typeof window !== 'undefined') {
  window.$toast = show;
}
</script>

<style scoped>
.toast-container {
  max-width: 420px;
}

.toast {
  min-width: 320px;
  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(0, 0, 0, 0.125);
}

.toast-header {
  background-color: var(--tblr-bg-surface);
  border-bottom: 1px solid rgba(0, 0, 0, 0.125);
  padding: 0.75rem;
}

.toast-body {
  padding: 0.75rem;
  background-color: var(--tblr-bg-surface);
  color: var(--tblr-body-color);
}

.fade-in {
  animation: slideInRight 0.3s ease-out;
}

.fade-out {
  animation: slideOutRight 0.15s ease-in;
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes slideOutRight {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
}

/* Tabler UI specific styles */
.toast .btn-close {
  background: transparent;
  border: none;
  padding: 0.5rem;
  color: var(--tblr-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.375rem;
  transition: all 0.15s ease-in-out;
  width: 2rem;
  height: 2rem;
}

.toast .btn-close:hover {
  color: var(--tblr-body-color);
  background-color: var(--tblr-gray-100);
}

.toast .btn-close:focus {
  outline: 0;
  box-shadow: 0 0 0 0.25rem rgba(var(--tblr-primary-rgb), 0.25);
  color: var(--tblr-body-color);
}

.toast .btn-close svg {
  width: 1.25rem;
  height: 1.25rem;
}

.toast-header strong {
  font-weight: 600;
}

.toast-header small {
  font-size: 0.875em;
}
</style>