// frontend/src/composables/useWebSocket.ts
import { ref, onUnmounted, onMounted } from 'vue'
import { logger } from '@/utils/logger'

export interface WebSocketOptions {
  onMessage?: (event: MessageEvent) => void
  onOpen?: (event: Event) => void
  onClose?: (event: CloseEvent) => void
  onError?: (event: Event) => void
  reconnect?: boolean
  reconnectInterval?: number
  maxReconnectAttempts?: number
  protocols?: string | string[]
}

export interface WebSocketMessage {
  type: string
  [key: string]: any
}

function getWebSocketUrl(path: string): string {
  // Normalize path to always start with a leading slash
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  // Access Vite env safely
  const env: Record<string, any> = (import.meta as any)?.env || {}
  const isBrowser = typeof window !== 'undefined' && typeof window.location !== 'undefined'

  // 1) Strong explicit override via env
  // Prefer VITE_WS_URL (full URL) or VITE_WS_BASE over anything else
  const explicitBase = env.VITE_WS_URL || env.VITE_WS_BASE
  if (explicitBase) {
    try {
      const base = new URL(explicitBase as string)
      // Convert http(s) -> ws(s); keep ws/wss as-is
      const protocol = base.protocol === 'https:' ? 'wss:' : (base.protocol === 'http:' ? 'ws:' : base.protocol)
      // Allow explicit port override via VITE_WS_PORT
      const port = env.VITE_WS_PORT ?? base.port
      const host = port ? `${base.hostname}:${port}` : base.host
      const basePath = base.pathname.endsWith('/') ? base.pathname.slice(0, -1) : base.pathname
      return `${protocol}//${host}${basePath}${normalizedPath}`
    } catch (error) {
      logger.warn('Invalid VITE_WS_URL/VITE_WS_BASE, falling back to location', error)
    }
  }

  // 2) SSR / non-browser fallback
  if (!isBrowser) {
    const host = env.VITE_WS_HOST || 'localhost'
    const port = env.VITE_WS_PORT || '3001'
    const protocol = env.VITE_WS_SSL ? 'wss:' : 'ws:'
    return `${protocol}//${host}:${port}${normalizedPath}`
  }

  // 3) Browser: derive from current location
  const { location } = window
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'

  // If explicit WS port is provided, use it. Otherwise: in dev default to 3001; in prod reuse current port
  const isDev = !!env.DEV || location.hostname === 'localhost'
  const fallbackPort = location.port || (location.protocol === 'https:' ? '443' : '80')
  const port = (env.VITE_WS_PORT as string) || (isDev ? '3001' : fallbackPort)

  return `${protocol}//${location.hostname}:${port}${normalizedPath}`
}

export function useWebSocket(path: string, options: WebSocketOptions = {}) {
  const {
    onMessage,
    onOpen,
    onClose,
    onError,
    reconnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    protocols
  } = options

  const socket = ref<WebSocket | null>(null)
  const isConnected = ref(false)
  const isConnecting = ref(false)
  const reconnectAttempts = ref(0)
  const lastError = ref<string | null>(null)

  let reconnectTimeoutId: number | null = null
  let isManualClose = false
  const messageQueue: (WebSocketMessage | string)[] = []

  function connect() {
    if (isConnecting.value || (socket.value && socket.value.readyState === WebSocket.CONNECTING)) {
      logger.warn('WebSocket connection already in progress')
      return
    }

    try {
      isConnecting.value = true
      lastError.value = null
      
      const wsUrl = getWebSocketUrl(path)
      
      socket.value = protocols ? new WebSocket(wsUrl, protocols) : new WebSocket(wsUrl)

      socket.value.onopen = (event) => {
        isConnected.value = true
        isConnecting.value = false
        reconnectAttempts.value = 0
        lastError.value = null
        
        
        // Process queued messages
        while (messageQueue.length > 0) {
          const queuedMessage = messageQueue.shift()!
          const message = typeof queuedMessage === 'string' ? queuedMessage : JSON.stringify(queuedMessage)
          socket.value!.send(message)
        }
        
        onOpen?.(event)
      }

      socket.value.onmessage = (event) => {
        try {
          JSON.parse(event.data)
          onMessage?.(event)
        } catch (error) {
          logger.error('Error parsing WebSocket message', error)
        }
      }

      socket.value.onclose = (event) => {
        isConnected.value = false
        isConnecting.value = false
        
        
        onClose?.(event)

        // Auto-reconnect logic
        if (reconnect && !isManualClose && reconnectAttempts.value < maxReconnectAttempts) {
          const delay = Math.min(
            reconnectInterval * Math.pow(1.5, reconnectAttempts.value),
            30000 // Max 30 seconds
          )
          
          
          reconnectTimeoutId = window.setTimeout(() => {
            reconnectAttempts.value++
            connect()
          }, delay)
        } else if (reconnectAttempts.value >= maxReconnectAttempts) {
          logger.error('Max reconnection attempts reached')
          lastError.value = 'Max reconnection attempts reached'
        }
      }

      socket.value.onerror = (event) => {
        isConnecting.value = false
        lastError.value = 'WebSocket connection error'
        
        logger.error('WebSocket error', { event, wsUrl })
        onError?.(event)
      }
    } catch (error) {
      isConnecting.value = false
      lastError.value = error instanceof Error ? error.message : 'Unknown connection error'
      logger.error('WebSocket connection error', error)
    }
  }

  function send(data: WebSocketMessage | string) {
    if (socket.value?.readyState === WebSocket.OPEN) {
      const message = typeof data === 'string' ? data : JSON.stringify(data)
      socket.value.send(message)
    } else {
      // Queue message for when connection is established
      messageQueue.push(data)
      
      // Try to establish connection if not already connecting
      if (!isConnecting.value && !isConnected.value) {
        connect()
      }
    }
  }

  function close() {
    isManualClose = true
    
    if (reconnectTimeoutId) {
      clearTimeout(reconnectTimeoutId)
      reconnectTimeoutId = null
    }
    
    // Clear any queued messages
    messageQueue.length = 0
    
    if (socket.value) {
      socket.value.close(1000, 'Manual close')
    }
  }

  function reconnectNow() {
    if (reconnectTimeoutId) {
      clearTimeout(reconnectTimeoutId)
      reconnectTimeoutId = null
    }
    
    if (socket.value) {
      socket.value.close()
    }
    
    isManualClose = false
    reconnectAttempts.value = 0
    connect()
  }

  // Auto-connect on mount
  onMounted(() => {
    connect()
  })

  onUnmounted(() => {
    close()
  })

  return {
    socket: socket as Readonly<typeof socket>,
    isConnected: isConnected as Readonly<typeof isConnected>,
    isConnecting: isConnecting as Readonly<typeof isConnecting>,
    lastError: lastError as Readonly<typeof lastError>,
    reconnectAttempts: reconnectAttempts as Readonly<typeof reconnectAttempts>,
    send,
    close,
    connect: reconnectNow
  }
}