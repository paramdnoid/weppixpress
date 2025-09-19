<template>
  <DefaultLayout>
    <div class="card flex-fill admin-root">
      <!-- Admin Toolbar -->
      <AdminToolbar
        :current-view="currentView"
        :is-sidebar-collapsed="isCollapsed"
        :is-loading="isLoading"
        :search-query="searchQuery"
        :time-range="timeRange"
        :auto-refresh="autoRefresh"
        :notification-count="notificationCount"
        :notifications="notifications"
        @toggle-sidebar="toggleSidebar"
        @view-change="handleViewChange"
        @search="handleSearch"
        @time-range-change="handleTimeRangeChange"
        @auto-refresh-change="handleAutoRefreshChange"
        @refresh="refreshCurrentView"
        @admin-action="handleAdminAction"
        @quick-action="handleQuickAction"
      />

      <div class="d-flex border-top splitter-container flex-fill position-relative">
        <!-- Admin Sidebar -->
        <AdminSidebar
          :is-collapsed="isCollapsed"
          :width="sidebarWidth"
          :current-view="currentView"
          @view-select="handleViewChange"
        />

        <!-- Splitter -->
        <div
          v-show="!isCollapsed"
          class="splitter"
          role="separator"
          @mousedown="startDragging"
        />

        <!-- Admin Content -->
        <AdminContent
          :current-view="currentView"
          :search-query="searchQuery"
          :time-range="timeRange"
          :auto-refresh="autoRefresh"
          :is-loading="isLoading"
          @error="handleError"
          @success="handleSuccess"
          @loading="handleLoading"
        />
      </div>
    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import AdminToolbar from './AdminToolbar.vue'
import AdminSidebar from './AdminSidebar.vue'
import AdminContent from './AdminContent.vue'
import adminWebSocketService from '@/services/adminWebSocketService'

// Reactive state
const currentView = ref('dashboard')
const searchQuery = ref('')
const timeRange = ref('last_hour')
const autoRefresh = ref(true)
const isLoading = ref(false)
const error = ref('')
const successMessage = ref('')

// Sidebar state
const isCollapsed = ref(false)
const sidebarWidth = ref(280)
const isDragging = ref(false)

// Notifications - Dynamic via WebSocket
const notificationCount = ref(0)
const notifications = ref<Array<{
  id: number
  type: string
  title: string
  message: string
  timestamp: number
}>>([])

// Sidebar controls
const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value
}

