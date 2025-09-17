<template>
  <div class="dashboard-component">
    <!-- System Health Status -->
    <div class="row mb-4">
      <div class="col-12">
        <div
          class="card border-0"
          :class="getSystemHealthClass()"
        >
          <div class="card-body">
            <div class="row align-items-center">
              <div class="col-auto">
                <span
                  class="avatar avatar-lg"
                  :class="getSystemHealthAvatarClass()"
                >
                  <Icon
                    :icon="getSystemHealthIcon()"
                    size="24"
                  />
                </span>
              </div>
              <div class="col">
                <h3 class="mb-1">
                  {{ getSystemHealthTitle() }}
                </h3>
                <div class="text-muted">
                  {{ getSystemHealthMessage() }}
                </div>
              </div>
              <div class="col-auto">
                <div class="text-end">
                  <div class="h3 mb-0">
                    {{ formatUptime(overview?.system?.uptime) }}
                  </div>
                  <div class="text-muted small">
                    System Uptime
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- System Status Cards -->
    <div class="row mb-4">
      <div class="col-sm-6 col-lg-3">
        <div class="card card-sm">
          <div class="card-body">
            <div class="row align-items-center">
              <div class="col-auto">
                <span class="bg-blue text-white avatar">
                  <Icon icon="tabler:server" />
                </span>
              </div>
              <div class="col">
                <div
                  class="font-weight-medium"
                  v-text="sanitizeText(overview?.system?.status) || 'Unknown'"
                />
                <div class="text-muted">
                  System Status
                </div>
                <div class="progress progress-sm mt-2">
                  <div
                    class="progress-bar"
                    :class="systemStatusBadgeClass"
                    style="width: 100%"
                    role="progressbar"
                    aria-label="System status indicator"
                    aria-valuenow="100"
                    aria-valuemin="0"
                    aria-valuemax="100"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-sm-6 col-lg-3">
        <div class="card card-sm">
          <div class="card-body">
            <div class="row align-items-center">
              <div class="col-auto">
                <span class="bg-green text-white avatar">
                  <Icon icon="tabler:memory" />
                </span>
              </div>
              <div class="col">
                <div
                  class="font-weight-medium"
                  v-text="sanitizeText(overview?.system?.memory?.usage_percent) || '0%'"
                />
                <div class="text-muted">
                  Memory Usage
                </div>
                <div class="progress progress-sm mt-2">
                  <div
                    class="progress-bar bg-green"
                    :style="{ width: overview?.system?.memory?.usage_percent || '0%' }"
                    role="progressbar"
                    aria-label="Memory usage indicator"
                    :aria-valuenow="parseInt(overview?.system?.memory?.usage_percent || '0')"
                    aria-valuemin="0"
                    aria-valuemax="100"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-sm-6 col-lg-3">
        <div class="card card-sm">
          <div class="card-body">
            <div class="row align-items-center">
              <div class="col-auto">
                <span class="bg-yellow text-white avatar">
                  <Icon icon="tabler:cpu" />
                </span>
              </div>
              <div class="col">
                <div
                  class="font-weight-medium"
                  v-text="sanitizeText(overview?.system?.cpu?.usage_percent) || '0%'"
                />
                <div class="text-muted">
                  CPU Usage
                </div>
                <div class="progress progress-sm mt-2">
                  <div
                    class="progress-bar bg-yellow"
                    :style="{ width: overview?.system?.cpu?.usage_percent || '0%' }"
                    role="progressbar"
                    aria-label="CPU usage indicator"
                    :aria-valuenow="parseInt(overview?.system?.cpu?.usage_percent || '0')"
                    aria-valuemin="0"
                    aria-valuemax="100"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-sm-6 col-lg-3">
        <div class="card card-sm">
          <div class="card-body">
            <div class="row align-items-center">
              <div class="col-auto">
                <span class="bg-red text-white avatar">
                  <Icon icon="tabler:alert-triangle" />
                </span>
              </div>
              <div class="col">
                <div class="font-weight-medium">
                  {{ overview?.errors?.total || 0 }}
                </div>
                <div class="text-muted">
                  Total Errors
                </div>
                <div class="progress progress-sm mt-2">
                  <div
                    class="progress-bar bg-red"
                    :style="{ width: Math.min((overview?.errors?.total || 0) * ERROR_PROGRESS_MULTIPLIER, 100) + '%' }"
                    role="progressbar"
                    aria-label="Error count indicator"
                    :aria-valuenow="Math.min((overview?.errors?.total || 0) * ERROR_PROGRESS_MULTIPLIER, 100)"
                    aria-valuemin="0"
                    aria-valuemax="100"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Stats and Charts Row -->
    <div class="row mb-4">
      <div class="col-md-8">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">
              <Icon
                icon="tabler:chart-line"
                class="me-2"
              />
              System Performance
            </h3>
          </div>
          <div class="card-body">
            <div class="chart-placeholder">
              <div class="text-center py-4 text-muted">
                <Icon
                  icon="tabler:chart-line"
                  size="48"
                  class="mb-2"
                />
                <div>Performance charts will be displayed here</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">
              <Icon
                icon="tabler:activity"
                class="me-2"
              />
              System Activity
            </h3>
          </div>
          <div class="card-body">
            <div class="row">
              <div class="col-6">
                <div class="text-center">
                  <div class="h3 text-blue">
                    {{ overview?.requests?.total || 0 }}
                  </div>
                  <div class="text-muted small">
                    Total Requests
                  </div>
                </div>
              </div>
              <div class="col-6">
                <div class="text-center">
                  <div class="h3 text-green">
                    {{ overview?.requests?.requests_per_minute || 0 }}
                  </div>
                  <div class="text-muted small">
                    Req/Min
                  </div>
                </div>
              </div>
            </div>
            <div class="row mt-3">
              <div class="col-6">
                <div class="text-center">
                  <div class="h3 text-yellow">
                    {{ overview?.requests?.avg_response_time || 0 }}ms
                  </div>
                  <div class="text-muted small">
                    Avg Response
                  </div>
                </div>
              </div>
              <div class="col-6">
                <div class="text-center">
                  <div class="h3 text-red">
                    {{ overview?.requests?.error_rate || 0 }}%
                  </div>
                  <div class="text-muted small">
                    Error Rate
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Alerts -->
    <div class="row">
      <div class="col-12">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">
              <Icon
                icon="tabler:bell"
                class="me-2"
              />
              Recent System Alerts
            </h3>
          </div>
          <div class="card-body p-0">
            <div
              v-if="!overview?.alerts || overview.alerts.length === 0"
              class="empty"
            >
              <div class="empty-icon">
                <Icon
                  icon="tabler:bell-off"
                  size="48"
                  class="text-muted"
                />
              </div>
              <p class="empty-title">
                No recent alerts
              </p>
              <p class="empty-subtitle text-muted">
                System alerts will appear here when they occur
              </p>
            </div>
            <div
              v-else
              class="table-responsive"
            >
              <table class="table table-vcenter card-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Message</th>
                    <th>Level</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="alert in overview.alerts"
                    :key="alert.timestamp"
                  >
                    <td>
                      <span
                        class="badge"
                        :class="getAlertTypeBadgeClass(alert.type)"
                        v-text="sanitizeText(alert.type)"
                      />
                    </td>
                    <td v-text="sanitizeText(alert.message)" />
                    <td>
                      <span
                        class="badge"
                        :class="getAlertLevelBadgeClass(alert.level)"
                        v-text="sanitizeText(alert.level)"
                      />
                    </td>
                    <td
                      class="text-muted"
                      v-text="formatTimestamp(alert.timestamp)"
                    />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { Icon } from '@iconify/vue'
