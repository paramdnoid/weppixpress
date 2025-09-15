import { type App } from 'vue'
import { useModal } from '@/composables/useModal'

// Plugin for global modal access
export default {
  install(app: App) {
    const modal = useModal()

    // Provide modal instance globally
    app.provide('modal', modal)

    // Add to global properties for Options API compatibility
    app.config.globalProperties.$modal = modal
  }
}

// Augment Vue's global properties type for TypeScript
declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $modal: ReturnType<typeof useModal>
  }
}