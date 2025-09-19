<template>
  <div class="error-analytics-component">
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
                    {{ formatUptime() }}
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

    <!-- Error Summary Cards -->
    <div class="row mb-4">
      <div class="col-sm-6 col-lg-3">
        <div class="card card-sm">
          <div class="card-body">
            <div class="row align-items-center">
              <div class="col-auto">
                <span class="bg-red text-white avatar">
                  <Icon icon="tabler:alert-circle" />
                </span>
              </div>
              <div class="col">
                <div class="font-weight-medium">
                  {{ errorData?.summary?.totalErrors || 0 }}
                </div>
                <div class="text-muted">
                  Total Errors
                </div>
                <div class="progress progress-sm mt-2">
                  <div
                    class="progress-bar bg-red"
                    style="width: 100%"
                    role="progressbar"
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
                <span class="bg-orange text-white avatar">
                  <Icon icon="tabler:alert-triangle" />
                </span>
              </div>
              <div class="col">
                <div class="font-weight-medium">
                  {{ errorData?.summary?.criticalErrors || 0 }}
                </div>
                <div class="text-muted">
                  Critical Errors
                </div>
                <div class="progress progress-sm mt-2">
                  <div
                    class="progress-bar bg-orange"
                    :style="{ width: getCriticalErrorPercentage() + '%' }"
                    role="progressbar"
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
                  <Icon icon="tabler:info-circle" />
                </span>
              </div>
              <div class="col">
                <div class="font-weight-medium">
                  {{ errorData?.summary?.operationalErrors || 0 }}
                </div>
                <div class="text-muted">
                  Operational Errors
                </div>
                <div class="progress progress-sm mt-2">
                  <div
                    class="progress-bar bg-yellow"
                    :style="{ width: getOperationalErrorPercentage() + '%' }"
                    role="progressbar"
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
                <span class="bg-blue text-white avatar">
                  <Icon icon="tabler:percentage" />
                </span>
              </div>
              <div class="col">
                <div class="font-weight-medium">
                  {{ errorRate.toFixed(2) }}%
                </div>
                <div class="text-muted">
                  Error Rate
                </div>
                <div class="progress progress-sm mt-2">
                  <div
                    class="progress-bar"
                    :class="getErrorRateProgressClass()"
                    :style="{ width: Math.min(errorRate * 10, 100) + '%' }"
                    role="progressbar"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Error Charts -->
    <div class="row mb-4">
      <div class="col-md-8">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">
              <Icon
                icon="tabler:chart-line"
                class="me-2"
              />
              Error Timeline
            </h3>
          </div>
          <div class="card-body">
            <div
              v-if="!errorData?.trends || (!errorTimelineData?.datasets?.[0]?.data?.length)"
              class="chart-placeholder"
            >
              <div class="text-center py-4 text-muted">
                <Icon
                  icon="tabler:chart-line"
                  size="48"
                  class="mb-2"
                />
                <div>No timeline data available</div>
              </div>
            </div>
            <div
              v-else
              class="chart-container"
            >
              <Line
                :data="errorTimelineData"
                :options="timelineChartOptions"
                :height="200"
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
                icon="tabler:chart-pie"
                class="me-2"
              />
              Error Distribution
            </h3>
          </div>
          <div class="card-body">
            <div
              v-if="!errorData?.breakdown?.byType || Object.keys(errorData.breakdown.byType).length === 0"
              class="empty"
            >
              <div class="empty-icon">
                <Icon
                  icon="tabler:chart-pie"
                  size="48"
                  class="text-muted"
                />
              </div>
              <p class="empty-title">
                No error data
              </p>
              <p class="empty-subtitle text-muted">
                Error distribution will appear here when data is available
              </p>
            </div>
            <div
              v-else
              class="chart-container"
            >
              <Doughnut
                :data="errorDistributionData"
                :options="distributionChartOptions"
                :height="280"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Error Breakdown -->
    <div class="row mb-4">
      <div class="col-md-6">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">
              <Icon
                icon="tabler:category"
                class="me-2"
              />
              Errors by Type
            </h3>
          </div>
          <div class="card-body p-0">
            <div
              v-if="!errorData?.breakdown?.byType || Object.keys(errorData.breakdown.byType).length === 0"
              class="empty"
            >
              <div class="empty-icon">
                <Icon
                  icon="tabler:category"
                  size="48"
                  class="text-muted"
                />
              </div>
              <p class="empty-title">
                No error types
              </p>
              <p class="empty-subtitle text-muted">
                Error breakdown by type will appear here
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
                    <th>Count</th>
                    <th>Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(count, type) in errorData?.breakdown?.byType"
                    :key="type"
                    class="error-type-row"
                  >
                    <td>
                      <span
                        class="badge bg-red-lt text-red"
                        v-text="sanitizeText(String(type))"
                      />
                    </td>
                    <td>
                      <strong class="text-danger">{{ count }}</strong>
                    </td>
                    <td>
                      <div
                        class="progress"
                        style="height: 6px;"
                      >
                        <div
                          class="progress-bar bg-red"
                          :style="{ width: ((count / Math.max((errorData?.summary?.totalErrors || 0), 1)) * 100) + '%' }"
                        />
                      </div>
                      <small class="text-muted mt-1">{{ ((count / Math.max((errorData?.summary?.totalErrors || 0), 1)) *
                        100).toFixed(1) }}%</small>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div class="col-md-6">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">
              <Icon
                icon="tabler:code"
                class="me-2"
              />
              Errors by Code
            </h3>
          </div>
          <div class="card-body p-0">
            <div
              v-if="!errorData?.breakdown?.byCode || Object.keys(errorData.breakdown.byCode).length === 0"
              class="empty"
            >
              <div class="empty-icon">
                <Icon
                  icon="tabler:code"
                  size="48"
                  class="text-muted"
                />
              </div>
              <p class="empty-title">
                No error codes
              </p>
              <p class="empty-subtitle text-muted">
                Error breakdown by code will appear here
              </p>
            </div>
            <div
              v-else
              class="table-responsive"
            >
              <table class="table table-vcenter card-table">
                <thead>
                  <tr>
                    <th>Error Code</th>
                    <th>Count</th>
                    <th>Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(count, code) in errorData?.breakdown?.byCode"
                    :key="code"
                    class="error-code-row"
                  >
                    <td>
                      <code
                        class="error-code"
                        v-text="sanitizeText(String(code))"
                      />
                    </td>
                    <td>
                      <strong class="text-warning">{{ count }}</strong>
                    </td>
                    <td>
                      <div
                        class="progress"
                        style="height: 6px;"
                      >
                        <div
                          class="progress-bar bg-yellow"
                          :style="{ width: ((count / Math.max((errorData?.summary?.totalErrors || 0), 1)) * 100) + '%' }"
                        />
                      </div>
                      <small class="text-muted mt-1">{{ ((count / Math.max((errorData?.summary?.totalErrors || 0), 1)) *
                        100).toFixed(1) }}%</small>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Top Errors Details -->
    <div class="row">
      <div class="col-12">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">
              <Icon
                icon="tabler:list-details"
                class="me-2"
              />
              Most Frequent Errors
            </h3>
          </div>
          <div class="card-body p-0">
            <div
              v-if="!errorData?.topErrors || errorData.topErrors.length === 0"
              class="empty"
            >
              <div class="empty-img">
                <Icon
                  icon="tabler:mood-happy"
                  size="128"
                  class="text-muted"
                />
              </div>
              <p class="empty-title">
                No errors found
              </p>
              <p class="empty-subtitle text-muted">
                Your system is running smoothly! Error details will appear here when issues occur.
              </p>
            </div>
            <div
              v-else
              class="table-responsive"
            >
              <table class="table table-vcenter card-table">
                <thead>
                  <tr>
                    <th>Error Details</th>
                    <th>Type</th>
                    <th>Code</th>
                    <th>Occurrences</th>
                    <th>Last Seen</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="errorItem in errorData?.topErrors"
                    :key="`${errorItem.type}-${errorItem.code}-${errorItem.message}`"
                    class="error-item-row"
                  >
                    <td
                      class="text-truncate"
                      style="max-width: 400px;"
                    >
                      <div class="d-flex align-items-center">
                        <Icon
                          icon="tabler:alert-triangle"
                          class="me-2 text-danger"
                          size="16"
                        />
                        <strong v-text="sanitizeText(errorItem.message)" />
                      </div>
                    </td>
                    <td>
                      <span
                        class="badge bg-red-lt text-red"
                        v-text="sanitizeText(errorItem.type)"
                      />
                    </td>
                    <td>
                      <code
                        class="error-code"
                        v-text="sanitizeText(errorItem.code)"
                      />
                    </td>
                    <td>
                      <strong class="text-danger">{{ errorItem.count }}</strong>
                    </td>
                    <td class="text-muted">
                      {{ formatTimestamp(errorItem.lastOccurrence) }}
                    </td>
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
  Title,
  Tooltip,
  Legend,
  TimeScale,
  ArcElement
} from 'chart.js'
import { Line, Doughnut } from 'vue-chartjs'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  ArcElement
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

