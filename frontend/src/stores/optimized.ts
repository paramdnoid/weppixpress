/**
 * Optimized Store Patterns
 * Best practices: Normalized state, computed selectors, proper mutations, persistence
 */

import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import { logger } from '@/utils/logger'

// Normalized state pattern for entities
export interface NormalizedState<T extends { id: string }> {
  ids: string[]
  entities: Record<string, T>
  loading: boolean
  error: string | null
  lastFetch: number | null
}

export function createNormalizedState<T extends { id: string }>(): NormalizedState<T> {
  return {
    ids: [],
    entities: {},
    loading: false,
    error: null,
    lastFetch: null
  }
}

// Optimized entity store factory
export function createEntityStore<T extends { id: string }>(
  name: string,
  options: {
    persist?: boolean
    ttl?: number // Time to live in ms
    syncAcrossWindows?: boolean
  } = {}
) {
  const { persist = false, ttl = 5 * 60 * 1000, syncAcrossWindows = false } = options

  return defineStore(name, () => {
    // State
    const state = ref(createNormalizedState<T>())

    // Persistence
    const persistedState = persist
      ? useLocalStorage(`store:${name}`, state.value, {
          syncAcrossWindows
        })
      : null

    if (persistedState) {
      state.value = persistedState.value
    }

    // Computed selectors (memoized)
    const all = computed(() =>
      state.value.ids.map(id => state.value.entities[id]).filter(Boolean)
    )

    const byId = computed(() => (id: string) => state.value.entities[id])

    const isEmpty = computed(() => state.value.ids.length === 0)

    const count = computed(() => state.value.ids.length)

    const isStale = computed(() => {
      if (!state.value.lastFetch) return true
      return Date.now() - state.value.lastFetch > ttl
    })

    // Optimized mutations
    const setLoading = (loading: boolean) => {
      state.value.loading = loading
    }

    const setError = (error: string | null) => {
      state.value.error = error
    }

    const setMany = (items: T[]) => {
      const entities: Record<string, T> = {}
      const ids: string[] = []

      items.forEach(item => {
        entities[item.id] = item
        ids.push(item.id)
      })

      state.value.entities = entities
      state.value.ids = ids
      state.value.lastFetch = Date.now()
      state.value.error = null

      logger.debug(`Set ${items.length} entities in ${name} store`)
    }

    const addOne = (item: T) => {
      if (!state.value.entities[item.id]) {
        state.value.ids.push(item.id)
      }
      state.value.entities[item.id] = item

      logger.debug(`Added entity ${item.id} to ${name} store`)
    }

    const updateOne = (id: string, changes: Partial<T>) => {
      if (state.value.entities[id]) {
        state.value.entities[id] = { ...state.value.entities[id], ...changes }
        logger.debug(`Updated entity ${id} in ${name} store`)
      }
    }

    const removeOne = (id: string) => {
      if (state.value.entities[id]) {
        delete state.value.entities[id]
        state.value.ids = state.value.ids.filter(existingId => existingId !== id)
        logger.debug(`Removed entity ${id} from ${name} store`)
      }
    }

    const clear = () => {
      state.value = createNormalizedState<T>()
      logger.debug(`Cleared ${name} store`)
    }

    // Batch operations for performance
    const batchMutate = (mutations: (() => void)[]) => {
      mutations.forEach(mutation => mutation())
    }

    // Advanced selectors
    const createSelector = <R>(selector: (state: NormalizedState<T>) => R) => {
      return computed(() => selector(state.value))
    }

    const where = (predicate: (item: T) => boolean) => {
      return computed(() => all.value.filter(predicate))
    }

    const findById = (id: string) => {
      return computed(() => state.value.entities[id] || null)
    }

    const findBy = (predicate: (item: T) => boolean) => {
      return computed(() => all.value.find(predicate) || null)
    }

    // Cache invalidation
    const invalidate = () => {
      state.value.lastFetch = null
    }

    // Persistence watcher
    if (persistedState) {
      watch(
        state,
        (newState) => {
          persistedState.value = newState
        },
        { deep: true }
      )
    }

    return {
      // State
      state: computed(() => state.value),

      // Computed
      all,
      byId,
      isEmpty,
      count,
      isStale,

      // Mutations
      setLoading,
      setError,
      setMany,
      addOne,
      updateOne,
      removeOne,
      clear,
      batchMutate,

      // Selectors
      createSelector,
      where,
      findById,
      findBy,

      // Cache
      invalidate
    }
  })
}

// Optimized async actions store
export const useAsyncActionsStore = defineStore('asyncActions', () => {
  const pendingActions = ref<Set<string>>(new Set())
  const actionErrors = ref<Record<string, Error>>({})

  const isPending = (actionId: string) => computed(() =>
    pendingActions.value.has(actionId)
  )

  const getError = (actionId: string) => computed(() =>
    actionErrors.value[actionId] || null
  )

  const hasPendingActions = computed(() =>
    pendingActions.value.size > 0
  )

  const startAction = (actionId: string) => {
    pendingActions.value.add(actionId)
    delete actionErrors.value[actionId]
  }

  const completeAction = (actionId: string) => {
    pendingActions.value.delete(actionId)
    delete actionErrors.value[actionId]
  }

  const failAction = (actionId: string, error: Error) => {
    pendingActions.value.delete(actionId)
    actionErrors.value[actionId] = error
  }

  const clearActionError = (actionId: string) => {
    delete actionErrors.value[actionId]
  }

  const clearAllErrors = () => {
    actionErrors.value = {}
  }

  return {
    isPending,
    getError,
    hasPendingActions,
    startAction,
    completeAction,
    failAction,
    clearActionError,
    clearAllErrors
  }
})