import api from '@/api/axios'

// Utility function for sanitizing text
const sanitizeText = (text: string | undefined | null): string => {
  if (!text) return ''
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Constants for magic numbers
const REFRESH_INTERVAL_MS = 30000 // 30 seconds
const ERROR_PROGRESS_MULTIPLIER = 2

interface SystemOverview {
  system: {
    status: string | undefined
    uptime: number | undefined
    memory: { usage_percent: string | undefined, status: string | undefined }
    cpu: { usage_percent: string | undefined, status: string | undefined }
    version: string | undefined
  }
  errors: {
    total: number
    critical: number
    operational: number
    trends: { lastHour: number, lastDay: number, hourlyRate: number }
    topErrors: Array<{
      type: string
      code: string
      message: string
      count: number
      lastOccurrence: number
    }>
  }
  requests: {
    total: number
    errors: number
    error_rate: number
    avg_response_time: number
    requests_per_minute: number
  }
  alerts: Array<{
    type: string
    message: string
    level: string
    timestamp: number
  }>
  database: {
    status: string | undefined
    total_queries: number
    query_errors: number
    slow_queries: number
  }
  cache: {
    status: string | undefined
    hits: number
    misses: number
    hit_rate: string
  }
}

interface Props {
  searchQuery?: string
  timeRange?: string
  autoRefresh?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  searchQuery: '',
  timeRange: 'last_hour',
  autoRefresh: true
})

