<template>
  <div class="topbar d-flex justify-content-between align-items-center py-1 px-1 bg-body gap-1">
    <nav
      class="d-flex align-items-center flex-fill gap-1"
      role="toolbar"
    >
      <!-- Sidebar Toggle -->
      <button
        type="button"
        class="btn btn-sm nav-link-sized"
        :aria-label="isSidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'"
        @click="emit('toggleSidebar')"
      >
        <Icon
          icon="mdi:file-tree"
          width="20"
          height="20"
        />
        <span class="d-none d-lg-inline ms-1">Toggle Sidebar</span>
      </button>
    </nav>

    <!-- Right Side Actions -->
    <nav class="d-flex align-items-center gap-1">
      <!-- WebSocket Connection Status -->
      <div class="d-flex align-items-center me-2">
        <span
          class="connection-indicator"
          :class="connectionStatusClass"
          :title="connectionStatusText"
        >
          <Icon
            :icon="connectionIcon"
            size="14"
          />
        </span>
        <span class="d-none d-sm-inline text-muted small ms-1">
          {{ connectionStatusText }}
        </span>
      </div>

      <!-- Refresh Button (hidden when Live Update is active) -->
      <button
        v-if="!props.autoRefresh"
        type="button"
        class="btn btn-primary btn-sm"
        :disabled="props.isLoading"
        @click="emit('refresh')"
      >
        <Icon
          :icon="props.isLoading ? 'tabler:loader-2' : 'tabler:refresh'"
          :class="props.isLoading ? 'spinner-border spinner-border-sm me-1' : 'me-1'"
        />
        {{ props.isLoading ? 'Loading...' : 'Refresh' }}
      </button>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import adminWebSocketService from '@/services/adminWebSocketService'

interface Notification {
  id: number
  type: string
  title: string
  message: string
  timestamp: number
}

interface Props {
  currentView: string
  isSidebarCollapsed: boolean
  isLoading: boolean
  searchQuery: string
  timeRange: string
  autoRefresh: boolean
  notificationCount: number
  notifications: Notification[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  toggleSidebar: []
  viewChange: [view: string]
  search: [query: string]
  timeRangeChange: [range: string]
  autoRefreshChange: [enabled: boolean]
  refresh: []
  adminAction: [action: string]
  quickAction: [action: string]
}>()

// WebSocket connection status
const connectionStatus = computed(() => adminWebSocketService.connectionStatus.value)

const connectionStatusClass = computed(() => {
  switch (connectionStatus.value) {
    case 'connected':
      return 'connection-connected'
    case 'connecting':
      return 'connection-connecting'
    case 'error':
      return 'connection-error'
    default:
      return 'connection-disconnected'
  }
})

const connectionIcon = computed(() => {
  switch (connectionStatus.value) {
    case 'connected':
      return 'tabler:wifi'
    case 'connecting':
      return 'tabler:loader-2'
    case 'error':
      return 'tabler:wifi-off'
    default:
      return 'tabler:wifi-off'
  }
})

const connectionStatusText = computed(() => {
  switch (connectionStatus.value) {
    case 'connected':
      return 'Real-time'
    case 'connecting':
      return 'Connecting...'
    case 'error':
      return 'Connection Error'
    default:
      return 'Offline'
  }
})

</script>

<style scoped>
.nav-link-sized {
  /* Match the height and padding of nav-segmented nav-sm buttons */
  height: 1.8rem;
  /* Same as nav-sm */
  min-height: 1.8rem;
  padding: 0.370rem 0.75rem;
  /* Same padding as nav-link in nav-sm */
  border-radius: 4px;
  /* Match border radius */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: none;
  color: var(--tblr-body-color);
  text-decoration: none;
  transition: background-color 0.15s ease;
}

.nav-link-sized:hover {
  background-color: var(--tblr-gray-100);
}

.nav-link-sized:focus,
.nav-link-sized:hover {
  box-shadow: none;
}

/* Match button heights with FileToolbar */
.btn-sm {
  height: 1.8rem;
  min-height: 1.8rem;
  padding: 0.370rem 0.75rem;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: none;
}

.input-icon {
  position: relative;
}

.input-icon-addon {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  pointer-events: none;
  z-index: 10;
}

.input-icon-addon button {
  pointer-events: auto;
}

.notification-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  padding: 0.125rem 0.25rem;
  font-size: 0.625rem;
  border-radius: 50px;
}

.notification-dropdown {
  width: 350px;
  max-height: 400px;
  overflow-y: auto;
}

.notification-list {
  max-height: 250px;
  overflow-y: auto;
}

.notification-item {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--tblr-border-color);
  transition: background-color 0.2s ease;
}

.notification-item:hover {
  background-color: var(--tblr-bg-surface-secondary);
}

.notification-item:last-child {
  border-bottom: none;
}

.notification-title {
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--tblr-body-color);
  margin-bottom: 0.25rem;
}

.notification-text {
  font-size: 0.8125rem;
  color: var(--tblr-text-muted);
  line-height: 1.4;
  margin-bottom: 0.25rem;
}

.quick-actions-dropdown {
  width: 250px;
}

.btn-check:checked + .btn {
  background-color: var(--tblr-primary);
  color: white;
  border-color: var(--tblr-primary);
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.spinner-border-sm {
  animation: spin 1s linear infinite;
}

/* WebSocket Connection Status */
.connection-indicator {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.connection-connected {
  color: var(--tblr-green);
  background-color: var(--tblr-green-lt);
}

.connection-connecting {
  color: var(--tblr-yellow);
  background-color: var(--tblr-yellow-lt);
  animation: pulse 2s infinite;
}

.connection-connecting svg {
  animation: spin 1s linear infinite;
}

.connection-error {
  color: var(--tblr-red);
  background-color: var(--tblr-red-lt);
}

.connection-disconnected {
  color: var(--tblr-gray-600);
  background-color: var(--tblr-gray-100);
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>