const startDragging = (event: MouseEvent) => {
  if (isCollapsed.value) return

  isDragging.value = true
  const startX = event.clientX
  const startWidth = sidebarWidth.value

  const handleMouseMove = (e: MouseEvent) => {
    const newWidth = startWidth + (e.clientX - startX)
    sidebarWidth.value = Math.max(200, Math.min(400, newWidth))
  }

  const handleMouseUp = () => {
    isDragging.value = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }

  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

// Event handlers
const handleViewChange = (view: string) => {
  currentView.value = view
}

const handleSearch = (query: string) => {
  searchQuery.value = query
}

const handleTimeRangeChange = (range: string) => {
  timeRange.value = range
}

const handleAutoRefreshChange = (enabled: boolean) => {
  autoRefresh.value = enabled
}

const refreshCurrentView = () => {
  isLoading.value = true
  // Simulate refresh
  setTimeout(() => {
    isLoading.value = false
    successMessage.value = 'Data refreshed successfully'
    setTimeout(() => successMessage.value = '', 3000)
  }, 1000)
}

const handleError = (message: string) => {
  error.value = message
  setTimeout(() => error.value = '', 5000)
}

const handleSuccess = (message: string) => {
  successMessage.value = message
  setTimeout(() => successMessage.value = '', 3000)
}

const handleLoading = (loading: boolean) => {
  isLoading.value = loading
}

// Admin actions
const handleAdminAction = (action: string) => {
  switch (action) {
    case 'export-data':
      handleSuccess('Data export initiated')
      break
    case 'system-backup':
      handleSuccess('System backup started')
      break
    case 'clear-cache':
      handleSuccess('Cache cleared successfully')
      break
    case 'system-restart':
      if (confirm('Are you sure you want to restart the system?')) {
        handleSuccess('System restart initiated')
      }
      break
  }
}

// Quick actions
const handleQuickAction = (action: string) => {
  switch (action) {
    case 'create-user':
      currentView.value = 'users'
      handleSuccess('Switched to User Management')
      break
    case 'invite-user':
      handleSuccess('User invitation functionality')
      break
    case 'create-backup':
      handleSuccess('Backup creation initiated')
      break
    case 'view-logs':
      handleSuccess('System logs opened')
      break
  }
}

// WebSocket event handlers for notifications
const handleSystemAlert = (alert: any) => {
  const notification = {
    id: Date.now(),
    type: alert.type || 'info',
    title: alert.title || 'System Alert',
    message: alert.message || 'System notification',
    timestamp: alert.timestamp || Date.now()
  }

  notifications.value.unshift(notification)
  notificationCount.value = notifications.value.length

  // Keep only last 10 notifications
  if (notifications.value.length > 10) {
    notifications.value = notifications.value.slice(0, 10)
  }
}

const handleUserAction = (actionData: any) => {
  const notification = {
    id: Date.now(),
    type: 'info',
    title: 'User Action',
    message: `${actionData.action}: ${actionData.userEmail || 'Unknown user'}`,
    timestamp: actionData.timestamp || Date.now()
  }

  notifications.value.unshift(notification)
  notificationCount.value = notifications.value.length

  // Keep only last 10 notifications
  if (notifications.value.length > 10) {
    notifications.value = notifications.value.slice(0, 10)
  }
}

const loadInitialNotifications = () => {
  // Load initial dashboard data to populate alerts
  if (adminWebSocketService.dashboardData.overview?.alerts) {
    const alerts = adminWebSocketService.dashboardData.overview.alerts
    notifications.value = alerts.map((alert: any, index: number) => ({
      id: Date.now() + index,
      type: alert.type || 'info',
      title: alert.title || 'System Alert',
      message: alert.message || alert.description || 'System notification',
      timestamp: alert.timestamp || Date.now()
    }))
    notificationCount.value = notifications.value.length
  }
}

// Lifecycle hooks
onMounted(() => {
  // Set up WebSocket listeners
  adminWebSocketService.on('system_alert', handleSystemAlert)
  adminWebSocketService.on('user_action', handleUserAction)
  adminWebSocketService.on('dashboard_updated', loadInitialNotifications)

  // Connect to WebSocket if not already connected
  if (!adminWebSocketService.isConnected.value) {
    adminWebSocketService.connect().then(() => {
      loadInitialNotifications()
    }).catch(error => {
      console.warn('Failed to connect to WebSocket for admin notifications:', error)
    })
  } else {
    loadInitialNotifications()
  }
})

onUnmounted(() => {
  // Remove WebSocket listeners
  adminWebSocketService.off('system_alert', handleSystemAlert)
  adminWebSocketService.off('user_action', handleUserAction)
  adminWebSocketService.off('dashboard_updated', loadInitialNotifications)
})

// Watch for view changes
watch(currentView, () => {
  // View change handler - can be used for cleanup or analytics
})
</script>

<style scoped>
.admin-root {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: calc(100vh - 54px);
}

.splitter-container {
  display: flex;
  position: relative;
  overflow: hidden;
  flex: 1 1 auto;
  min-height: 0;
}

.splitter {
  width: 5px;
  cursor: col-resize;
  background: var(--tblr-gray-50);
  transition: background-color 0.2s ease;
  z-index: 10;
  user-select: none;
  flex-shrink: 0;
}

.splitter:hover,
.splitter:focus {
  background-color: var(--tblr-gray-100);
}
</style>