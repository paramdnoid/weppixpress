/**
 * Optimized Store Composables
 * Best practices: Reactive caching, intelligent fetching, state synchronization
 */

import { ref, computed, watch, onScopeDispose } from 'vue'
import { storeToRefs } from 'pinia'
import { useAsyncState } from './useAsyncState'
import { createEntityStore, useAsyncActionsStore } from '@/stores/optimized'
import { logger } from '@/utils/logger'

// Smart fetching with cache invalidation
export function useSmartFetch<T extends { id: string }>(
  storeName: string,
  fetcher: () => Promise<T[]>,
  options: {
    refreshInterval?: number
    staleTime?: number
    cacheKey?: string
    background?: boolean
  } = {}
) {
  const {
    refreshInterval = 0,
    staleTime = 5 * 60 * 1000, // 5 minutes
    cacheKey = storeName,
    background = false
  } = options

  // Create or get existing store
  const store = createEntityStore<T>(storeName, {
    persist: true,
    ttl: staleTime,
    syncAcrossWindows: true
  })()

  const { state, isStale } = storeToRefs(store)
  const asyncActions = useAsyncActionsStore()

  // Smart fetch logic
  const shouldFetch = computed(() => {
    return state.value.isEmpty || isStale.value || state.value.error !== null
  })

  // Async state for the fetch operation
  const {
    state: fetchState,
    isLoading,
    error,
    execute: executeFetch
  } = useAsyncState(
    async () => {
      const actionId = `fetch:${cacheKey}`
      asyncActions.startAction(actionId)

      try {
        logger.debug(`Fetching data for ${storeName}`)
        const data = await fetcher()
        store.setMany(data)
        asyncActions.completeAction(actionId)
        return data
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        store.setError(error.message)
        asyncActions.failAction(actionId, error)
        throw error
      }
    },
    {
      immediate: false,
      resetOnExecute: false
    }
  )

  // Auto-fetch if should fetch
  if (shouldFetch.value && !background) {
    executeFetch()
  }

  // Background refresh
  let refreshTimer: ReturnType<typeof setInterval> | null = null

  if (refreshInterval > 0) {
    refreshTimer = setInterval(() => {
      if (!isLoading.value) {
        executeFetch().catch(err => {
          logger.warn(`Background refresh failed for ${storeName}`, err)
        })
      }
    }, refreshInterval)
  }

  // Cleanup
  onScopeDispose(() => {
    if (refreshTimer) {
      clearInterval(refreshTimer)
    }
  })

  // Manual refresh
  const refresh = () => {
    store.invalidate()
    return executeFetch()
  }

  // Force refetch (ignore cache)
  const refetch = () => {
    store.clear()
    return executeFetch()
  }

  return {
    // Data
    data: store.all,
    byId: store.byId,
    isEmpty: store.isEmpty,
    count: store.count,

    // State
    isLoading,
    error: computed(() => error.value || (state.value.error ? new Error(state.value.error) : null)),
    isStale,
    isPending: asyncActions.isPending(`fetch:${cacheKey}`),

    // Actions
    refresh,
    refetch,
    invalidate: store.invalidate,

    // Store methods
    store
  }
}

// Optimized CRUD operations
export function useCrudOperations<T extends { id: string }>(
  storeName: string,
  api: {
    create: (data: Omit<T, 'id'>) => Promise<T>
    update: (id: string, data: Partial<T>) => Promise<T>
    delete: (id: string) => Promise<void>
  }
) {
  const store = createEntityStore<T>(storeName)()
  const asyncActions = useAsyncActionsStore()

  const create = async (data: Omit<T, 'id'>) => {
    const actionId = `create:${storeName}`
    asyncActions.startAction(actionId)

    try {
      const created = await api.create(data)
      store.addOne(created)
      asyncActions.completeAction(actionId)
      logger.debug(`Created entity in ${storeName}`, created.id)
      return created
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      asyncActions.failAction(actionId, error)
      throw error
    }
  }

  const update = async (id: string, data: Partial<T>) => {
    const actionId = `update:${storeName}:${id}`
    asyncActions.startAction(actionId)

    // Optimistic update
    const original = store.byId.value(id)
    if (original) {
      store.updateOne(id, data)
    }

    try {
      const updated = await api.update(id, data)
      store.updateOne(id, updated)
      asyncActions.completeAction(actionId)
      logger.debug(`Updated entity in ${storeName}`, id)
      return updated
    } catch (err) {
      // Rollback optimistic update
      if (original) {
        store.updateOne(id, original)
      }
      const error = err instanceof Error ? err : new Error(String(err))
      asyncActions.failAction(actionId, error)
      throw error
    }
  }

  const remove = async (id: string) => {
    const actionId = `delete:${storeName}:${id}`
    asyncActions.startAction(actionId)

    // Optimistic delete
    const original = store.byId.value(id)
    store.removeOne(id)

    try {
      await api.delete(id)
      asyncActions.completeAction(actionId)
      logger.debug(`Deleted entity from ${storeName}`, id)
    } catch (err) {
      // Rollback optimistic delete
      if (original) {
        store.addOne(original)
      }
      const error = err instanceof Error ? err : new Error(String(err))
      asyncActions.failAction(actionId, error)
      throw error
    }
  }

  return {
    // CRUD operations
    create,
    update,
    remove,

    // Loading states
    isCreating: asyncActions.isPending(`create:${storeName}`),
    isUpdating: (id: string) => asyncActions.isPending(`update:${storeName}:${id}`),
    isDeleting: (id: string) => asyncActions.isPending(`delete:${storeName}:${id}`),

    // Error states
    createError: asyncActions.getError(`create:${storeName}`),
    updateError: (id: string) => asyncActions.getError(`update:${storeName}:${id}`),
    deleteError: (id: string) => asyncActions.getError(`delete:${storeName}:${id}`),

    // Store access
    store
  }
}

