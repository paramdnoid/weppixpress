import { ref, onUnmounted } from 'vue'

export interface WebSocketOptions {
  onMessage?: (event: MessageEvent) => void
  onOpen?: (event: Event) => void
  onClose?: (event: CloseEvent) => void
  onError?: (event: Event) => void
  reconnect?: boolean
  reconnectInterval?: number
  maxReconnectAttempts?: number
}

export function useWebSocket(url: string, options: WebSocketOptions = {}) {
  const {
    onMessage,
    onOpen,
    onClose,
    onError,
    reconnect = false,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5
  } = options

  const socket = ref<WebSocket | null>(null)
  const isConnected = ref(false)
  const reconnectAttempts = ref(0)

  function connect() {
    try {
      const wsUrl = url.startsWith('/') ? `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}${url}` : url
      socket.value = new WebSocket(wsUrl)

      socket.value.onopen = (event) => {
        isConnected.value = true
        reconnectAttempts.value = 0
        onOpen?.(event)
      }

      socket.value.onmessage = (event) => {
        onMessage?.(event)
      }

      socket.value.onclose = (event) => {
        isConnected.value = false
        onClose?.(event)

        if (reconnect && reconnectAttempts.value < maxReconnectAttempts) {
          reconnectAttempts.value++
          setTimeout(connect, reconnectInterval)
        }
      }

      socket.value.onerror = (event) => {
        onError?.(event)
      }
    } catch (error) {
      console.error('WebSocket connection error:', error)
    }
  }

  function send(data: any) {
    if (socket.value?.readyState === WebSocket.OPEN) {
      socket.value.send(typeof data === 'string' ? data : JSON.stringify(data))
    }
  }

  function close() {
    socket.value?.close()
  }

  connect()

  onUnmounted(() => {
    close()
  })

  return {
    socket,
    isConnected,
    send,
    close,
    connect
  }
}