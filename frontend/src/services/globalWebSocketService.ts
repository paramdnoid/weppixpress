import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'

export interface WebSocketMessage {
  type: string
  path?: string
  data?: any
  timestamp?: number
  batchId?: string
  userId?: string
}

class GlobalWebSocketService {
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

  // Event listeners
  private eventListeners: Map<string, Function[]> = new Map()

  constructor() {
    // Will be initialized when needed
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


        this.ws = new WebSocket(wsUrl)

        this.ws.onopen = () => {
          this.isConnected.value = true
          this.connectionStatus.value = 'connected'
          this.isConnecting = false
          this.reconnectAttempts = 0
          this.lastError.value = null

          // Subscribe to general channels
          this.subscribeToChannels()

          // Start heartbeat
          this.startHeartbeat()

          // Auto-authenticate with current user
          this.authenticateCurrentUser()

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
          this.handleDisconnection()
        }

        this.ws.onerror = (error) => {
          console.error('Global WebSocket error:', error)
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

  private subscribeToChannels() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return

    // Subscribe to user-relevant channels
    const channels = [
      '/admin/users', // For online status updates
      '/general/notifications'
    ]

    channels.forEach(channel => {
      this.send({
        type: 'subscribe',
        path: channel
      })
    })
  }

  private authenticateCurrentUser() {
    try {
      const authStore = useAuthStore()
      if (authStore.user?.id) {
        this.send({
          type: 'authenticate',
          userId: authStore.user.id
        })
      }
    } catch (error) {
      console.warn('Failed to auto-authenticate with WebSocket:', error)
    }
  }

  private handleMessage(message: WebSocketMessage) {
    switch (message.type) {
      case 'welcome':
        break

      case 'authenticated':
        break

      case 'logout_confirmed':
        break

      case 'user_online':
        this.emit('user_online', message.data)
        break

      case 'user_offline':
        this.emit('user_offline', message.data)
        break

      case 'online_users_list':
        this.emit('online_users_list', message.data)
        break

      case 'subscribed':
        break

      case 'error':
        console.error('Global WebSocket error message:', message)
        this.lastError.value = message.data?.message || 'Unknown error'
        break

      case 'pong':
        // Heartbeat response
        break

      default:
        console.warn('Unknown global WebSocket message type:', message.type)
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

      setTimeout(() => {
        this.connect().catch(error => {
          console.error('Global WebSocket reconnection failed:', error)
        })
      }, this.reconnectInterval)
    } else {
      console.error('Max global WebSocket reconnection attempts reached')
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
        console.error('Error sending global WebSocket message:', error)
      }
    } else {
      console.warn('Global WebSocket not connected, cannot send message:', message)
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
          console.error(`Error in global WebSocket event listener for ${event}:`, error)
        }
      })
    }
  }

  // Authenticate with user ID
  authenticate(userId: string) {
    this.send({
      type: 'authenticate',
      userId
    })
  }
}

// Create singleton instance
const globalWebSocketService = new GlobalWebSocketService()

export default globalWebSocketService