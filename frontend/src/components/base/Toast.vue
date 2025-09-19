<template>
  <div
    aria-live="polite"
    aria-atomic="true"
    class="toast-container"
  >
    <div
      v-for="(toast, i) in toasts"
      :key="toast.id"
      class="toast-overlay fade-in"
      :class="[toast.type, { 'fade-out': toast.removing }]"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <!-- Toolbar buttons (top-right) -->
      <div class="toolbar-buttons">
        <button
          class="btn-toolbar"
          title="Close"
          @click="remove(i)"
        >
          <Icon
            icon="tabler:x"
            width="12"
            height="12"
          />
        </button>
      </div>

      <div class="toast-content">
        <div class="toast-stats">
          <h5 class="mb-2">
            <Icon
              v-if="toast.icon"
              :icon="toast.icon"
              width="16"
              height="16"
              class="me-2"
              :class="toast.iconClass"
            />
            {{ toast.title }}
          </h5>
          <div class="toast-message">
            {{ toast.message }}
          </div>
          <div class="d-flex justify-content-between mt-2">
            <small class="text-muted d-flex align-items-center">
              <Icon
                icon="tabler:clock"
                width="12"
                height="12"
                class="me-1"
              />
              {{ toast.time }}
            </small>
          </div>
        </div>
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
    type: options.type || 'info',
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
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1060;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 350px;
}

.toast-overlay {
  width: 350px;
  background: rgba(var(--tblr-bg-surface-rgb), 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(var(--tblr-border-color-rgb), 0.3);
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
}

.toast-content {
  position: relative;
}

.toast-stats h5 {
  font-weight: 600;
  color: var(--tblr-body-color);
  margin: 0;
  display: flex;
  align-items: center;
}

.toast-message {
  color: var(--tblr-text-secondary);
  font-size: 0.9rem;
  line-height: 1.4;
  margin-top: 0.5rem;
}

.fade-in {
  animation: slideInUp 0.4s ease-out;
}

.fade-out {
  animation: slideOutDown 0.3s ease-in;
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes slideOutDown {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
}

/* Toolbar buttons (matching GlobalUploadOverlay) */
.toolbar-buttons {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 2px;
  z-index: 1;
}

.btn-toolbar {
  width: 28px;
  height: 28px;
  border: none;
  background: rgba(var(--tblr-gray-600-rgb), 0.1);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
  color: var(--tblr-gray-600);
}

.btn-toolbar:hover {
  background: rgba(var(--tblr-gray-600-rgb), 0.15);
  color: var(--tblr-gray-700);
  transform: scale(1.05);
}

.btn-toolbar:active {
  background: rgba(var(--tblr-gray-600-rgb), 0.2);
  transform: scale(0.95);
}

/* Icon color variations for different toast types */
.text-success {
  color: var(--tblr-success) !important;
}

.text-danger {
  color: var(--tblr-danger) !important;
}

.text-warning {
  color: var(--tblr-warning) !important;
}

.text-info {
  color: var(--tblr-info) !important;
}

/* Responsive design */
@media (max-width: 768px) {
  .toast-container {
    position: fixed;
    top: 80px;
    left: 10px;
    right: 10px;
    bottom: auto;
    max-width: none;
  }

  .toast-overlay {
    width: auto;
    max-width: none;
  }
}

/* Additional glass effect enhancement */
.toast-overlay::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
  z-index: 1;
}

/* Subtle border glow effect based on toast type */
.toast-overlay.success {
  border-color: rgba(var(--tblr-success-rgb), 0.3);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(var(--tblr-success-rgb), 0.1);
}

.toast-overlay.danger {
  border-color: rgba(var(--tblr-danger-rgb), 0.3);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(var(--tblr-danger-rgb), 0.1);
}

.toast-overlay.warning {
  border-color: rgba(var(--tblr-warning-rgb), 0.3);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(var(--tblr-warning-rgb), 0.1);
}

.toast-overlay.info {
  border-color: rgba(var(--tblr-info-rgb), 0.3);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(var(--tblr-info-rgb), 0.1);
}
</style>