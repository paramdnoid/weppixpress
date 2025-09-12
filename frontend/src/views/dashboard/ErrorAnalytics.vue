<template>
  <div class="container-xl">
    <div class="page-header d-print-none">
      <div class="row align-items-center">
        <div class="col">
          <h2 class="page-title">
            Error Analytics
          </h2>
          <div class="text-muted mt-1">
            Detailed error analysis and trends
          </div>
        </div>
        <div class="col-auto ms-auto d-print-none">
          <div class="btn-list">
            <select
              v-model="selectedTimeRange"
              class="form-select"
              @change="refreshData"
            >
              <option value="last_minute">
                Last Minute
              </option>
              <option value="last_hour">
                Last Hour
              </option>
              <option value="last_day">
                Last Day
              </option>
            </select>
            <button
              class="btn btn-primary"
              :disabled="isLoading"
              @click="refreshData"
            >
              <Icon
                icon="tabler:refresh"
                class="me-1"
              />
              {{ isLoading ? 'Loading...' : 'Refresh' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="error"
      class="alert alert-danger"
    >
      {{ error }}
    </div>

    <!-- Error Summary Cards -->
    <div class="row row-deck row-cards mb-4">
      <div class="col-md-3">
        <MetricsCard
          title="Total Errors"
          :value="errorData?.summary?.totalErrors || 0"
          icon="tabler:alert-circle"
          :status="getErrorStatus(errorData?.summary?.totalErrors ?? 0)"
          :trend="calculateTrend('total')"
          subtitle="All error types"
        />
      </div>
      <div class="col-md-3">
        <MetricsCard
          title="Critical Errors"
          :value="errorData?.summary?.criticalErrors || 0"
          icon="tabler:alert-triangle"
          status="danger"
          :trend="calculateTrend('critical')"
          subtitle="System-level errors"
        />
      </div>
      <div class="col-md-3">
        <MetricsCard
          title="Operational Errors"
          :value="errorData?.summary?.operationalErrors || 0"
          icon="tabler:info-circle"
          status="warning"
          :trend="calculateTrend('operational')"
          subtitle="Handled errors"
        />
      </div>
      <div class="col-md-3">
        <MetricsCard
          title="Error Rate"
          :value="errorRate"
          format="percentage"
          icon="tabler:percentage"
          :status="getErrorRateStatus(errorRate)"
          subtitle="Errors per request"
        />
      </div>
    </div>

    <!-- Error Charts -->
    <div class="row row-deck row-cards mb-4">
      <div class="col-md-8">
        <ErrorChart
          title="Error Timeline"
          :data="timelineData"
          type="area"
          color="#dc3545"
        />
      </div>
      <div class="col-md-4">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">
              Error Distribution
            </h3>
          </div>
          <div class="card-body">
            <canvas
              ref="errorDistributionChart"
              width="300"
              height="200"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Error Breakdown -->
    <div class="row row-deck row-cards mb-4">
      <div class="col-md-6">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">
              Errors by Type
            </h3>
          </div>
          <div class="card-body p-0">
            <div class="table-responsive">
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
                  >
                    <td>
                      <span class="badge bg-danger">{{ type }}</span>
                    </td>
                    <td><strong>{{ count }}</strong></td>
                    <td>
                      <div
                        class="progress"
                        style="height: 4px;"
                      >
                        <div 
                          class="progress-bar bg-danger"
                          :style="{ width: ((count / Math.max((errorData?.summary?.totalErrors || 0), 1)) * 100) + '%' }"
                        />
                      </div>
                      <small class="text-muted">{{ ((count / Math.max((errorData?.summary?.totalErrors || 0), 1)) * 100).toFixed(1) }}%</small>
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
              Errors by Code
            </h3>
          </div>
          <div class="card-body p-0">
            <div class="table-responsive">
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
                  >
                    <td>
                      <code>{{ code }}</code>
                    </td>
                    <td><strong>{{ count }}</strong></td>
                    <td>
                      <div
                        class="progress"
                        style="height: 4px;"
                      >
                        <div 
                          class="progress-bar bg-warning"
                          :style="{ width: ((count / Math.max((errorData?.summary?.totalErrors || 0), 1)) * 100) + '%' }"
                        />
                      </div>
                      <small class="text-muted">{{ ((count / Math.max((errorData?.summary?.totalErrors || 0), 1)) * 100).toFixed(1) }}%</small>
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
    <div class="row row-deck row-cards">
      <div class="col-12">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">
              Most Frequent Errors
            </h3>
          </div>
          <div class="card-body p-0">
            <div class="table-responsive">
              <table class="table table-vcenter card-table">
                <thead>
                  <tr>
                    <th>Error Details</th>
                    <th>Type</th>
                    <th>Code</th>
                    <th>Occurrences</th>
                    <th>Last Seen</th>
                    <th>Frequency</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="error in errorData?.topErrors"
                    :key="`${error.type}-${error.code}-${error.message}`"
                  >
                    <td
                      class="text-truncate"
                      style="max-width: 400px;"
                    >
                      <strong>{{ error.message }}</strong>
                    </td>
                    <td>
                      <span class="badge bg-danger">{{ error.type }}</span>
                    </td>
                    <td>
                      <code>{{ error.code }}</code>
                    </td>
                    <td>
                      <strong class="text-danger">{{ error.count }}</strong>
                    </td>
                    <td class="text-muted">
                      {{ formatTimestamp(error.lastOccurrence) }}
                    </td>
                    <td>
                      <div
                        class="progress"
                        style="height: 6px;"
                      >
                        <div 
                          class="progress-bar bg-danger"
                          :style="{ width: ((error.count / Math.max((errorData?.topErrors?.[0]?.count || 0), 1)) * 100) + '%' }"
                        />
                      </div>
                      <small class="text-muted">
                        {{ ((error.count / Math.max((errorData?.summary?.totalErrors || 0), 1)) * 100).toFixed(1) }}% of total
                      </small>
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
import { ref, computed, onMounted, nextTick } from 'vue'
import { Icon } from '@iconify/vue'
import api from '@/api/axios'
import MetricsCard from '@/components/base/MetricsCard.vue'
import ErrorChart from '@/components/base/ErrorChart.vue'

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

const errorData = ref<ErrorData | null>(null)
const selectedTimeRange = ref('last_hour')
const isLoading = ref(false)
const error = ref('')
const errorDistributionChart = ref<HTMLCanvasElement>()

const errorRate = computed<number>(() => {
  if (!errorData.value) return 0
  // This would come from request metrics in a real implementation
  // For now, calculate a basic rate based on time window
  const timeWindowHours = errorData.value.summary.timeWindow / (1000 * 60 * 60)
  const raw = errorData.value.summary.totalErrors / Math.max(timeWindowHours, 1) / 100
  return Math.round(raw * 100) / 100
})

const timelineData = computed(() => {
  if (!errorData.value) return []
  
  // Generate sample timeline data based on trends
  const now = Date.now()
  const points = 20
  const interval = (selectedTimeRange.value === 'last_day' ? 3600000 : 
                   selectedTimeRange.value === 'last_hour' ? 180000 : 3000) // 1h, 3m, 3s intervals
  
  return Array.from({ length: points }, (_, i) => ({
    timestamp: now - (points - i - 1) * interval,
    value: Math.max(0, Math.round(Math.random() * 10 + (errorData.value?.summary.totalErrors || 0) / points))
  }))
})

const getErrorStatus = (count: number) => {
  if (count > 50) return 'danger'
  if (count > 20) return 'warning'
  if (count > 0) return 'info'
  return 'success'
}

const getErrorRateStatus = (rate: number) => {
  if (rate > 5) return 'danger'
  if (rate > 2) return 'warning'
  return 'success'
}

const calculateTrend = (type: string) => {
  // This would calculate actual trend from historical data
  // For now, return sample trend
  return Math.floor(Math.random() * 20) - 10 // -10 to +10%
}

const formatTimestamp = (timestamp: number) => {
  return new Date(timestamp).toLocaleString()
}

const drawErrorDistribution = () => {
  if (!errorDistributionChart.value || !errorData.value) return
  
  const canvas = errorDistributionChart.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  
  const width = canvas.width
  const height = canvas.height
  const centerX = width / 2
  const centerY = height / 2
  const radius = Math.min(width, height) / 2 - 20
  
  // Clear canvas
  ctx.clearRect(0, 0, width, height)
  
  const breakdown = errorData.value.breakdown.byType
  const total = Object.values(breakdown).reduce((sum, count) => sum + count, 0)
  
  if (total === 0) {
    // Draw "No Data" message
    ctx.fillStyle = '#6c757d'
    ctx.font = '16px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('No Errors', centerX, centerY)
    return
  }
  
  const colors = ['#dc3545', '#fd7e14', '#ffc107', '#198754', '#0dcaf0', '#6f42c1', '#d63384']
  let currentAngle = -Math.PI / 2 // Start from top
  
  Object.entries(breakdown).forEach(([type, count], index) => {
    const sliceAngle = (count / total) * 2 * Math.PI
    const color = colors[index % colors.length]
    
    // Draw slice
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(centerX, centerY)
    ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle)
    ctx.closePath()
    ctx.fill()
    
    // Draw label
    if (sliceAngle > 0.1) { // Only show label if slice is big enough
      const labelAngle = currentAngle + sliceAngle / 2
      const labelX = centerX + Math.cos(labelAngle) * (radius * 0.7)
      const labelY = centerY + Math.sin(labelAngle) * (radius * 0.7)
      
      ctx.fillStyle = '#fff'
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(type.split('Error')[0], labelX, labelY)
    }
    
    currentAngle += sliceAngle
  })
}

const refreshData = async () => {
  if (isLoading.value) return
  
  isLoading.value = true
  error.value = ''
  
  try {
    const response = await api.get(`/dashboard/errors?timeRange=${selectedTimeRange.value}`)
    errorData.value = response.data
    
    nextTick(() => {
      drawErrorDistribution()
    })
  } catch (err: unknown) {
    const message = typeof err === 'object' && err && 'response' in err
      ? (err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Failed to load error data'
      : 'Failed to load error data'
    error.value = message
    console.error('Error analytics error:', err)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  refreshData()
  
  // Auto-refresh every minute
  setInterval(refreshData, 60000)
})
</script>

<style scoped>
.progress {
  height: 4px;
}

.badge {
  font-size: 0.75rem;
}

code {
  color: #e83e8c;
  background-color: #f8f9fa;
  padding: 0.2rem 0.4rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
}

.text-truncate {
  max-width: 400px;
}

canvas {
  width: 100%;
  height: 200px;
}
</style>
