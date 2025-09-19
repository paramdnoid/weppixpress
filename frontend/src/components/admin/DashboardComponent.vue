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
        <div class="card bg-body rounded-2 border-1 card-sm">
          <div class="card-body">
            <div class="row align-items-center">
              <div class="col-auto">
                <span class="bg-blue text-white avatar">
                  <Icon icon="tabler:device-imac-cog" />
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
                    :class="getSystemStatusProgressClass()"
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
        <div class="card bg-body rounded-2 border-1 card-sm">
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
        <div class="card bg-body rounded-2 border-1 card-sm">
          <div class="card-body">
            <div class="row align-items-center">
              <div class="col-auto">
                <span class="bg-green text-white avatar">
                  <Icon icon="tabler:server" />
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
        <div class="card bg-body rounded-2 border-1 card-sm">
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
            <div class="chart-container" style="height: 300px;">
              <Line
                :data="performanceData"
                :options="chartOptions"
              />
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">
              <Icon
                icon="tabler:chart-donut"
                class="me-2"
              />
              System Health
            </h3>
          </div>
          <div class="card-body text-center">
            <div class="chart-container" style="height: 200px;">
              <Doughnut
                :data="systemHealthData"
                :options="donutChartOptions"
              />
            </div>
            <div class="row mt-3">
              <div class="col-6">
                <div class="text-center">
                  <div class="h4 mb-1" :class="getSystemHealthPercentageClass()">
                    {{ getSystemHealthPercentage() }}%
                  </div>
                  <div class="text-muted small">
                    System Health
                  </div>
                </div>
              </div>
              <div class="col-6">
                <div class="text-center">
                  <div class="h4 text-blue mb-1">
                    {{ overview?.requests?.total || 0 }}
                  </div>
                  <div class="text-muted small">
                    Total Requests
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
import adminWebSocketService from '@/services/adminWebSocketService'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { Line, Doughnut } from 'vue-chartjs'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

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
const isConnectedToWebSocket = computed(() => adminWebSocketService.isConnected.value)

// Performance chart data with beautiful gradients
const performanceData = ref({
  labels: [] as string[],
  datasets: [
    {
      label: 'CPU Usage (%)',
      data: [] as number[],
      borderColor: '#ff6b6b',
      backgroundColor: 'rgba(255, 107, 107, 0.15)',
      fill: true,
      tension: 0.4,
      pointBackgroundColor: '#ff6b6b',
      pointBorderColor: '#ffffff',
      pointHoverBackgroundColor: '#ffffff',
      pointHoverBorderColor: '#ff6b6b',
      pointBorderWidth: 2,
      pointHoverBorderWidth: 3,
      pointRadius: 4,
      pointHoverRadius: 6,
      borderWidth: 3
    },
    {
      label: 'Memory Usage (%)',
      data: [] as number[],
      borderColor: '#4ecdc4',
      backgroundColor: 'rgba(78, 205, 196, 0.15)',
      fill: true,
      tension: 0.4,
      pointBackgroundColor: '#4ecdc4',
      pointBorderColor: '#ffffff',
      pointHoverBackgroundColor: '#ffffff',
      pointHoverBorderColor: '#4ecdc4',
      pointBorderWidth: 2,
      pointHoverBorderWidth: 3,
      pointRadius: 4,
      pointHoverRadius: 6,
      borderWidth: 3
    }
  ]
})

// System Health Donut Chart Data
const systemHealthData = computed(() => {
  const status = overview.value?.system?.status
  const errorCount = overview.value?.errors?.total || 0

  let healthyPercentage = 85
  let warningPercentage = 10
  let criticalPercentage = 5

  if (status === 'critical' || errorCount > 50) {
    criticalPercentage = 60
    warningPercentage = 25
    healthyPercentage = 15
  } else if (status === 'warning' || errorCount > 10) {
    warningPercentage = 40
    criticalPercentage = 15
    healthyPercentage = 45
  } else {
    healthyPercentage = 85
    warningPercentage = 10
    criticalPercentage = 5
  }

  return {
    labels: ['Healthy', 'Warning', 'Critical'],
    datasets: [
      {
        data: [healthyPercentage, warningPercentage, criticalPercentage],
        backgroundColor: [
          '#4ecdc4',
          '#ffd93d',
          '#ff6b6b'
        ],
        borderColor: [
          '#ffffff',
          '#ffffff',
          '#ffffff'
        ],
        borderWidth: 3,
        hoverBorderWidth: 4,
        hoverBackgroundColor: [
          '#45b7aa',
          '#f5c842',
          '#e85a5a'
        ],
        cutout: '70%'
      }
    ]
  }
})

const donutChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: {
        usePointStyle: true,
        pointStyle: 'circle',
        padding: 15,
        font: {
          size: 12,
          weight: 'normal' as const
        },
        color: '#6c757d'
      }
    },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleColor: '#ffffff',
      bodyColor: '#ffffff',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      borderWidth: 1,
      cornerRadius: 8,
      callbacks: {
        label: function(context: any) {
          const value = context.parsed
          const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0)
          const percentage = ((value / total) * 100).toFixed(1)
          return ` ${context.label}: ${percentage}%`
        }
      }
    }
  },
  animation: {
    animateRotate: true,
    animateScale: true,
    duration: 1200,
    easing: 'easeInOutQuart' as const
  },
  elements: {
    arc: {
      borderJoinStyle: 'round' as const
    }
  }
}

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: {
    duration: 1000,
    easing: 'easeInOutQuart' as const
  },
  plugins: {
    legend: {
      position: 'top' as const,
      labels: {
        usePointStyle: true,
        pointStyle: 'circle',
        padding: 20,
        font: {
          size: 12,
          weight: 'normal' as const
        },
        color: '#6c757d'
      }
    },
    title: {
      display: false
    },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleColor: '#ffffff',
      bodyColor: '#ffffff',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      borderWidth: 1,
      cornerRadius: 8,
      displayColors: true,
      callbacks: {
        label: function(context: any) {
          return ` ${context.dataset.label}: ${context.parsed.y}%`
        }
      }
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      max: 100,
      grid: {
        color: 'rgba(0, 0, 0, 0.05)',
        drawBorder: false
      },
      ticks: {
        callback: function(value: any) {
          return value + '%'
        },
        color: '#6c757d',
        font: {
          size: 11
        },
        padding: 10
      }
    },
    x: {
      grid: {
        display: false,
        drawBorder: false
      },
      ticks: {
        color: '#6c757d',
        font: {
          size: 11
        },
        maxTicksLimit: 8,
        padding: 10
      }
    }
  },
  interaction: {
    intersect: false,
    mode: 'index' as const
  },
  elements: {
    point: {
      radius: 4,
      hoverRadius: 6,
      borderWidth: 2,
      hoverBorderWidth: 3
    },
    line: {
      borderWidth: 3,
      tension: 0.4
    }
  }
}

// Helper functions
const getSystemStatusProgressClass = () => {
  const status = overview.value?.system?.status
  if (status === 'healthy') return 'bg-green'
  if (status === 'warning') return 'bg-yellow'
  return 'bg-red'
}

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

const getSystemHealthPercentage = () => {
  const status = overview.value?.system?.status
  const errorCount = overview.value?.errors?.total || 0

  if (status === 'critical' || errorCount > 50) {
    return 15
  } else if (status === 'warning' || errorCount > 10) {
    return 45
  } else {
    return 85
  }
}

const getSystemHealthPercentageClass = () => {
  const status = overview.value?.system?.status
  const errorCount = overview.value?.errors?.total || 0

  if (status === 'critical' || errorCount > 50) {
    return 'text-red'
  } else if (status === 'warning' || errorCount > 10) {
    return 'text-yellow'
  } else {
    return 'text-green'
  }
}