// Real-time state synchronization
export function useRealtimeSync<T extends { id: string }>(
  storeName: string,
  websocketUrl: string,
  options: {
    reconnectAttempts?: number
    reconnectDelay?: number
    heartbeatInterval?: number
  } = {}
) {
  const {
    reconnectAttempts = 5,
    reconnectDelay = 1000,
    heartbeatInterval = 30000
  } = options

  const store = createEntityStore<T>(storeName)()
  const isConnected = ref(false)
  const connectionAttempts = ref(0)

  let ws: WebSocket | null = null
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null

  const connect = () => {
    if (ws?.readyState === WebSocket.OPEN) return

    try {
      ws = new WebSocket(websocketUrl)

      ws.onopen = () => {
        isConnected.value = true
        connectionAttempts.value = 0
        logger.debug(`WebSocket connected for ${storeName}`)

        // Start heartbeat
        heartbeatTimer = setInterval(() => {
          if (ws?.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }))
          }
        }, heartbeatInterval)
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          handleMessage(message)
        } catch (err) {
          logger.error('Failed to parse WebSocket message', err)
        }
      }

      ws.onclose = () => {
        isConnected.value = false
        if (heartbeatTimer) {
          clearInterval(heartbeatTimer)
          heartbeatTimer = null
        }

        // Attempt reconnection
        if (connectionAttempts.value < reconnectAttempts) {
          connectionAttempts.value++
          reconnectTimer = setTimeout(() => {
            logger.debug(`Reconnecting WebSocket for ${storeName} (attempt ${connectionAttempts.value})`)
            connect()
          }, reconnectDelay * connectionAttempts.value)
        }
      }

      ws.onerror = (error) => {
        logger.error(`WebSocket error for ${storeName}`, error)
      }

    } catch (err) {
      logger.error(`Failed to create WebSocket for ${storeName}`, err)
    }
  }

  const disconnect = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }

    if (heartbeatTimer) {
      clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }

    if (ws) {
      ws.close()
      ws = null
    }

    isConnected.value = false
  }

  const handleMessage = (message: any) => {
    switch (message.type) {
      case 'entity_created':
        store.addOne(message.data)
        break
      case 'entity_updated':
        store.updateOne(message.data.id, message.data)
        break
      case 'entity_deleted':
        store.removeOne(message.data.id)
        break
      case 'sync_state':
        store.setMany(message.data)
        break
      case 'pong':
        // Heartbeat response
        break
    }
  }

  // Auto-connect
  connect()

  // Cleanup
  onScopeDispose(() => {
    disconnect()
  })

  return {
    isConnected: computed(() => isConnected.value),
    connectionAttempts: computed(() => connectionAttempts.value),
    connect,
    disconnect,
    store
  }
}

// State persistence utilities
export function useStatePersistence<T>(
  key: string,
  defaultValue: T,
  options: {
    syncAcrossWindows?: boolean
    serializer?: {
      read: (value: string) => T
      write: (value: T) => string
    }
  } = {}
) {
  const { syncAcrossWindows = false, serializer } = options

  const stored = localStorage.getItem(key)
  const initialValue = stored
    ? (serializer ? serializer.read(stored) : JSON.parse(stored))
    : defaultValue

  const state = ref<T>(initialValue)

  // Save to localStorage
  const save = () => {
    const value = serializer ? serializer.write(state.value) : JSON.stringify(state.value)
    localStorage.setItem(key, value)
  }

  // Watch for changes
  watch(state, save, { deep: true })

  // Sync across windows
  if (syncAcrossWindows) {
    window.addEventListener('storage', (e) => {
      if (e.key === key && e.newValue) {
        const newValue = serializer ? serializer.read(e.newValue) : JSON.parse(e.newValue)
        state.value = newValue
      }
    })
  }

  const clear = () => {
    localStorage.removeItem(key)
    state.value = defaultValue
  }

  return {
    state,
    save,
    clear
  }
}