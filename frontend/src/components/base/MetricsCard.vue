<template>
  <div
    class="card"
    :class="cardClass"
  >
    <div class="card-body">
      <div class="d-flex align-items-center">
        <div class="subheader">
          {{ title }}
        </div>
        <div class="ms-auto">
          <Icon
            :icon="icon"
            :class="iconClass"
          />
        </div>
      </div>
      <div class="d-flex align-items-baseline">
        <div
          class="h1 mb-0 me-2"
          :class="valueClass"
        >
          {{ formattedValue }}
        </div>
        <div
          v-if="trend !== undefined"
          class="me-auto"
        >
          <span 
            class="text-small d-inline-flex align-items-center"
            :class="trendClass"
          >
            <Icon
              :icon="trendIcon"
              class="me-1"
            />
            {{ Math.abs(trend) }}%
          </span>
        </div>
      </div>
      <div
        v-if="subtitle"
        class="text-muted"
      >
        {{ subtitle }}
      </div>
      
      <!-- Mini sparkline chart -->
      <div
        v-if="sparklineData && sparklineData.length > 1"
        class="mt-3"
      >
        <canvas 
          ref="sparklineCanvas" 
          width="200" 
          height="40"
          class="sparkline"
        />
      </div>
      
      <!-- Progress bar for percentage values -->
      <div
        v-if="showProgress && percentage !== undefined"
        class="mt-3"
      >
        <div class="row">
          <div class="col">
            {{ progressLabel }}
          </div>
          <div class="col-auto">
            {{ percentage.toFixed(1) }}%
          </div>
        </div>
        <div class="progress progress-sm">
          <div 
            class="progress-bar"
            :class="progressBarClass"
            :style="{ width: percentage + '%' }"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { Icon } from '@iconify/vue'

interface MetricsCardProps {
  title: string
  value: number | string
  icon: string
  trend?: number // percentage change
  subtitle?: string
  status?: 'success' | 'warning' | 'danger' | 'info'
  format?: 'number' | 'percentage' | 'bytes' | 'duration'
  sparklineData?: number[]
  showProgress?: boolean
  percentage?: number
  progressLabel?: string
}

const props = withDefaults(defineProps<MetricsCardProps>(), {
  format: 'number',
  showProgress: false,
  progressLabel: 'Usage',
  trend: undefined,
  subtitle: undefined,
  status: undefined,
  sparklineData: undefined,
  percentage: undefined
})

const sparklineCanvas = ref<HTMLCanvasElement>()

const cardClass = computed(() => {
  if (!props.status) return ''
  return {
    'border-success': props.status === 'success',
    'border-warning': props.status === 'warning', 
    'border-danger': props.status === 'danger',
    'border-info': props.status === 'info'
  }
})

const iconClass = computed(() => {
  if (!props.status) return 'text-muted'
  return {
    'text-success': props.status === 'success',
    'text-warning': props.status === 'warning',
    'text-danger': props.status === 'danger', 
    'text-info': props.status === 'info'
  }
})

const valueClass = computed(() => {
  if (!props.status) return ''
  return {
    'text-success': props.status === 'success',
    'text-warning': props.status === 'warning',
    'text-danger': props.status === 'danger',
    'text-info': props.status === 'info'
  }
})

const trendClass = computed(() => {
  if (props.trend === undefined) return ''
  return props.trend >= 0 ? 'text-danger' : 'text-success'
})

const trendIcon = computed(() => {
  if (props.trend === undefined) return ''
  return props.trend >= 0 ? 'tabler:trending-up' : 'tabler:trending-down'
})

const progressBarClass = computed(() => {
  if (props.percentage === undefined) return 'bg-primary'
  
  if (props.percentage >= 90) return 'bg-danger'
  if (props.percentage >= 70) return 'bg-warning'
  return 'bg-success'
})

const formattedValue = computed(() => {
  const value = props.value
  
  if (typeof value === 'string') return value
  
  switch (props.format) {
    case 'percentage':
      return `${value.toFixed(1)}%`
    case 'bytes':
      return formatBytes(value)
    case 'duration':
      return formatDuration(value)
    case 'number':
    default:
      return formatNumber(value)
  }
})

const formatNumber = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`
  }
  return Math.round(value).toString()
}

const formatBytes = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = bytes
  let unitIndex = 0
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  
  return `${size.toFixed(1)}${units[unitIndex]}`
}

const formatDuration = (ms: number): string => {
  if (ms >= 60000) {
    return `${Math.round(ms / 60000)}m`
  }
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(1)}s`
  }
  return `${Math.round(ms)}ms`
}

const drawSparkline = () => {
  if (!sparklineCanvas.value || !props.sparklineData || props.sparklineData.length < 2) return
  
  const canvas = sparklineCanvas.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  
  const width = canvas.width
  const height = canvas.height
  
  // Clear canvas
  ctx.clearRect(0, 0, width, height)
  
  const data = props.sparklineData
  const maxValue = Math.max(...data)
  const minValue = Math.min(...data)
  const range = maxValue - minValue || 1
  
  // Draw line
  ctx.strokeStyle = props.status === 'danger' ? '#dc3545' : 
                   props.status === 'warning' ? '#fd7e14' :
                   props.status === 'success' ? '#198754' : '#206bc4'
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  
  ctx.beginPath()
  data.forEach((value, index) => {
    const x = (index / (data.length - 1)) * width
    const y = height - ((value - minValue) / range) * height
    
    if (index === 0) {
      ctx.moveTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }
  })
  ctx.stroke()
  
  // Draw area fill
  ctx.fillStyle = ctx.strokeStyle + '20'
  ctx.beginPath()
  data.forEach((value, index) => {
    const x = (index / (data.length - 1)) * width
    const y = height - ((value - minValue) / range) * height
    
    if (index === 0) {
      ctx.moveTo(x, height)
      ctx.lineTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }
  })
  ctx.lineTo(width, height)
  ctx.lineTo(0, height)
  ctx.closePath()
  ctx.fill()
}

watch(() => props.sparklineData, () => {
  nextTick(() => {
    drawSparkline()
  })
}, { deep: true })

onMounted(() => {
  nextTick(() => {
    drawSparkline()
  })
})
</script>

<style scoped>
.sparkline {
  width: 100%;
  height: 40px;
}

.progress-sm {
  height: 4px;
}

.text-small {
  font-size: 0.75rem;
}

.card.border-success {
  border-left: 4px solid var(--bs-success) !important;
}

.card.border-warning {
  border-left: 4px solid var(--bs-warning) !important;
}

.card.border-danger {
  border-left: 4px solid var(--bs-danger) !important;
}

.card.border-info {
  border-left: 4px solid var(--bs-info) !important;
}
</style>