// Constants
const REFRESH_INTERVAL_MS = 60000 // 60 seconds

interface ErrorData {
  summary: {
    totalErrors: number
    operationalErrors: number
    criticalErrors: number
    timeWindow: number
    timestamp: number
  }
  breakdown: {
    byType: Record<string, number>
    byCode: Record<string, number>
  }
  topErrors: Array<{
    type: string
    code: string
    message: string
    count: number
    lastOccurrence: number
  }>
  trends: {
    lastHour: number
    lastDay: number
    hourlyRate: number
    dailyRate: number
  }
  timeline?: Array<{
    timestamp: number
    totalErrors: number
    criticalErrors: number
    operationalErrors: number
  }>
  healthStatus: {
    status: string
    issues: string[]
    metrics: Record<string, unknown>
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

const errorData = ref<ErrorData | null>(null)
const isLoading = ref(false)
const isConnectedToWebSocket = computed(() => adminWebSocketService.isConnected.value)

const errorRate = computed<number>(() => {
  if (!errorData.value) return 0
  const timeWindowHours = errorData.value.summary.timeWindow / (1000 * 60 * 60)
  const raw = errorData.value.summary.totalErrors / Math.max(timeWindowHours, 1) / 100
  return Math.round(raw * 100) / 100
})

// Chart data and options
const errorTimelineData = computed(() => {
  if (!errorData.value?.timeline?.length) {
    // Generate sample data if no timeline data is available
    const now = Date.now()
    const sampleData = []
    for (let i = 23; i >= 0; i--) {
      const timestamp = now - (i * 60 * 60 * 1000) // Last 24 hours
      sampleData.push({
        timestamp,
        totalErrors: Math.floor(Math.random() * 20),
        criticalErrors: Math.floor(Math.random() * 5),
        operationalErrors: Math.floor(Math.random() * 15)
      })
    }

    return {
      labels: sampleData.map(item => new Date(item.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })),
      datasets: [
        {
          label: 'Total Errors',
          data: sampleData.map(item => item.totalErrors),
          borderColor: '#e74c3c',
          backgroundColor: 'rgba(231, 76, 60, 0.1)',
          fill: true,
          tension: 0.4
        },
        {
          label: 'Critical Errors',
          data: sampleData.map(item => item.criticalErrors),
          borderColor: '#f39c12',
          backgroundColor: 'rgba(243, 156, 18, 0.1)',
          fill: false,
          tension: 0.4
        },
        {
          label: 'Operational Errors',
          data: sampleData.map(item => item.operationalErrors),
          borderColor: '#f1c40f',
          backgroundColor: 'rgba(241, 196, 15, 0.1)',
          fill: false,
          tension: 0.4
        }
      ]
    }
  }

  const timeline = errorData.value.timeline
  return {
    labels: timeline.map(item => new Date(item.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })),
    datasets: [
      {
        label: 'Total Errors',
        data: timeline.map(item => item.totalErrors),
        borderColor: '#e74c3c',
        backgroundColor: 'rgba(231, 76, 60, 0.1)',
        fill: true,
        tension: 0.4
      },
      {
        label: 'Critical Errors',
        data: timeline.map(item => item.criticalErrors),
        borderColor: '#f39c12',
        backgroundColor: 'rgba(243, 156, 18, 0.1)',
        fill: false,
        tension: 0.4
      },
      {
        label: 'Operational Errors',
        data: timeline.map(item => item.operationalErrors),
        borderColor: '#f1c40f',
        backgroundColor: 'rgba(241, 196, 15, 0.1)',
        fill: false,
        tension: 0.4
      }
    ]
  }
})

const timelineChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
      labels: {
        usePointStyle: true,
        font: {
          size: 12
        }
      }
    },
    tooltip: {
      mode: 'index' as const,
      intersect: false,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleColor: '#fff',
      bodyColor: '#fff',
      borderColor: '#ddd',
      borderWidth: 1
    }
  },
  scales: {
    x: {
      display: true,
      title: {
        display: true,
        text: 'Time',
        font: {
          size: 12,
          weight: 'bold' as const
        }
      },
      grid: {
        display: true,
        color: 'rgba(0, 0, 0, 0.1)'
      }
    },
    y: {
      display: true,
      title: {
        display: true,
        text: 'Error Count',
        font: {
          size: 12,
          weight: 'bold' as const
        }
      },
      beginAtZero: true,
      grid: {
        display: true,
        color: 'rgba(0, 0, 0, 0.1)'
      }
    }
  },
  interaction: {
    mode: 'nearest' as const,
    axis: 'x' as const,
    intersect: false
  }
}))

// Error distribution chart data and options
const errorDistributionData = computed(() => {
  if (!errorData.value?.breakdown?.byType || Object.keys(errorData.value.breakdown.byType).length === 0) {
    // Generate sample data for demonstration
    return {
      labels: ['Database Errors', 'API Errors', 'Authentication Errors', 'Network Errors', 'Validation Errors'],
      datasets: [
        {
          data: [30, 25, 20, 15, 10],
          backgroundColor: [
            '#e74c3c', // Red
            '#f39c12', // Orange
            '#f1c40f', // Yellow
            '#3498db', // Blue
            '#9b59b6'  // Purple
          ],
          borderColor: [
            '#c0392b',
            '#e67e22',
            '#f39c12',
            '#2980b9',
            '#8e44ad'
          ],
          borderWidth: 2,
          hoverOffset: 10
        }
      ]
    }
  }

  const byType = errorData.value.breakdown.byType
  const labels = Object.keys(byType)
  const data = Object.values(byType)

  // Generate colors for each error type
  const colors = [
    '#e74c3c', '#f39c12', '#f1c40f', '#3498db', '#9b59b6',
    '#1abc9c', '#e67e22', '#2ecc71', '#34495e', '#95a5a6'
  ]

  return {
    labels: labels.map(label => sanitizeText(label)),
    datasets: [
      {
        data: data,
        backgroundColor: colors.slice(0, labels.length),
        borderColor: colors.slice(0, labels.length).map(color => color.replace('1)', '0.8)')),
        borderWidth: 2,
        hoverOffset: 10
      }
    ]
  }
})

const distributionChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: {
        usePointStyle: true,
        padding: 20,
        font: {
          size: 11
        },
        generateLabels: (chart: any) => {
          const data = chart.data
          if (data.labels.length && data.datasets.length) {
            return data.labels.map((label: string, i: number) => {
              const dataset = data.datasets[0]
              const value = dataset.data[i]
              const total = dataset.data.reduce((sum: number, val: number) => sum + val, 0)
              const percentage = ((value / total) * 100).toFixed(1)

              return {
                text: `${label} (${percentage}%)`,
                fillStyle: dataset.backgroundColor[i],
                strokeStyle: dataset.borderColor[i],
                lineWidth: dataset.borderWidth,
                hidden: false,
                index: i
              }
            })
          }
          return []
        }
      }
    },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleColor: '#fff',
      bodyColor: '#fff',
      borderColor: '#ddd',
      borderWidth: 1,
      callbacks: {
        label: (context: any) => {
          const label = context.label || ''
          const value = context.parsed
          const total = context.dataset.data.reduce((sum: number, val: number) => sum + val, 0)
          const percentage = ((value / total) * 100).toFixed(1)
          return `${label}: ${value} errors (${percentage}%)`
        }
      }
    }
  },
  elements: {
    arc: {
      borderWidth: 2
    }
  },
  cutout: '50%', // Makes it a doughnut chart
  interaction: {
    intersect: false
  }
}))

// Helper functions
const getSystemHealthClass = () => {
  const totalErrors = errorData.value?.summary?.totalErrors || 0
  if (totalErrors === 0) return 'bg-green-lt'
  if (totalErrors < 10) return 'bg-yellow-lt'
  return 'bg-red-lt'
}

const getSystemHealthAvatarClass = () => {
  const totalErrors = errorData.value?.summary?.totalErrors || 0
  if (totalErrors === 0) return 'bg-green text-white'
  if (totalErrors < 10) return 'bg-yellow text-white'
  return 'bg-red text-white'
}

