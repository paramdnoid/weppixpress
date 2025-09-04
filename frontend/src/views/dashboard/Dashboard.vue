<template>
  <DefaultLayout>
    <div class="container-fluid overflow-scroll">
      <div class="page-header d-print-none">
        <div class="row align-items-center">
          <div class="col">
            <h2 class="page-title">Error Dashboard</h2>
            <div class="text-muted mt-1">System monitoring and error visualization</div>
          </div>
          <div class="col ms-auto d-print-none">
            <div class="btn-list">
              <select v-model="selectedTimeRange" class="form-select" @change="refreshData">
                <option value="last_minute">Last Minute</option>
                <option value="last_hour">Last Hour</option>
                <option value="last_day">Last Day</option>
              </select>
              <button class="btn btn-primary" @click="refreshData" :disabled="isLoading">
                <Icon icon="tabler:refresh" class="me-1" />
                {{ isLoading ? 'Loading...' : 'Refresh' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- System Status Cards -->
      <div class="row row-deck row-cards mb-4">
        <div class="col-sm-6 col-lg-3">
          <div class="card card-sm">
            <div class="card-body">
              <div class="row align-items-center">
                <div class="col-auto">
                  <span class="bg-primary text-white avatar">
                    <Icon icon="tabler:server" />
                  </span>
                </div>
                <div class="col">
                  <div class="font-weight-medium">
                    System Status
                    <span class="badge ms-2" :class="systemStatusBadgeClass">
                      {{ overview?.system?.status || 'Unknown' }}
                    </span>
                  </div>
                  <div class="text-muted">
                    Uptime: {{ formatUptime(overview?.system?.uptime) }}
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
                  <span class="bg-danger text-white avatar">
                    <Icon icon="tabler:alert-triangle" />
                  </span>
                </div>
                <div class="col">
                  <div class="font-weight-medium">
                    {{ overview?.errors?.total || 0 }} Errors
                  </div>
                  <div class="text-muted">
                    Critical: {{ overview?.errors?.critical || 0 }}
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
                  <span class="bg-blue text-white avatar">
                    <Icon icon="tabler:activity" />
                  </span>
                </div>
                <div class="col">
                  <div class="font-weight-medium">
                    {{ overview?.requests?.requests_per_minute || 0 }}/min
                  </div>
                  <div class="text-muted">
                    Error Rate: {{ (overview?.requests?.error_rate || 0).toFixed(2) }}%
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
                    <Icon icon="tabler:clock" />
                  </span>
                </div>
                <div class="col">
                  <div class="font-weight-medium">
                    {{ Math.round(overview?.requests?.avg_response_time || 0) }}ms
                  </div>
                  <div class="text-muted">
                    Average response time
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- System Metrics Row -->
      <div class="row row-deck row-cards mb-4">
        <div class="col-md-6">
          <div class="card">
            <div class="card-header">
              <div class="row align-items-center">
                <div class="col-auto">
                  <span class="bg-blue text-white avatar avatar-sm">
                    <Icon icon="tabler:cpu" />
                  </span>
                </div>
                <div class="col">
                  <h3 class="card-title mb-1">System Resources</h3>
                  <div class="text-muted">Real-time performance metrics</div>
                </div>
              </div>
            </div>
            <div class="card-body">
              <div class="mb-4">
                <div class="row align-items-center mb-2">
                  <div class="col">
                    <div class="font-weight-medium d-flex align-items-center">
                      <Icon icon="tabler:memory" class="me-2 text-blue" />
                      Memory Usage
                    </div>
                  </div>
                  <div class="col-auto">
                    <span class="badge bg-blue-lt">{{ overview?.system?.memory?.usage_percent }}%</span>
                  </div>
                </div>
                <div class="progress progress-sm">
                  <div class="progress-bar"
                    :class="getResourceBarClass(overview?.system?.memory?.usage_percent ? parseFloat(overview.system.memory.usage_percent) : undefined)"
                    :style="{ width: (overview?.system?.memory?.usage_percent || '0') + '%' }"
                    role="progressbar"></div>
                </div>
              </div>
              <div class="mb-3">
                <div class="row align-items-center mb-2">
                  <div class="col">
                    <div class="font-weight-medium d-flex align-items-center">
                      <Icon icon="tabler:cpu" class="me-2 text-green" />
                      CPU Usage
                    </div>
                  </div>
                  <div class="col-auto">
                    <span class="badge bg-green-lt">{{ overview?.system?.cpu?.usage_percent }}%</span>
                  </div>
                </div>
                <div class="progress progress-sm">
                  <div class="progress-bar"
                    :class="getResourceBarClass(overview?.system?.cpu?.usage_percent ? parseFloat(overview.system.cpu.usage_percent) : undefined)"
                    :style="{ width: (overview?.system?.cpu?.usage_percent || '0') + '%' }"
                    role="progressbar"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-md-6">
          <div class="card">
            <div class="card-header">
              <div class="row align-items-center">
                <div class="col-auto">
                  <span class="bg-red text-white avatar avatar-sm">
                    <Icon icon="tabler:trending-up" />
                  </span>
                </div>
                <div class="col">
                  <h3 class="card-title mb-1">Error Trends</h3>
                  <div class="text-muted">Historical error patterns</div>
                </div>
              </div>
            </div>
            <div class="card-body">
              <div class="row mb-3">
                <div class="col-6">
                  <div class="d-flex align-items-center mb-2">
                    <Icon icon="tabler:clock-hour-1" class="me-2 text-orange" />
                    <div class="text-muted small">Last Hour</div>
                  </div>
                  <div class="h2 mb-0 text-orange">{{ overview?.errors?.trends?.lastHour || 0 }}</div>
                </div>
                <div class="col-6">
                  <div class="d-flex align-items-center mb-2">
                    <Icon icon="tabler:calendar" class="me-2 text-red" />
                    <div class="text-muted small">Last Day</div>
                  </div>
                  <div class="h2 mb-0 text-red">{{ overview?.errors?.trends?.lastDay || 0 }}</div>
                </div>
              </div>
              <div class="mt-4 pt-3 border-top">
                <div class="d-flex align-items-center mb-2">
                  <Icon icon="tabler:activity" class="me-2 text-purple" />
                  <div class="text-muted">Hourly Rate</div>
                </div>
                <div class="h3 mb-0 text-purple">{{ (overview?.errors?.trends?.hourlyRate || 0).toFixed(1) }} <small class="text-muted">errors/hour</small></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Error Analysis -->
      <div class="row row-deck row-cards mb-4">
        <div class="col-md-8">
          <div class="card">
            <div class="card-header">
              <div class="row align-items-center">
                <div class="col-auto">
                  <span class="bg-red text-white avatar avatar-sm">
                    <Icon icon="tabler:bug" />
                  </span>
                </div>
                <div class="col">
                  <h3 class="card-title mb-1">Top Errors</h3>
                  <div class="text-muted">Most frequent application errors</div>
                </div>
              </div>
            </div>
            <div class="card-body p-0">
              <div class="table-responsive">
                <table class="table table-vcenter card-table table-hover">
                  <thead class="bg-light">
                    <tr>
                      <th class="w-1">Type</th>
                      <th>Message</th>
                      <th class="text-center w-1">Count</th>
                      <th class="text-center w-1">Last Seen</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="error in overview?.errors?.topErrors" :key="`${error.type}-${error.code}`" class="border-bottom">
                      <td>
                        <div class="d-flex flex-column">
                          <span class="badge bg-red-lt text-red fw-bold">{{ error.type }}</span>
                          <small class="text-muted mt-1">#{{ error.code }}</small>
                        </div>
                      </td>
                      <td>
                        <div class="text-truncate fw-medium" style="max-width: 350px;" :title="error.message">
                          {{ error.message }}
                        </div>
                      </td>
                      <td class="text-center">
                        <span class="badge bg-red text-white fs-6">{{ error.count }}</span>
                      </td>
                      <td class="text-center">
                        <div class="text-muted small">
                          <Icon icon="tabler:clock" class="me-1" />
                          {{ formatTimestamp(error.lastOccurrence) }}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div class="col-md-4">
          <div class="card">
            <div class="card-header">
              <div class="row align-items-center">
                <div class="col-auto">
                  <span class="bg-yellow text-white avatar avatar-sm">
                    <Icon icon="tabler:bell" />
                  </span>
                </div>
                <div class="col">
                  <h3 class="card-title mb-1">System Alerts</h3>
                  <div class="text-muted">Active system notifications</div>
                </div>
              </div>
            </div>
            <div class="card-body p-0">
              <div v-if="!overview?.alerts?.length" class="empty p-4">
                <div class="empty-icon">
                  <Icon icon="tabler:check-circle" class="text-success" style="font-size: 2rem;" />
                </div>
                <p class="empty-title">No active alerts</p>
                <p class="empty-subtitle text-muted">All systems are operating normally</p>
              </div>
              <div v-else class="list-group list-group-flush">
                <div v-for="alert in overview?.alerts" :key="alert.timestamp" 
                  class="list-group-item d-flex align-items-center"
                  :class="getAlertClass(alert.level)">
                  <div class="me-3">
                    <Icon v-if="alert.level === 'critical'" icon="tabler:alert-circle" class="text-danger" />
                    <Icon v-else-if="alert.level === 'warning'" icon="tabler:alert-triangle" class="text-warning" />
                    <Icon v-else icon="tabler:info-circle" class="text-info" />
                  </div>
                  <div class="flex-fill">
                    <div class="fw-medium">{{ alert.type.replace('_', ' ').toUpperCase() }}</div>
                    <div class="text-muted small">{{ alert.message }}</div>
                  </div>
                  <div class="text-muted small text-end">
                    <Icon icon="tabler:clock" class="me-1" />
                    {{ formatTimestamp(alert.timestamp) }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Performance Metrics -->
      <div class="row row-deck row-cards">
        <div class="col-md-6">
          <div class="card">
            <div class="card-header">
              <div class="row align-items-center">
                <div class="col-auto">
                  <span class="bg-teal text-white avatar avatar-sm">
                    <Icon icon="tabler:database" />
                  </span>
                </div>
                <div class="col">
                  <h3 class="card-title mb-1">Database Status</h3>
                  <div class="text-muted">Database performance metrics</div>
                </div>
              </div>
            </div>
            <div class="card-body">
              <div class="row mb-3">
                <div class="col-6">
                  <div class="d-flex align-items-center mb-2">
                    <Icon icon="tabler:heart-handshake" class="me-2 text-teal" />
                    <div class="text-muted small">Status</div>
                  </div>
                  <div class="badge fs-6" :class="getServiceStatusBadge(overview?.database?.status)">
                    {{ overview?.database?.status || 'Unknown' }}
                  </div>
                </div>
                <div class="col-6">
                  <div class="d-flex align-items-center mb-2">
                    <Icon icon="tabler:search" class="me-2 text-blue" />
                    <div class="text-muted small">Total Queries</div>
                  </div>
                  <div class="h3 mb-0 text-blue">{{ (overview?.database?.total_queries || 0).toLocaleString() }}</div>
                </div>
              </div>
              <div class="row">
                <div class="col-6">
                  <div class="d-flex align-items-center mb-2">
                    <Icon icon="tabler:exclamation-circle" class="me-2 text-red" />
                    <div class="text-muted small">Query Errors</div>
                  </div>
                  <div class="h3 mb-0 text-red">{{ overview?.database?.query_errors || 0 }}</div>
                </div>
                <div class="col-6">
                  <div class="d-flex align-items-center mb-2">
                    <Icon icon="tabler:clock-pause" class="me-2 text-orange" />
                    <div class="text-muted small">Slow Queries</div>
                  </div>
                  <div class="h3 mb-0 text-orange">{{ overview?.database?.slow_queries || 0 }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-md-6">
          <div class="card">
            <div class="card-header">
              <div class="row align-items-center">
                <div class="col-auto">
                  <span class="bg-purple text-white avatar avatar-sm">
                    <Icon icon="tabler:brand-redis" />
                  </span>
                </div>
                <div class="col">
                  <h3 class="card-title mb-1">Cache Status</h3>
                  <div class="text-muted">Redis cache performance</div>
                </div>
              </div>
            </div>
            <div class="card-body">
              <div class="row mb-3">
                <div class="col-6">
                  <div class="d-flex align-items-center mb-2">
                    <Icon icon="tabler:heart-handshake" class="me-2 text-purple" />
                    <div class="text-muted small">Status</div>
                  </div>
                  <div class="badge fs-6" :class="getServiceStatusBadge(overview?.cache?.status)">
                    {{ overview?.cache?.status || 'Unknown' }}
                  </div>
                </div>
                <div class="col-6">
                  <div class="d-flex align-items-center mb-2">
                    <Icon icon="tabler:target" class="me-2 text-green" />
                    <div class="text-muted small">Hit Rate</div>
                  </div>
                  <div class="h3 mb-0 text-green">{{ overview?.cache?.hit_rate || 0 }}<small class="text-muted">%</small></div>
                </div>
              </div>
              <div class="row">
                <div class="col-6">
                  <div class="d-flex align-items-center mb-2">
                    <Icon icon="tabler:check" class="me-2 text-teal" />
                    <div class="text-muted small">Hits</div>
                  </div>
                  <div class="h3 mb-0 text-teal">{{ (overview?.cache?.hits || 0).toLocaleString() }}</div>
                </div>
                <div class="col-6">
                  <div class="d-flex align-items-center mb-2">
                    <Icon icon="tabler:x" class="me-2 text-red" />
                    <div class="text-muted small">Misses</div>
                  </div>
                  <div class="h3 mb-0 text-red">{{ (overview?.cache?.misses || 0).toLocaleString() }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import DefaultLayout from '@/layouts/DefaultLayout.vue';
import { ref, onMounted, computed } from 'vue'
import { Icon } from '@iconify/vue'
import api from '@/api/axios'

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

const overview = ref<SystemOverview | null>(null)
const selectedTimeRange = ref('last_hour')
const isLoading = ref(false)
const error = ref('')

const systemStatusBadgeClass = computed(() => {
  const status = overview.value?.system?.status
  return {
    'bg-success': status === 'healthy',
    'bg-warning': status === 'degraded',
    'bg-danger': status === 'unhealthy',
    'bg-secondary': !status
  }
})

const getResourceBarClass = (percentage: number | undefined) => {
  if (!percentage || isNaN(percentage)) return 'bg-secondary'
  if (percentage >= 90) return 'bg-danger'
  if (percentage >= 70) return 'bg-warning'
  if (percentage >= 50) return 'bg-info'
  return 'bg-success'
}

const getAlertClass = (level: string) => {
  return {
    'list-group-item-danger': level === 'critical',
    'list-group-item-warning': level === 'warning',
    'list-group-item-info': level === 'info'
  }
}

const getServiceStatusBadge = (status: string | undefined) => {
  return {
    'bg-success text-white': status === 'healthy',
    'bg-warning text-white': status === 'degraded',
    'bg-danger text-white': status === 'error' || status === 'unhealthy',
    'bg-secondary text-white': !status
  }
}

const formatUptime = (uptime: number | undefined) => {
  if (!uptime || isNaN(uptime)) return 'N/A'

  const days = Math.floor(uptime / 86400)
  const hours = Math.floor((uptime % 86400) / 3600)
  const minutes = Math.floor((uptime % 3600) / 60)

  if (days > 0) return `${days}d ${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

const formatTimestamp = (timestamp: number | undefined) => {
  if (!timestamp || isNaN(timestamp)) return 'N/A'
  return new Date(timestamp).toLocaleString()
}

const refreshData = async () => {
  if (isLoading.value) return

  isLoading.value = true
  error.value = ''

  try {
    const response = await api.get('/dashboard/overview')
    overview.value = response.data
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Failed to load dashboard data'
    console.error('Dashboard error:', err)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  refreshData()

  // Auto-refresh every 30 seconds
  setInterval(refreshData, 30000)
})
</script>

<style scoped>
/* Scrollable container */
.container-fluid.overflow-scroll {
  max-height: calc(100vh - 2rem);
  overflow-y: auto;
  overflow-x: hidden;
  padding-bottom: 2rem;
}

/* Sticky header */
.page-header {
  position: sticky;
  top: 0;
  background-color: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  z-index: 100;
  margin-bottom: 1rem;
  padding: 1rem 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

/* Enhanced progress bars */
.progress {
  height: 10px;
  border-radius: 8px;
  background-color: rgba(0, 0, 0, 0.05);
}

.progress-sm {
  height: 8px;
  border-radius: 6px;
}

.progress-bar {
  border-radius: 6px;
  transition: width 0.3s ease;
}

/* Badge enhancements */
.badge {
  font-weight: 600;
  letter-spacing: 0.025em;
  padding: 0.375rem 0.625rem;
}

.badge.fs-6 {
  font-size: 0.875rem !important;
}

/* Avatar enhancements */
.avatar {
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.1);
}

.avatar-sm {
  width: 2rem;
  height: 2rem;
  font-size: 1rem;
}

/* Card enhancements */
.card {
  border-radius: 12px;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  transition: box-shadow 0.15s ease-in-out;
}

.card:hover {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.card-header {
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  background-color: rgba(255, 255, 255, 0.5);
}

.card-sm {
  transition: transform 0.2s ease;
}

.card-sm:hover {
  transform: translateY(-1px);
}

/* Table enhancements */
.table-hover tbody tr:hover {
  background-color: rgba(0, 0, 0, 0.02);
}

.card-table td {
  padding: 1rem 0.75rem;
  vertical-align: middle;
}

.card-table thead th {
  font-weight: 600;
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 0.05em;
  color: #6c757d;
  border-bottom: 2px solid rgba(0, 0, 0, 0.1);
}

/* List group enhancements */
.list-group-item {
  border: none;
  padding: 1rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  transition: background-color 0.15s ease;
}

.list-group-item:hover {
  background-color: rgba(0, 0, 0, 0.02);
}

.list-group-item:last-child {
  border-bottom: none;
}

/* Empty state */
.empty {
  text-align: center;
}

.empty-icon {
  margin-bottom: 1rem;
}

.empty-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.empty-subtitle {
  font-size: 0.875rem;
}

/* Text truncation */
.text-truncate {
  max-width: 350px;
}

/* Card spacing for better scroll */
.row.row-deck.row-cards {
  margin-bottom: 1.5rem;
}

/* Table scrolling within cards */
.table-responsive {
  max-height: 400px;
  overflow-y: auto;
  border-radius: 8px;
}

/* Smooth scrolling */
.container-fluid.overflow-scroll {
  scroll-behavior: smooth;
}

/* Color utilities */
.text-blue { color: #0054a6 !important; }
.bg-blue-lt { background-color: rgba(0, 84, 166, 0.1) !important; color: #0054a6 !important; }
.text-green { color: #2fb344 !important; }
.bg-green-lt { background-color: rgba(47, 179, 68, 0.1) !important; color: #2fb344 !important; }
.text-red { color: #d63939 !important; }
.bg-red-lt { background-color: rgba(214, 57, 57, 0.1) !important; color: #d63939 !important; }
.text-orange { color: #f59f00 !important; }
.text-purple { color: #ae3ec9 !important; }
.text-teal { color: #0ca678 !important; }

/* Animation enhancements */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.card {
  animation: fadeInUp 0.3s ease-out;
}

/* Media queries for responsiveness */
@media (max-width: 768px) {
  .container-fluid.overflow-scroll {
    max-height: calc(100vh - 1rem);
    padding-bottom: 1rem;
  }
  
  .page-header {
    padding: 0.5rem 0;
  }
  
  .card-header .row {
    flex-direction: column;
    align-items: flex-start !important;
  }
  
  .card-header .col-auto {
    margin-bottom: 0.5rem;
  }
}
</style>