// Optimized form state store
export const useFormStateStore = defineStore('formState', () => {
  const formStates = ref<Record<string, {
    isDirty: boolean
    isValid: boolean
    errors: Record<string, string>
    touched: Record<string, boolean>
  }>>({})

  const getFormState = (formId: string) => computed(() =>
    formStates.value[formId] || {
      isDirty: false,
      isValid: true,
      errors: {},
      touched: {}
    }
  )

  const setFormState = (formId: string, state: Partial<{
    isDirty: boolean
    isValid: boolean
    errors: Record<string, string>
    touched: Record<string, boolean>
  }>) => {
    formStates.value[formId] = {
      ...getFormState(formId).value,
      ...state
    }
  }

  const setFieldError = (formId: string, field: string, error: string) => {
    const current = getFormState(formId).value
    formStates.value[formId] = {
      ...current,
      errors: { ...current.errors, [field]: error },
      isValid: false
    }
  }

  const clearFieldError = (formId: string, field: string) => {
    const current = getFormState(formId).value
    const { [field]: _, ...errors } = current.errors
    formStates.value[formId] = {
      ...current,
      errors,
      isValid: Object.keys(errors).length === 0
    }
  }

  const setFieldTouched = (formId: string, field: string) => {
    const current = getFormState(formId).value
    formStates.value[formId] = {
      ...current,
      touched: { ...current.touched, [field]: true }
    }
  }

  const resetForm = (formId: string) => {
    delete formStates.value[formId]
  }

  return {
    getFormState,
    setFormState,
    setFieldError,
    clearFieldError,
    setFieldTouched,
    resetForm
  }
})

// Global app state store with optimizations
export const useAppStore = defineStore('app', () => {
  // Theme state with system preference detection
  const systemTheme = ref<'light' | 'dark'>(
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  )

  const userTheme = useLocalStorage<'light' | 'dark' | 'system'>('theme', 'system')

  const currentTheme = computed(() =>
    userTheme.value === 'system' ? systemTheme.value : userTheme.value
  )

  // Layout state
  const layout = ref({
    sidebarOpen: false,
    sidebarCollapsed: false,
    headerHeight: 64,
    footerHeight: 48
  })

  // Global loading states
  const globalLoading = ref(false)
  const pageLoading = ref(false)

  // Notification system
  const notifications = ref<Array<{
    id: string
    type: 'success' | 'error' | 'warning' | 'info'
    title: string
    message?: string
    duration?: number
    persistent?: boolean
  }>>([])

  // Network status
  const isOnline = ref(navigator.onLine)

  // Actions
  const setTheme = (theme: 'light' | 'dark' | 'system') => {
    userTheme.value = theme
  }

  const toggleSidebar = () => {
    layout.value.sidebarOpen = !layout.value.sidebarOpen
  }

  const setSidebarCollapsed = (collapsed: boolean) => {
    layout.value.sidebarCollapsed = collapsed
  }

  const setGlobalLoading = (loading: boolean) => {
    globalLoading.value = loading
  }

  const setPageLoading = (loading: boolean) => {
    pageLoading.value = loading
  }

  const addNotification = (notification: Omit<typeof notifications.value[0], 'id'>) => {
    const id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    notifications.value.push({ ...notification, id })

    // Auto-remove non-persistent notifications
    if (!notification.persistent) {
      setTimeout(() => {
        removeNotification(id)
      }, notification.duration || 5000)
    }

    return id
  }

  const removeNotification = (id: string) => {
    const index = notifications.value.findIndex(n => n.id === id)
    if (index > -1) {
      notifications.value.splice(index, 1)
    }
  }

  const clearNotifications = () => {
    notifications.value = []
  }

  // System theme change listener
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  mediaQuery.addEventListener('change', (e) => {
    systemTheme.value = e.matches ? 'dark' : 'light'
  })

  // Online status listener
  window.addEventListener('online', () => { isOnline.value = true })
  window.addEventListener('offline', () => { isOnline.value = false })

  return {
    // Theme
    currentTheme,
    userTheme,
    setTheme,

    // Layout
    layout: computed(() => layout.value),
    toggleSidebar,
    setSidebarCollapsed,

    // Loading
    globalLoading: computed(() => globalLoading.value),
    pageLoading: computed(() => pageLoading.value),
    setGlobalLoading,
    setPageLoading,

    // Notifications
    notifications: computed(() => notifications.value),
    addNotification,
    removeNotification,
    clearNotifications,

    // Network
    isOnline: computed(() => isOnline.value)
  }
})