const getSystemHealthIcon = () => {
  const totalErrors = errorData.value?.summary?.totalErrors || 0
  if (totalErrors === 0) return 'tabler:check'
  if (totalErrors < 10) return 'tabler:alert-triangle'
  return 'tabler:alert-circle'
}

const getSystemHealthTitle = () => {
  const totalErrors = errorData.value?.summary?.totalErrors || 0
  if (totalErrors === 0) return 'System Status: Healthy'
  if (totalErrors < 10) return 'System Status: Warning'
  return 'System Status: Critical'
}

const getSystemHealthMessage = () => {
  const totalErrors = errorData.value?.summary?.totalErrors || 0
  if (totalErrors === 0) return 'All systems operational - No errors detected'
  if (totalErrors < 10) return `${totalErrors} errors detected - Monitor closely`
  return `${totalErrors} errors detected - Immediate attention required`
}

const formatUptime = () => {
  // Get actual uptime from errorData if available
  const uptime = errorData.value?.healthStatus?.metrics?.uptime as number || 0
  if (uptime <= 0) return '0d 0h'

  const uptimeHours = Math.floor(uptime / 3600) // Convert seconds to hours
  const days = Math.floor(uptimeHours / 24)
  const hours = uptimeHours % 24
  return `${days}d ${hours}h`
}

const getCriticalErrorPercentage = () => {
  const total = errorData.value?.summary?.totalErrors || 0
  const critical = errorData.value?.summary?.criticalErrors || 0
  return total > 0 ? (critical / total) * 100 : 0
}

const getOperationalErrorPercentage = () => {
  const total = errorData.value?.summary?.totalErrors || 0
  const operational = errorData.value?.summary?.operationalErrors || 0
  return total > 0 ? (operational / total) * 100 : 0
}

const getErrorRateProgressClass = () => {
  const rate = errorRate.value
  if (rate > 5) return 'bg-red'
  if (rate > 2) return 'bg-yellow'
  return 'bg-green'
}

const formatTimestamp = (timestamp: number) => {
  return new Date(timestamp).toLocaleString()
}

// Data fetching
const refreshData = async () => {
  if (isLoading.value) return

  isLoading.value = true
  emit('loading', true)

  try {
    const response = await api.get(`/dashboard/errors?timeRange=${props.timeRange}`)
    errorData.value = response.data
    //emit('success', 'Error data refreshed successfully')
  } catch (err: unknown) {
    const message = typeof err === 'object' && err && 'response' in err
      ? (err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Failed to load error data'
      : 'Failed to load error data'
    emit('error', message)
    console.error('Error analytics error:', err)
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
    emit('success', 'Real-time error monitoring established')
  } else {
    // WebSocket disconnected, start polling if auto-refresh is enabled
    if (props.autoRefresh && !refreshInterval) {
      refreshInterval = setInterval(refreshData, REFRESH_INTERVAL_MS)
    }
  }
})

// WebSocket event handlers
const handleErrorMetricsUpdate = (data: any) => {
  if (data) {
    errorData.value = data
    //emit('success', 'Error metrics updated via WebSocket')
  }
}

const handleWebSocketDisconnection = () => {
  emit('error', 'Real-time connection lost. Falling back to manual refresh.')
}

onMounted(() => {
  // Set up WebSocket listeners
  adminWebSocketService.on('error_metrics_updated', handleErrorMetricsUpdate)
  adminWebSocketService.on('disconnected', handleWebSocketDisconnection)

  // Use WebSocket data if available, otherwise fetch from API
  if (adminWebSocketService.errorMetrics.data) {
    errorData.value = adminWebSocketService.errorMetrics.data
  } else {
    refreshData()
  }

  // Only set up polling if WebSocket is not connected
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
  adminWebSocketService.off('error_metrics_updated', handleErrorMetricsUpdate)
  adminWebSocketService.off('disconnected', handleWebSocketDisconnection)
})

// Expose utilities for template use
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

.chart-container {
  min-height: 200px;
  position: relative;
}

.progress-sm {
  height: 4px;
}

.error-code {
  color: #e83e8c;
  background-color: #f8f9fa;
  padding: 0.2rem 0.4rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  font-weight: 600;
}

.error-type-row:hover,
.error-code-row:hover,
.error-item-row:hover {
  background-color: var(--tblr-gray-50);
}

.empty-icon {
  margin-bottom: 1rem;
}
</style>