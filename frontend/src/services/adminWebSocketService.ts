import { ref, reactive } from 'vue'
import { useAuthStore } from '@/stores/auth'

export interface WebSocketMessage {
  type: string
  path?: string
  data?: any
  timestamp?: number
  batchId?: string
}

class AdminWebSocketService {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectInterval = 5000
  private heartbeatInterval: number | null = null
  private isConnecting = false

  // Reactive state
  public isConnected = ref(false)
  public connectionStatus = ref<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected')
  public lastError = ref<string | null>(null)

  // Data stores
  public dashboardData = reactive({
    overview: null as any,
    lastUpdated: null as Date | null
  })

  public systemMetrics = reactive({
    data: null as any,
    lastUpdated: null as Date | null
  })

  public errorMetrics = reactive({
    data: null as any,
    lastUpdated: null as Date | null
  })

  public userStatistics = reactive({
    data: null as any,
    lastUpdated: null as Date | null
  })

  // Event listeners
  private eventListeners: Map<string, Function[]> = new Map()

  constructor() {
    // Auto-connect if authenticated
    const authStore = useAuthStore()
    if (authStore.isAuthenticated && authStore.user?.role === 'admin') {
      this.connect()
    }
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnecting || this.isConnected.value) {
        resolve()
        return
      }

      this.isConnecting = true
      this.connectionStatus.value = 'connecting'

      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        const host = window.location.hostname
        const port = import.meta.env.VITE_API_PORT || '3000'
        const wsUrl = `${protocol}//${host}:${port}/ws`

        console.log('Connecting to WebSocket:', wsUrl)

        this.ws = new WebSocket(wsUrl)

        this.ws.onopen = () => {
          console.log('WebSocket connected')
          this.isConnected.value = true
          this.connectionStatus.value = 'connected'
          this.isConnecting = false
          this.reconnectAttempts = 0
          this.lastError.value = null

          // Subscribe to admin channels
          this.subscribeToAdminChannels()

          // Start heartbeat
          this.startHeartbeat()

          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data)
            this.handleMessage(message)
          } catch (error) {
            console.error('Error parsing WebSocket message:', error)
          }
        }

        this.ws.onclose = (event) => {
          console.log('WebSocket connection closed:', event.code, event.reason)
          this.handleDisconnection()
        }

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          this.connectionStatus.value = 'error'
          this.lastError.value = 'Connection error'
          this.isConnecting = false
          reject(error)
        }

      } catch (error) {
        console.error('Failed to create WebSocket connection:', error)
        this.isConnecting = false
        this.connectionStatus.value = 'error'
        this.lastError.value = 'Failed to connect'
        reject(error)
      }
    })
  }

  private subscribeToAdminChannels() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return

    const channels = [
      '/admin/dashboard',
      '/admin/system',
      '/admin/errors',
      '/admin/users',
      '/admin/alerts'
    ]

    channels.forEach(channel => {
      this.send({
        type: 'subscribe',
        path: channel
      })
    })
  }

  private handleMessage(message: WebSocketMessage) {
    console.log('Received WebSocket message:', message)

    switch (message.type) {
      case 'welcome':
        console.log('WebSocket welcome message received')
        break

      case 'dashboard_overview':
        this.dashboardData.overview = message.data
        this.dashboardData.lastUpdated = new Date()
        this.emit('dashboard_updated', message.data)
        break

      case 'system_metrics':
        this.systemMetrics.data = message.data
        this.systemMetrics.lastUpdated = new Date()
        this.emit('system_metrics_updated', message.data)
        break

      case 'error_metrics':
        this.errorMetrics.data = message.data
        this.errorMetrics.lastUpdated = new Date()
        this.emit('error_metrics_updated', message.data)
        break

      case 'user_statistics':
        this.userStatistics.data = message.data
        this.userStatistics.lastUpdated = new Date()
        this.emit('user_statistics_updated', message.data)
        break

      case 'user_action':
        this.emit('user_action', message.data)
        break

      case 'system_alert':
        this.emit('system_alert', message.data)
        break

      case 'subscribed':
        console.log(`Subscribed to channel: ${message.path}`)
        break

      case 'error':
        console.error('WebSocket error message:', message)
        this.lastError.value = message.data?.message || 'Unknown error'
        break

      case 'pong':
        // Heartbeat response
        break

      default:
        console.warn('Unknown WebSocket message type:', message.type)
    }
  }

  private handleDisconnection() {
    this.isConnected.value = false
    this.connectionStatus.value = 'disconnected'
    this.isConnecting = false

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }

    this.emit('disconnected')

    // Attempt to reconnect
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`)

      setTimeout(() => {
        this.connect().catch(error => {
          console.error('Reconnection failed:', error)
        })
      }, this.reconnectInterval)
    } else {
      console.error('Max reconnection attempts reached')
      this.lastError.value = 'Connection lost'
    }
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping' })
      }
    }, 30000) // 30 seconds
  }

  send(message: WebSocketMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message))
      } catch (error) {
        console.error('Error sending WebSocket message:', error)
      }
    } else {
      console.warn('WebSocket not connected, cannot send message:', message)
    }
  }

  disconnect() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }

    if (this.ws) {
      this.ws.close(1000, 'User disconnected')
      this.ws = null
    }

    this.isConnected.value = false
    this.connectionStatus.value = 'disconnected'
    this.reconnectAttempts = 0
  }

  // Event system
  on(event: string, callback: Function) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, [])
    }
    this.eventListeners.get(event)!.push(callback)
  }

  off(event: string, callback: Function) {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      const index = listeners.indexOf(callback)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  private emit(event: string, data?: any) {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error(`Error in WebSocket event listener for ${event}:`, error)
        }
      })
    }
  }

  // Request immediate data refresh
  requestRefresh(dataType?: string) {
    this.send({
      type: 'request_refresh',
      data: { dataType }
    })
  }

  // Get connection info
  getConnectionInfo() {
    return {
      isConnected: this.isConnected.value,
      connectionStatus: this.connectionStatus.value,
      lastError: this.lastError.value,
      reconnectAttempts: this.reconnectAttempts,
      hasData: {
        dashboard: !!this.dashboardData.overview,
        system: !!this.systemMetrics.data,
        errors: !!this.errorMetrics.data,
        users: !!this.userStatistics.data
      }
    }
  }
}

// Create singleton instance
const adminWebSocketService = new AdminWebSocketService()

export default adminWebSocketService