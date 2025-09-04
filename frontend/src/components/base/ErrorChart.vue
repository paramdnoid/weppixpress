<template>
  <div class="card">
    <div class="card-header">
      <h3 class="card-title">{{ title }}</h3>
      <div class="card-options">
        <select v-model="chartType" class="form-select form-select-sm" @change="updateChart">
          <option value="line">Line Chart</option>
          <option value="bar">Bar Chart</option>
          <option value="area">Area Chart</option>
        </select>
      </div>
    </div>
    <div class="card-body">
      <div v-if="isLoading" class="text-center py-4">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
      </div>
      <div v-else-if="error" class="alert alert-danger">
        {{ error }}
      </div>
      <div v-else>
        <canvas ref="chartCanvas" width="400" height="200"></canvas>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'

interface ChartProps {
  title: string
  data: Array<{ timestamp: number; value: number; label?: string }>
  type?: 'line' | 'bar' | 'area'
  color?: string
}

const props = withDefaults(defineProps<ChartProps>(), {
  type: 'line',
  color: '#206bc4'
})

const chartCanvas = ref<HTMLCanvasElement>()
const chartType = ref(props.type)
const isLoading = ref(false)
const error = ref('')

let chart: any = null

// Simple chart implementation without external dependencies
const drawChart = () => {
  if (!chartCanvas.value || !props.data.length) return

  const canvas = chartCanvas.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // Set canvas size
  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width * window.devicePixelRatio
  canvas.height = rect.height * window.devicePixelRatio
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

  const width = rect.width
  const height = rect.height
  const padding = 40

  // Clear canvas
  ctx.clearRect(0, 0, width, height)

  // Prepare data
  const dataPoints = props.data
  const maxValue = Math.max(...dataPoints.map(d => d.value))
  const minValue = Math.min(...dataPoints.map(d => d.value))
  const range = maxValue - minValue || 1

  // Draw axes
  ctx.strokeStyle = '#e6e7e8'
  ctx.lineWidth = 1
  ctx.beginPath()
  // Y-axis
  ctx.moveTo(padding, padding)
  ctx.lineTo(padding, height - padding)
  // X-axis
  ctx.lineTo(width - padding, height - padding)
  ctx.stroke()

  // Draw grid lines
  ctx.strokeStyle = '#f1f3f4'
  ctx.lineWidth = 0.5
  
  // Horizontal grid lines
  for (let i = 1; i <= 5; i++) {
    const y = padding + (height - 2 * padding) * (i / 5)
    ctx.beginPath()
    ctx.moveTo(padding, y)
    ctx.lineTo(width - padding, y)
    ctx.stroke()
  }

  // Vertical grid lines
  const stepX = (width - 2 * padding) / (dataPoints.length - 1 || 1)
  for (let i = 0; i < dataPoints.length; i++) {
    const x = padding + i * stepX
    ctx.beginPath()
    ctx.moveTo(x, padding)
    ctx.lineTo(x, height - padding)
    ctx.stroke()
  }

  // Draw data
  if (chartType.value === 'line' || chartType.value === 'area') {
    // Line/Area chart
    ctx.strokeStyle = props.color
    ctx.fillStyle = props.color + '20' // Add transparency for area
    ctx.lineWidth = 2

    ctx.beginPath()
    dataPoints.forEach((point, index) => {
      const x = padding + (index / (dataPoints.length - 1 || 1)) * (width - 2 * padding)
      const y = height - padding - ((point.value - minValue) / range) * (height - 2 * padding)
      
      if (index === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })
    
    if (chartType.value === 'area') {
      // Close the path for area fill
      const lastX = padding + (width - 2 * padding)
      ctx.lineTo(lastX, height - padding)
      ctx.lineTo(padding, height - padding)
      ctx.closePath()
      ctx.fill()
    }
    
    ctx.stroke()

    // Draw data points
    ctx.fillStyle = props.color
    dataPoints.forEach((point, index) => {
      const x = padding + (index / (dataPoints.length - 1 || 1)) * (width - 2 * padding)
      const y = height - padding - ((point.value - minValue) / range) * (height - 2 * padding)
      
      ctx.beginPath()
      ctx.arc(x, y, 3, 0, 2 * Math.PI)
      ctx.fill()
    })

  } else if (chartType.value === 'bar') {
    // Bar chart
    ctx.fillStyle = props.color
    const barWidth = (width - 2 * padding) / dataPoints.length * 0.8
    
    dataPoints.forEach((point, index) => {
      const x = padding + (index + 0.1) * (width - 2 * padding) / dataPoints.length
      const y = height - padding - ((point.value - minValue) / range) * (height - 2 * padding)
      const barHeight = ((point.value - minValue) / range) * (height - 2 * padding)
      
      ctx.fillRect(x, y, barWidth, barHeight)
    })
  }

  // Draw labels
  ctx.fillStyle = '#666'
  ctx.font = '12px sans-serif'
  ctx.textAlign = 'center'

  // Y-axis labels
  ctx.textAlign = 'right'
  for (let i = 0; i <= 5; i++) {
    const value = minValue + (range * i / 5)
    const y = height - padding - (i / 5) * (height - 2 * padding)
    ctx.fillText(Math.round(value).toString(), padding - 10, y + 4)
  }

  // X-axis labels (show every few points to avoid crowding)
  ctx.textAlign = 'center'
  const labelStep = Math.max(1, Math.floor(dataPoints.length / 6))
  dataPoints.forEach((point, index) => {
    if (index % labelStep === 0) {
      const x = padding + (index / (dataPoints.length - 1 || 1)) * (width - 2 * padding)
      const date = new Date(point.timestamp)
      const label = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      ctx.fillText(label, x, height - 10)
    }
  })
}

const updateChart = () => {
  nextTick(() => {
    drawChart()
  })
}

watch(() => props.data, () => {
  updateChart()
}, { deep: true })

watch(chartType, () => {
  updateChart()
})

onMounted(() => {
  updateChart()
  
  // Redraw on window resize
  window.addEventListener('resize', updateChart)
})
</script>

<style scoped>
canvas {
  width: 100%;
  height: 200px;
}

.form-select-sm {
  width: auto;
}
</style>