const emit = defineEmits<{
  error: [message: string]
  success: [message: string]
  loading: [isLoading: boolean]
}>()

const overview = ref<SystemOverview | null>(null)
const isLoading = ref(false)

// Computed properties
const systemStatusBadgeClass = computed(() => {
  const status = overview.value?.system?.status
  return {
    'bg-green': status === 'healthy',
    'bg-yellow': status === 'warning',
    'bg-red': status === 'critical'
  }
})

// Helper functions
const getSystemHealthClass = () => {
  const status = overview.value?.system?.status
  if (status === 'healthy') return 'bg-green-lt'
  if (status === 'warning') return 'bg-yellow-lt'
  return 'bg-red-lt'
}

const getSystemHealthAvatarClass = () => {
  const status = overview.value?.system?.status
  if (status === 'healthy') return 'bg-green text-white'
  if (status === 'warning') return 'bg-yellow text-white'
  return 'bg-red text-white'
}

const getSystemHealthIcon = () => {
  const status = overview.value?.system?.status
  if (status === 'healthy') return 'tabler:check'
  if (status === 'warning') return 'tabler:alert-triangle'
  return 'tabler:alert-circle'
}

const getSystemHealthTitle = () => {
  const status = overview.value?.system?.status
  if (status === 'healthy') return 'System Status: Healthy'
  if (status === 'warning') return 'System Status: Warning'
  return 'System Status: Critical'
}

const getSystemHealthMessage = () => {
  const status = overview.value?.system?.status
  const errorCount = overview.value?.errors?.total || 0
  if (status === 'healthy') return 'All systems operational - No critical issues'
  if (status === 'warning') return `System monitoring detected ${errorCount} issues - Monitor closely`
  return `Critical system issues detected - Immediate attention required`
}

const formatUptime = (uptime: number | undefined) => {
  if (!uptime) return '0d 0h'
  const days = Math.floor(uptime / 86400)
  const hours = Math.floor((uptime % 86400) / 3600)
  return `${days}d ${hours}h`
}

const formatTimestamp = (timestamp: number) => {
  if (!timestamp || isNaN(timestamp)) return 'N/A'
  return new Date(timestamp).toLocaleString()
}

const getAlertTypeBadgeClass = (type: string) => {
  switch (type.toLowerCase()) {
    case 'error': return 'bg-red-lt text-red'
    case 'warning': return 'bg-yellow-lt text-yellow'
    case 'info': return 'bg-blue-lt text-blue'
    default: return 'bg-gray-lt text-gray'
  }
}

const getAlertLevelBadgeClass = (level: string) => {
  switch (level.toLowerCase()) {
    case 'critical': return 'bg-red-lt text-red'
    case 'high': return 'bg-orange-lt text-orange'
    case 'medium': return 'bg-yellow-lt text-yellow'
    case 'low': return 'bg-blue-lt text-blue'
    default: return 'bg-gray-lt text-gray'
  }
}

// Data fetching
const refreshData = async () => {
  if (isLoading.value) return

  isLoading.value = true
  emit('loading', true)

  try {
    const response = await api.get('/dashboard/overview')
    overview.value = response.data
    emit('success', 'Dashboard data refreshed successfully')
  } catch (err: any) {
    emit('error', err.response?.data?.message || 'Failed to load dashboard data')
    console.error('Dashboard error:', err)
  } finally {
    isLoading.value = false
    emit('loading', false)
  }
}

// Store interval ID for cleanup
let refreshInterval: NodeJS.Timeout | null = null

// Watch for prop changes
watch(() => props.timeRange, () => {
  refreshData()
})

watch(() => props.autoRefresh, (enabled) => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
  }

  if (enabled) {
    refreshInterval = setInterval(refreshData, REFRESH_INTERVAL_MS)
  }
})

onMounted(() => {
  refreshData()

  if (props.autoRefresh) {
    refreshInterval = setInterval(refreshData, REFRESH_INTERVAL_MS)
  }
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
  }
})

// Expose sanitizeText for template use
defineExpose({
  sanitizeText
})
</script>

<style scoped>
.card-sm {
  transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
}

.card-sm:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.chart-placeholder {
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.progress-sm {
  height: 4px;
}

.empty-icon {
  margin-bottom: 1rem;
}
</style>