// Chart data management
const updateChartData = () => {
  if (!overview.value?.system) return

  const now = new Date().toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit'
  })

  const cpuUsage = parseInt(overview.value.system.cpu?.usage_percent || '0')
  const memoryUsage = parseInt(overview.value.system.memory?.usage_percent || '0')

  // Keep only last 20 data points
  const maxPoints = 20

  // Create new arrays to trigger reactivity
  const newLabels = [...performanceData.value.labels, now]
  const cpuDataset = performanceData.value.datasets[0]
  const memoryDataset = performanceData.value.datasets[1]

  if (!cpuDataset || !memoryDataset) return

  const newCpuData = [...cpuDataset.data, cpuUsage]
  const newMemoryData = [...memoryDataset.data, memoryUsage]

  // Keep only last maxPoints data points
  if (newLabels.length > maxPoints) {
    newLabels.splice(0, newLabels.length - maxPoints)
    newCpuData.splice(0, newCpuData.length - maxPoints)
    newMemoryData.splice(0, newMemoryData.length - maxPoints)
  }

  // Update the reactive data with explicit properties
  performanceData.value = {
    labels: newLabels,
    datasets: [
      {
        label: cpuDataset.label,
        data: newCpuData,
        borderColor: cpuDataset.borderColor,
        backgroundColor: cpuDataset.backgroundColor,
        fill: cpuDataset.fill,
        tension: cpuDataset.tension,
        pointBackgroundColor: cpuDataset.pointBackgroundColor,
        pointBorderColor: cpuDataset.pointBorderColor,
        pointHoverBackgroundColor: cpuDataset.pointHoverBackgroundColor,
        pointHoverBorderColor: cpuDataset.pointHoverBorderColor,
        pointBorderWidth: cpuDataset.pointBorderWidth,
        pointHoverBorderWidth: cpuDataset.pointHoverBorderWidth,
        pointRadius: cpuDataset.pointRadius,
        pointHoverRadius: cpuDataset.pointHoverRadius,
        borderWidth: cpuDataset.borderWidth
      },
      {
        label: memoryDataset.label,
        data: newMemoryData,
        borderColor: memoryDataset.borderColor,
        backgroundColor: memoryDataset.backgroundColor,
        fill: memoryDataset.fill,
        tension: memoryDataset.tension,
        pointBackgroundColor: memoryDataset.pointBackgroundColor,
        pointBorderColor: memoryDataset.pointBorderColor,
        pointHoverBackgroundColor: memoryDataset.pointHoverBackgroundColor,
        pointHoverBorderColor: memoryDataset.pointHoverBorderColor,
        pointBorderWidth: memoryDataset.pointBorderWidth,
        pointHoverBorderWidth: memoryDataset.pointHoverBorderWidth,
        pointRadius: memoryDataset.pointRadius,
        pointHoverRadius: memoryDataset.pointHoverRadius,
        borderWidth: memoryDataset.borderWidth
      }
    ]
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
    updateChartData()
    //emit('success', 'Dashboard data refreshed successfully')
  } catch (err: any) {
    emit('error', err.response?.data?.message || 'Failed to load dashboard data')
    console.error('Dashboard error:', err)
  } finally {
    isLoading.value = false
    emit('loading', false)
  }
}

// WebSocket event handlers
const handleWebSocketData = (data: any) => {
  if (data) {
    overview.value = data
    updateChartData()
    //emit('success', 'Dashboard data updated via WebSocket')
  }
}

const handleWebSocketDisconnection = () => {
  emit('error', 'Real-time connection lost. Falling back to manual refresh.')
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

  // Only use polling if WebSocket is not connected
  if (enabled && !isConnectedToWebSocket.value) {
    refreshInterval = setInterval(refreshData, REFRESH_INTERVAL_MS)
  }
})

// Watch WebSocket connection status
watch(isConnectedToWebSocket, (connected) => {
  if (connected) {
    // WebSocket connected, stop polling
    if (refreshInterval) {
      clearInterval(refreshInterval)
      refreshInterval = null
    }
    emit('success', 'Real-time connection established')
  } else {
    // WebSocket disconnected, start polling if auto-refresh is enabled
    if (props.autoRefresh && !refreshInterval) {
      refreshInterval = setInterval(refreshData, REFRESH_INTERVAL_MS)
    }
  }
})

onMounted(() => {
  // Set up WebSocket listeners
  adminWebSocketService.on('dashboard_updated', handleWebSocketData)
  adminWebSocketService.on('disconnected', handleWebSocketDisconnection)

  // Use WebSocket data if available, otherwise fetch from API
  if (adminWebSocketService.dashboardData.overview) {
    overview.value = adminWebSocketService.dashboardData.overview
    updateChartData()
  } else {
    refreshData()
  }

  // Only set up polling if WebSocket is not connected or auto-refresh is disabled
  if (props.autoRefresh && !isConnectedToWebSocket.value) {
    refreshInterval = setInterval(refreshData, REFRESH_INTERVAL_MS)
  }

  // Connect to WebSocket if not already connected
  if (!isConnectedToWebSocket.value) {
    adminWebSocketService.connect().catch(error => {
      console.warn('Failed to connect to WebSocket, using polling instead:', error)
      if (props.autoRefresh) {
        refreshInterval = setInterval(refreshData, REFRESH_INTERVAL_MS)
      }
    })
  }
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
  }

  // Remove WebSocket listeners
  adminWebSocketService.off('dashboard_updated', handleWebSocketData)
  adminWebSocketService.off('disconnected', handleWebSocketDisconnection)
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

.chart-container {
  position: relative;
  height: 300px;
  width: 100%;
  padding: 10px;
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

/* Enhanced chart styling */
.card-body .chart-container canvas {
  border-radius: 8px;
}

/* Smooth transitions for cards */
.card {
  transition: all 0.3s ease;
  border: 1px solid rgba(0, 0, 0, 0.05);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
}

.card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}

/* Beautiful gradient backgrounds for status cards */
.bg-blue-lt {
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
}

.bg-green-lt {
  background: linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%);
}

.bg-yellow-lt {
  background: linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%);
}

.bg-red-lt {
  background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%);
}
</style>