import { ref, onMounted, onUnmounted, Ref } from 'vue';

interface WebSocketOptions {
  onMessage?: (event: MessageEvent) => void;
  onOpen?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
  reconnect?: boolean;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

interface WebSocketReturn {
  ws: Ref<WebSocket | null>;
  isConnected: Ref<boolean>;
  send: (data: any) => void;
  close: () => void;
  reconnect: () => void;
}

export function useWebSocket(
  url: string,
  options: WebSocketOptions = {}
): WebSocketReturn {
  const {
    onMessage,
    onOpen,
    onClose,
    onError,
    reconnect = true,
    reconnectDelay = 3000,
    maxReconnectAttempts = 5,
    heartbeatInterval = 30000
  } = options;

  const ws = ref<WebSocket | null>(null);
  const isConnected = ref(false);
  const reconnectAttempts = ref(0);
  let heartbeatTimer: number | null = null;
  let reconnectTimer: number | null = null;

  // Get full WebSocket URL
  const getWebSocketUrl = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}${url}`;
  };

  // Create WebSocket connection
  const connect = () => {
    try {
      ws.value = new WebSocket(getWebSocketUrl());

      ws.value.onopen = (event) => {
        console.log('WebSocket connected');
        isConnected.value = true;
        reconnectAttempts.value = 0;
        startHeartbeat();
        onOpen?.(event);
      };

      ws.value.onmessage = (event) => {
        // Handle ping/pong
        if (event.data === 'pong') {
          return;
        }
        onMessage?.(event);
      };

      ws.value.onclose = (event) => {
        console.log('WebSocket closed', event);
        isConnected.value = false;
        stopHeartbeat();
        onClose?.(event);

        if (reconnect && reconnectAttempts.value < maxReconnectAttempts) {
          scheduleReconnect();
        }
      };

      ws.value.onerror = (event) => {
        console.error('WebSocket error', event);
        onError?.(event);
      };
    } catch (error) {
      console.error('Failed to create WebSocket', error);
      if (reconnect) {
        scheduleReconnect();
      }
    }
  };

  // Schedule reconnection
  const scheduleReconnect = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
    }

    reconnectTimer = window.setTimeout(() => {
      reconnectAttempts.value++;
      console.log(`Reconnecting... (attempt ${reconnectAttempts.value})`);
      connect();
    }, reconnectDelay * Math.pow(2, Math.min(reconnectAttempts.value, 3)));
  };

  // Heartbeat to keep connection alive
  const startHeartbeat = () => {
    stopHeartbeat();
    heartbeatTimer = window.setInterval(() => {
      if (ws.value?.readyState === WebSocket.OPEN) {
        ws.value.send('ping');
      }
    }, heartbeatInterval);
  };

  const stopHeartbeat = () => {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  };

  // Send data through WebSocket
  const send = (data: any) => {
    if (ws.value?.readyState === WebSocket.OPEN) {
      ws.value.send(typeof data === 'string' ? data : JSON.stringify(data));
    } else {
      console.warn('WebSocket is not connected');
    }
  };

  // Close WebSocket connection
  const close = () => {
    stopHeartbeat();
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
    }
    if (ws.value) {
      ws.value.close();
      ws.value = null;
    }
  };

  // Manual reconnect
  const reconnectManual = () => {
    close();
    reconnectAttempts.value = 0;
    connect();
  };

  // Lifecycle
  onMounted(() => {
    connect();
  });

  onUnmounted(() => {
    close();
  });

  return {
    ws,
    isConnected,
    send,
    close,
    reconnect: reconnectManual
  };
}