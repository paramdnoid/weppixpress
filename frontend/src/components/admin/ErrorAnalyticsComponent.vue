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
            <div class="chart-placeholder">
              <div class="text-center py-4 text-muted">
                <Icon
                  icon="tabler:chart-line"
                  size="48"
                  class="mb-2"
                />
                <div>Error timeline chart will be displayed here</div>
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
              class="chart-placeholder"
            >
              <div class="text-center py-4 text-muted">
                <Icon
                  icon="tabler:chart-pie"
                  size="48"
                  class="mb-2"
                />
                <div>Error distribution chart</div>
              </div>
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

const errorRate = computed<number>(() => {
  if (!errorData.value) return 0
  const timeWindowHours = errorData.value.summary.timeWindow / (1000 * 60 * 60)
  const raw = errorData.value.summary.totalErrors / Math.max(timeWindowHours, 1) / 100
  return Math.round(raw * 100) / 100
})

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
    emit('success', 'Error data refreshed successfully')
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