<template>
  <!-- Render all active modals -->
  <template
    v-for="modal in activeModals"
    :key="modal.id"
  >
    <!-- Modal Backdrop -->
    <div
      v-if="modal.visible"
      class="modal-backdrop fade show"
      :style="{ zIndex: modal.zIndex - 1 }"
      @click="handleBackdropClick(modal)"
    />

    <!-- Modal Structure -->
    <div
      v-if="modal.visible"
      :id="modal.id"
      :data-modal-id="modal.id"
      class="modal modal-blur fade show d-block"
      :class="{ 'modal-fullscreen': modal.fullscreen }"
      :style="{ zIndex: modal.zIndex }"
      tabindex="-1"
      role="dialog"
      :aria-hidden="false"
    >
      <div
        class="modal-dialog modal-dialog-centered modal-dialog-scrollable"
        :class="modalClasses(modal)"
        role="document"
        @click.stop
      >
        <div class="modal-content">
          <!-- Modal Header -->
          <div
            v-if="!modal.hideHeader"
            class="modal-header ps-3 border-0"
          >
            <h5 class="modal-title">
              <slot
                name="title"
                :modal="modal"
              >
                {{ modal.title }}
              </slot>
            </h5>
            <button
              v-if="!modal.hideClose"
              type="button"
              class="btn-close"
              :disabled="modal.loading"
              aria-label="Close"
              @click="close(modal.id)"
            />
          </div>

          <!-- Modal Body -->
          <div
            class="modal-body p-2 px-3"
            :class="{ 'p-0': modal.noPadding }"
          >
            <!-- Component Content -->
            <component
              :is="modal.component"
              v-if="modal.component"
              :ref="(el: any) => setComponentRef(modal.id, el)"
              v-bind="modal.props || {}"
              :modal-id="modal.id"
              @close="close(modal.id)"
            />

            <!-- HTML Content -->
            <div
              v-else-if="modal.html"
              v-html="modal.html"
            />

            <!-- Text Content -->
            <div v-else-if="modal.content">
              {{ modal.content }}
            </div>

            <!-- Slot Content -->
            <slot
              name="body"
              :modal="modal"
            />
          </div>

          <!-- Modal Footer -->
          <div
            v-if="!modal.hideFooter"
            class="modal-footer"
          >
            <slot
              name="footer"
              :modal="modal"
              :close="() => close(modal.id)"
              :confirm="() => confirm(modal.id)"
            >
              <button
                type="button"
                class="btn btn-default"
                :disabled="modal.loading"
                @click="close(modal.id)"
              >
                <Icon
                  icon="tabler:x"
                  class="me-1"
                  width="16"
                  height="16"
                />
                Cancel
              </button>
              <button
                type="button"
                class="btn"
                :class="getConfirmButtonClass(modal)"
                :disabled="modal.loading"
                @click="confirm(modal.id)"
              >
                <span
                  v-if="modal.loading"
                  class="spinner-border spinner-border-sm me-2"
                  role="status"
                  aria-hidden="true"
                />
                <Icon
                  v-else
                  icon="tabler:check"
                  class="me-1"
                  width="16"
                  height="16"
                />
                {{ modal.confirmText }}
              </button>
            </slot>
          </div>
        </div>
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useModalStore, type ActiveModal } from '@/stores/modal'
import { Icon } from '@iconify/vue'

const modalStore = useModalStore()

const activeModals = computed(() => modalStore.activeModals)

// Component refs for direct method calls
const componentRefs = ref<Map<string, any>>(new Map())

function setComponentRef(modalId: string, el: any): void {
  if (el) {
    componentRefs.value.set(modalId, el)
  } else {
    componentRefs.value.delete(modalId)
  }
}

function modalClasses(modal: ActiveModal): string[] {
  const classes: string[] = []

  if (modal.size && modal.size !== 'md') {
    classes.push(`modal-${modal.size}`)
  }

  return classes
}

function getConfirmButtonClass(modal: ActiveModal): string {
  const variant = modal.confirmVariant || 'primary'
  return `btn-${variant}`
}

function handleBackdropClick(modal: ActiveModal): void {
  if (!modal.persistent && !modal.loading) {
    close(modal.id)
  }
}

function close(id: string): void {
  modalStore.close(id)
}

function confirm(id: string): void {
  // Try to call the component's exposed submit method first
  const componentRef = componentRefs.value.get(id)
  if (componentRef && typeof componentRef.handleSubmit === 'function') {
    componentRef.handleSubmit()
  } else if (componentRef && typeof componentRef.submit === 'function') {
    componentRef.submit()
  } else {
    modalStore.confirm(id)
  }
}



// Global keyboard event handling
function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    modalStore.handleEscapeKey()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
/* Modal positioning and layering */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.modal .modal-dialog {
  pointer-events: auto;
}

/* Beautiful backdrop inspired by GlobalUploadOverlay */
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  transition: all 0.15s ease-out;
}

.modal-blur .modal-backdrop {
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

/* Clean modal content using Tabler variables like GlobalUploadOverlay */
.modal-content {
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease-out;
}

/* Standard header styling */
.modal-header {
  background: transparent;
}

/* Standard body styling */
.modal-body {
  color: var(--tblr-body-color);
}

/* Standard footer styling */
.modal-footer {
  gap: 0.4rem !important;
}

.modal-footer .btn {
  margin: 0 !important;
}

/* Enhanced close button with hover effects like GlobalUploadOverlay */
.btn-close {
  transition: all 0.15s ease;
}

.btn-close:hover {
  transform: scale(1.05);
}

/* Clean button styling */
.modal-footer .btn {
  transition: all 0.15s ease;
}

.modal-footer .btn:hover {
  transform: translateY(-1px);
}

/* Loading spinner styling */
.spinner-border-sm {
  width: 0.875rem;
  height: 0.875rem;
}

/* Smooth animations */
.modal.fade {
  transition: opacity 0.15s linear;
}

.modal.show {
  opacity: 1;
}

.modal-backdrop.fade {
  opacity: 0;
  transition: opacity 0.15s linear;
}

.modal-backdrop.show {
  opacity: 1;
}

/* Subtle entrance animation like GlobalUploadOverlay */
.modal.show .modal-dialog {
  transform: none;
  animation: fadeIn 0.5s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive design */
@media (max-width: 576px) {
  .modal-content {
    border-radius: 6px;
    margin: 0.5rem;
  }
}
</style>