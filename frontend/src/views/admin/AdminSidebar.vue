<template>
  <aside
    class="border-end sidebar"
    :class="{ 'w-0': isCollapsed }"
    :style="sidebarStyle"
    :aria-hidden="isCollapsed"
  >
    <div class="col-docs flex-fill">
      <nav class="nav nav-vertical">
        <!-- Admin Navigation -->
        <div class="nav-section">
          <div class="nav-section-title">
            <Icon
              icon="tabler:shield-check"
              class="me-2"
            />
            Administration
          </div>

          <!-- Dashboard -->
          <a
            href="#"
            class="nav-link"
            :class="{ active: currentView === 'dashboard' }"
            @click.prevent="$emit('viewSelect', 'dashboard')"
          >
            <Icon
              icon="tabler:dashboard"
              class="nav-icon"
            />
            <span class="nav-title">Dashboard</span>
            <span class="nav-subtitle">System overview & metrics</span>
          </a>

          <!-- Error Analytics -->
          <a
            href="#"
            class="nav-link"
            :class="{ active: currentView === 'analytics' }"
            @click.prevent="$emit('viewSelect', 'analytics')"
          >
            <Icon
              icon="tabler:chart-line"
              class="nav-icon"
            />
            <span class="nav-title">Error Analytics</span>
            <span class="nav-subtitle">Error monitoring & analysis</span>
            <span
              v-if="errorCount > 0"
              class="badge ms-auto"
              :class="errorCount > 10 ? 'bg-red' : 'bg-yellow'"
            >
              {{ formatNumber(errorCount) }}
            </span>
          </a>

          <!-- User Management -->
          <a
            href="#"
            class="nav-link"
            :class="{ active: currentView === 'users' }"
            @click.prevent="$emit('viewSelect', 'users')"
          >
            <Icon
              icon="tabler:users"
              class="nav-icon"
            />
            <span class="nav-title">User Management</span>
            <span class="nav-subtitle">Manage users & permissions</span>
            <span
              v-if="totalUsers > 0"
              class="badge bg-blue ms-auto"
            >
              {{ formatNumber(totalUsers) }}
            </span>
          </a>
        </div>

        <!-- System Status -->
        <div class="nav-section mt-4">
          <div class="nav-section-title">
            <Icon
              icon="tabler:server"
              class="me-2"
            />
            System Status
          </div>

          <div class="nav-item-status">
            <div class="d-flex align-items-center justify-content-between">
              <div class="d-flex align-items-center">
                <div
                  class="status-dot me-2"
                  :class="getHealthDotClass(systemHealth)"
                />
                <span class="small">System Health</span>
              </div>
              <span
                class="badge"
                :class="getHealthBadgeClass(systemHealth)"
              >
                {{ systemHealth.charAt(0).toUpperCase() + systemHealth.slice(1) }}
              </span>
            </div>
          </div>

          <div class="nav-item-status">
            <div class="d-flex align-items-center justify-content-between">
              <div class="d-flex align-items-center">
                <div
                  class="status-dot me-2"
                  :class="getUsageDotClass(cpuUsage)"
                />
                <span class="small">CPU Usage</span>
              </div>
              <span
                class="badge"
                :class="getUsageBadgeClass(cpuUsage)"
              >
                {{ cpuUsage.toFixed(1) }}%
              </span>
            </div>
          </div>

          <div class="nav-item-status">
            <div class="d-flex align-items-center justify-content-between">
              <div class="d-flex align-items-center">
                <div
                  class="status-dot me-2"
                  :class="getUsageDotClass(memoryUsage)"
                />
                <span class="small">Memory</span>
              </div>
              <span
                class="badge"
                :class="getUsageBadgeClass(memoryUsage)"
              >
                {{ memoryUsage.toFixed(1) }}%
              </span>
            </div>
          </div>

          <div class="nav-item-status">
            <div class="d-flex align-items-center justify-content-between">
              <div class="d-flex align-items-center">
                <div
                  class="status-dot me-2"
                  :class="errorCount > 10 ? 'bg-red' : errorCount > 0 ? 'bg-yellow' : 'bg-green'"
                />
                <span class="small">Errors (24h)</span>
              </div>
              <span
                class="badge"
                :class="errorCount > 10 ? 'bg-red-lt text-red' : errorCount > 0 ? 'bg-yellow-lt text-yellow' : 'bg-green-lt text-green'"
              >
                {{ formatNumber(errorCount) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Quick Stats -->
        <div class="nav-section mt-4">
          <div class="nav-section-title">
            <Icon
              icon="tabler:chart-bar"
              class="me-2"
            />
            Quick Stats
          </div>

          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-value">
                {{ formatNumber(totalUsers) }}
              </div>
              <div class="stat-label">
                Total Users
              </div>
            </div>
            <div class="stat-item">
              <div class="stat-value">
                {{ totalAdmins }}
              </div>
              <div class="stat-label">
                Admins
              </div>
            </div>
            <div class="stat-item">
              <div class="stat-value">
                {{ formatNumber(requestsPerMinute) }}
              </div>
              <div class="stat-label">
                Req/Min
              </div>
            </div>
            <div class="stat-item">
              <div class="stat-value">
                {{ uptime }}
              </div>
              <div class="stat-label">
                Uptime
              </div>
            </div>
          </div>
        </div>

        <!-- Recent Activity -->
        <div class="nav-section mt-4">
          <div class="nav-section-title">
            <Icon
              icon="tabler:activity"
              class="me-2"
            />
            Recent Activity
          </div>

          <div class="activity-list">
            <div class="activity-item">
              <div class="activity-icon bg-green-lt">
                <Icon
                  icon="tabler:user-plus"
                  size="14"
                />
              </div>
              <div class="activity-content">
                <div class="activity-text">
                  New user registered
                </div>
                <div class="activity-time">
                  2 minutes ago
                </div>
              </div>
            </div>

            <div class="activity-item">
              <div class="activity-icon bg-blue-lt">
                <Icon
                  icon="tabler:database-export"
                  size="14"
                />
              </div>
              <div class="activity-content">
                <div class="activity-text">
                  System backup completed
                </div>
                <div class="activity-time">
                  1 hour ago
                </div>
              </div>
            </div>

            <div class="activity-item">
              <div class="activity-icon bg-yellow-lt">
                <Icon
                  icon="tabler:alert-triangle"
                  size="14"
                />
              </div>
              <div class="activity-content">
                <div class="activity-text">
                  High memory usage detected
                </div>
                <div class="activity-time">
                  3 hours ago
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import adminWebSocketService from '@/services/adminWebSocketService'

interface Props {
  isCollapsed: boolean
  width: number
  currentView: string
}

const props = defineProps<Props>()

defineEmits<{
  viewSelect: [view: string]
}>()

const sidebarStyle = computed(() => {
  if (props.isCollapsed) {
    return { width: '0px', minWidth: '0px' }
  }
  return { width: `${props.width}px`, minWidth: `${props.width}px` }
})

// Live data from WebSocket
const systemMetrics = computed(() => adminWebSocketService.systemMetrics.data)
const userStats = computed(() => adminWebSocketService.userStatistics.data)
const errorStats = computed(() => adminWebSocketService.errorMetrics.data)
const dashboardData = computed(() => adminWebSocketService.dashboardData.overview)

// Computed values for dynamic data
const systemHealth = computed(() => {
  const status = systemMetrics.value?.status || dashboardData.value?.system?.status
  return status || 'unknown'
})

const cpuUsage = computed(() => {
  const cpu = systemMetrics.value?.cpu || dashboardData.value?.system?.cpu
  return cpu ? parseFloat(cpu.usage_percent) || 0 : 0
})

const memoryUsage = computed(() => {
  const memory = systemMetrics.value?.memory || dashboardData.value?.system?.memory
  return memory ? parseFloat(memory.usage_percent) || 0 : 0
})

const errorCount = computed(() => {
  return errorStats.value?.summary?.totalErrors || dashboardData.value?.errors?.total || 0
})

const totalUsers = computed(() => {
  return userStats.value?.total || dashboardData.value?.users?.total || 0
})

const totalAdmins = computed(() => {
  return userStats.value?.admins || dashboardData.value?.users?.admins || 0
})

const requestsPerMinute = computed(() => {
  const requests = systemMetrics.value?.requests || dashboardData.value?.requests
  return requests ? parseFloat(requests.requests_per_minute) || 0 : 0
})

const uptime = computed(() => {
  const system = systemMetrics.value || dashboardData.value?.system
  if (system?.uptime) {
    const hours = Math.floor(system.uptime / 3600)
    const days = Math.floor(hours / 24)
    return days > 0 ? `${days}d` : `${hours}h`
  }
  return '0h'
})

// Helper functions
const getHealthBadgeClass = (status: string) => {
  switch (status) {
    case 'healthy': return 'bg-green-lt text-green'
    case 'warning': return 'bg-yellow-lt text-yellow'
    case 'critical': return 'bg-red-lt text-red'
    default: return 'bg-gray-lt text-gray'
  }
}

const getHealthDotClass = (status: string) => {
  switch (status) {
    case 'healthy': return 'bg-green'
    case 'warning': return 'bg-yellow'
    case 'critical': return 'bg-red'
    default: return 'bg-gray'
  }
}

const getUsageDotClass = (percentage: number) => {
  if (percentage > 90) return 'bg-red'
  if (percentage > 75) return 'bg-yellow'
  return 'bg-green'
}

const getUsageBadgeClass = (percentage: number) => {
  if (percentage > 90) return 'bg-red-lt text-red'
  if (percentage > 75) return 'bg-yellow-lt text-yellow'
  return 'bg-green-lt text-green'
}

const formatNumber = (num: number) => {
  if (num > 1000) return `${(num / 1000).toFixed(1)}k`
  return num.toString()
}

// Setup WebSocket connection
onMounted(() => {
  if (!adminWebSocketService.isConnected.value) {
    adminWebSocketService.connect().catch(console.warn)
  }
})
</script>

<style scoped>
.sidebar {
  background-color: var(--tblr-bg-surface);
  transition: width 0.3s ease;
  overflow: hidden;
  border-right: 1px solid var(--tblr-border-color);
}

.col-docs {
  padding: 1rem;
  height: 100%;
  overflow-y: auto;
}

.nav-vertical {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.nav-section {
  margin-bottom: 1rem;
}

.nav-section-title {
  display: flex;
  align-items: center;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--tblr-text-muted);
  margin-bottom: 0.5rem;
  padding: 0 0.75rem;
  letter-spacing: 0.05em;
}

.nav-link {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 0.75rem;
  border-radius: var(--tblr-border-radius);
  color: var(--tblr-body-color);
  text-decoration: none;
  transition: all 0.2s ease;
  border: 1px solid transparent;
  margin-bottom: 0.25rem;
}

.nav-link:hover {
  background-color: var(--tblr-gray-100);
  color: var(--tblr-body-color);
}

.nav-link.active {
  background-color: var(--tblr-primary);
  color: white;
  border-color: var(--tblr-primary);
  box-shadow: 0 2px 4px rgba(var(--tblr-primary-rgb), 0.25);
}

.nav-icon {
  font-size: 1.25rem;
  margin-bottom: 0.25rem;
}

.nav-title {
  font-weight: 600;
  font-size: 0.875rem;
  margin-bottom: 0.125rem;
}

.nav-subtitle {
  font-size: 0.75rem;
  opacity: 0.8;
  line-height: 1.2;
}

.nav-link.active .nav-subtitle {
  opacity: 0.9;
}

.nav-item-status {
  padding: 0.5rem 0.75rem;
  margin-bottom: 0.25rem;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.stat-item {
  text-align: center;
  padding: 0.75rem 0.5rem;
  background-color: var(--tblr-bg-surface-secondary);
  border-radius: var(--tblr-border-radius);
  border: 1px solid var(--tblr-border-color);
}

.stat-value {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--tblr-primary);
  margin-bottom: 0.125rem;
}

.stat-label {
  font-size: 0.75rem;
  color: var(--tblr-text-muted);
  font-weight: 500;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.activity-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.5rem;
  background-color: var(--tblr-bg-surface-secondary);
  border-radius: var(--tblr-border-radius);
  border: 1px solid var(--tblr-border-color);
}

.activity-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.activity-content {
  flex: 1;
  min-width: 0;
}

.activity-text {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--tblr-body-color);
  margin-bottom: 0.125rem;
}

.activity-time {
  font-size: 0.75rem;
  color: var(--tblr-text-muted);
}

/* Scrollbar styling */
.col-docs::-webkit-scrollbar {
  width: 4px;
}

.col-docs::-webkit-scrollbar-track {
  background: transparent;
}

.col-docs::-webkit-scrollbar-thumb {
  background: var(--tblr-border-color);
  border-radius: 2px;
}

.col-docs::-webkit-scrollbar-thumb:hover {
  background: var(--tblr-gray-400);
}
</style>