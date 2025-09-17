import { defineStore } from 'pinia'
import { computed, shallowRef, triggerRef } from 'vue'
import type { FileItem, FileOperation, SelectionMode, SortDirection } from '@/types'
import { fileApi } from '@/api/files'
import { useWebSocket } from '@/composables/useWebSocket'
import { debounce } from 'lodash-es'

interface ClipboardData {
  operation: 'copy' | 'cut'
  items: FileItem[]
  timestamp: number
}

interface FileFilters {
  search: string
  types: string[]
  dateRange: [Date, Date] | null
  sizeRange: [number, number] | null
  showHidden: boolean
}

interface FileSorting {
  key: string
  order: SortDirection
}

interface FileState {
  // Navigation
  currentPath: string
  navigationHistory: string[]

  // Data
  items: Map<string, FileItem>
  treeCache: Map<string, FileItem[]>

  // Selection
  selectedIds: Set<string>
  lastSelectedId: string | null

  // Clipboard
  clipboard: ClipboardData | null

  // Operations
  operations: FileOperation[]

  // UI preferences (persisted)
  viewMode: 'grid' | 'list' | 'details'

  // Sorting & Filtering
  sorting: FileSorting
  filters: FileFilters

  // Loading states
  isLoading: boolean
  isNavigating: boolean
  error: string | null
  
  // Navigation queue
  navigationQueue: Array<{ path: string; forceRefresh: boolean; resolve: (value: any) => void; reject: (error: any) => void }>

  // Extended for caching, virtual scroll, performance metrics
  cache: Map<string, { items: FileItem[]; timestamp: number; totalCount: number; page: number }>
  virtualScroll: { startIndex: number; endIndex: number; buffer: number }
  performanceMetrics: { totalRequests: number; cacheHits: number; avgResponseTime: number }
  
  // WebSocket state
  lastNavigationAt: number
  wsConnected: boolean
  wsReconnectAttempts: number
}

export const useFileStore = defineStore('files', () => {
  // ===== STATE =====
  const state = shallowRef<FileState>({
    currentPath: '/',
    navigationHistory: ['/'],
    items: new Map(),
    treeCache: new Map(),
    selectedIds: new Set(),
    lastSelectedId: null,
    clipboard: null,
    operations: [],
    viewMode: 'grid',
    sorting: {
      key: 'name',
      order: 'asc'
    },
    filters: {
      search: '',
      types: [],
      dateRange: null,
      sizeRange: null,
      showHidden: false
    },
    isLoading: false,
    isNavigating: false,
    error: null,
    navigationQueue: [],
    cache: new Map(),
    virtualScroll: { startIndex: 0, endIndex: 99, buffer: 20 },
    performanceMetrics: { totalRequests: 0, cacheHits: 0, avgResponseTime: 0 },
    lastNavigationAt: 0,
    wsConnected: false,
    wsReconnectAttempts: 0,
  })

  // Deduplicate concurrent page loads per path+page
  const inflightLoads = new Map<string, Promise<{ items: FileItem[]; totalCount: number; page: number }>>()

  // ===== WEBSOCKET SETUP =====
  const { isConnected, send: wsSend, lastError } = useWebSocket('/ws', {
    onMessage: handleWebSocketMessage,
    onOpen: handleWebSocketOpen,
    onClose: handleWebSocketClose,
    onError: handleWebSocketError,
    reconnect: true,
    reconnectInterval: 3000,
    maxReconnectAttempts: 10
  })

  // ===== WEBSOCKET HANDLERS =====
  function handleWebSocketOpen(_event: Event) {
    state.value.wsConnected = true
    state.value.wsReconnectAttempts = 0
    state.value = { ...state.value }
    
    // Subscribe to current path
    subscribeToPath(state.value.currentPath)
  }

  function handleWebSocketClose(_event: CloseEvent) {
    state.value.wsConnected = false
    state.value = { ...state.value }
  }

  function handleWebSocketError(event: Event) {
    console.error('WebSocket error:', event)
    state.value.wsReconnectAttempts++
    state.value = { ...state.value }
  }

  function handleWebSocketMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data)

      switch (data.type) {
        case 'welcome':
          break

        case 'subscribed':
          break

        case 'unsubscribed':
          break

        case 'file_created':
          handleFileCreated(data)
          break

        case 'file_updated':
          handleFileUpdated(data)
          break

        case 'file_deleted':
          handleFileDeleted(data)
          break

        case 'folder_changed':
          handleFolderChanged(data)
          break

        case 'error':
          console.error('WebSocket error message:', data.message)
          break

        case 'pong':
          // Handle ping/pong for connection health
          break

        default:
          console.warn('Unknown WebSocket message type:', data.type)
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error)
    }
  }

  function subscribeToPath(path: string) {
    const normalizedPath = normalizePath(path)
    wsSend({
      type: 'subscribe',
      path: normalizedPath
    })
  }

  function unsubscribeFromPath(path: string) {
    const normalizedPath = normalizePath(path)
    wsSend({
      type: 'unsubscribe', 
      path: normalizedPath
    })
  }

  // ===== WEBSOCKET EVENT HANDLERS =====
  function handleFileCreated(data: any) {
    if (!data.file) return

    const file = data.file as FileItem
    // Normalize path to ensure leading slash
    file.path = normalizePath((file as any).path)
    const parentPath = getParentPath(file.path)
    
    // Only update if the file is in current view or affects current navigation
    if (parentPath === state.value.currentPath || file.path.startsWith(state.value.currentPath + '/')) {
      // Add to items if in current folder
      if (parentPath === state.value.currentPath) {
        state.value.items.set(file.path, file)
        state.value = { ...state.value }
      }
      
      // Invalidate relevant cache entries
      invalidateCache(parentPath)
      
      // Clear tree cache for affected path
      state.value.treeCache.delete(parentPath)

      // Notify sidebar tree to reorganize/refresh
      setTimeout(() => {
        const treeRoot = document.getElementById('menu')
        if (treeRoot) {
          const event = new CustomEvent('tree:reorganize', {
            detail: { targetPath: parentPath }
          })
          treeRoot.dispatchEvent(event)
        }
      }, 50)
    }
  }

  function handleFileUpdated(data: any) {
    if (!data.file) return

    const file = data.file as FileItem
    const parentPath = getParentPath(file.path)
    
    // Update if file is in current items
    if (state.value.items.has(file.path)) {
      state.value.items.set(file.path, file)
      state.value = { ...state.value }
    }
    
    // Invalidate cache
    invalidateCache(parentPath)
    
  }

  function handleFileDeleted(data: any) {
    if (!data.path) return

    const filePath = data.path as string
    const parentPath = getParentPath(filePath)
    
    // Remove from items and selection
    state.value.items.delete(filePath)
    state.value.selectedIds.delete(filePath)
    
    if (state.value.lastSelectedId === filePath) {
      state.value.lastSelectedId = null
    }
    
    // Invalidate cache
    invalidateCache(parentPath)
    
    // Clear tree cache
    state.value.treeCache.delete(parentPath)
    
    state.value = { ...state.value }
    
    // Trigger tree reorganization for sidebar update
    setTimeout(() => {
      const treeRoot = document.getElementById('menu')
      if (treeRoot) {
        const event = new CustomEvent('tree:reorganize', {
          detail: { targetPath: parentPath }
        })
        treeRoot.dispatchEvent(event)
      }
    }, 100)
    
  }

  function handleFolderChanged(data: any) {
    if (!data.path) return

    const folderPath = data.path as string
    const normalizedPath = normalizePath(folderPath)
    
    // Ignore changes that happened too soon after navigation (avoid refresh loops)
    // Reduced from 1000ms to 200ms to allow quicker updates while preventing loops
    const timeSinceNavigation = Date.now() - state.value.lastNavigationAt
    if (timeSinceNavigation < 200) {
      return
    }

    // Ignore if currently loading or navigating
    if (state.value.isLoading || state.value.isNavigating) {
      return
    }

    // Refresh if it's the current path
    if (normalizedPath === state.value.currentPath) {
      refreshCurrentPath()
    }

    // Invalidate cache for changed folder
    invalidateCache(normalizedPath)
    state.value.treeCache.delete(normalizedPath)

    // Notify sidebar to update the affected node
    setTimeout(() => {
      const treeRoot = document.getElementById('menu')
      if (treeRoot) {
        const event = new CustomEvent('tree:reorganize', {
          detail: { targetPath: normalizedPath }
        })
        treeRoot.dispatchEvent(event)
      }
    }, 50)
  }

  // ===== COMPUTED =====
  const currentItems = computed(() => {
    const items = Array.from(state.value.items.values())
    return filterAndSortItems(items)
  })

  const selectedItems = computed(() => {
    return Array.from(state.value.selectedIds)
      .map(id => state.value.items.get(id))
      .filter(Boolean) as FileItem[]
  })

  const breadcrumbs = computed(() => {
    const parts = state.value.currentPath.split('/').filter(Boolean)
    return [
      { name: 'Home', path: '/', isClickable: true },
      ...parts.map((name, i) => ({
        name,
        path: '/' + parts.slice(0, i + 1).join('/'),
        isClickable: true
      }))
    ]
  })

  const hasClipboard = computed(() => state.value.clipboard !== null)

  const clipboardInfo = computed(() => {
    if (!state.value.clipboard) return null
    return {
      operation: state.value.clipboard.operation,
      count: state.value.clipboard.items.length,
      totalSize: state.value.clipboard.items.reduce((sum, item) => sum + (item.size || 0), 0)
    }
  })

  const canPaste = computed(() => {
    if (!state.value.clipboard) return false
    return !state.value.clipboard.items.some(item =>
      item.path === state.value.currentPath ||
      state.value.currentPath.startsWith(item.path + '/')
    )
  })

  const hasActiveOperations = computed(() => {
    return state.value.operations.some(op =>
      op.status === 'pending' || op.status === 'processing'
    )
  })

  // ===== NAVIGATION =====
  async function processNavigationQueue() {
    if (state.value.isNavigating || state.value.navigationQueue.length === 0) {
      return
    }
    
    const nextNavigation = state.value.navigationQueue.shift()!
    
    try {
      const result = await performNavigation(nextNavigation.path, nextNavigation.forceRefresh)
      nextNavigation.resolve(result)
    } catch (error) {
      nextNavigation.reject(error)
    }
    
    // Process next item in queue
    if (state.value.navigationQueue.length > 0) {
      setTimeout(processNavigationQueue, 0)
    }
  }
  
  async function navigateToPath(path: string | FileItem, forceRefresh = false): Promise<any> {
    const targetPath = typeof path === 'string' ? path : path.path
    const normalizedPath = normalizePath(targetPath)

    // If already at this path and not forcing refresh, return early
    if (state.value.currentPath === normalizedPath && !forceRefresh) {
      return
    }
    
    // If currently navigating, queue this request
    if (state.value.isNavigating) {
      return new Promise((resolve, reject) => {
        state.value.navigationQueue.push({
          path: normalizedPath,
          forceRefresh,
          resolve,
          reject
        })
      })
    }
    
    // Execute immediately
    return performNavigation(normalizedPath, forceRefresh)
  }
  
  async function performNavigation(path: string, forceRefresh: boolean) {
    const normalizedPath = normalizePath(path)

    if (state.value.currentPath === normalizedPath && !forceRefresh) {
      return
    }


    state.value.isNavigating = true
    state.value.isLoading = true
    state.value.error = null

    try {
      // Unsubscribe from old path
      if (state.value.currentPath !== normalizedPath) {
        unsubscribeFromPath(state.value.currentPath)
      }

      // Record navigation timestamp
      state.value.lastNavigationAt = Date.now()

      // Load new path
      const response = await loadPage(normalizedPath, 1, false, forceRefresh)

      // Update navigation state
      state.value.currentPath = normalizedPath

      // Subscribe to new path
      subscribeToPath(normalizedPath)

      // Trigger reactivity
      triggerRef(state)

      // Update history
      const lastHistory = state.value.navigationHistory[state.value.navigationHistory.length - 1]
      if (lastHistory !== normalizedPath) {
        state.value.navigationHistory.push(normalizedPath)
        if (state.value.navigationHistory.length > 50) {
          state.value.navigationHistory.shift()
        }
      }

      // Clear selection
      clearSelection()

      return response
    } catch (error: any) {
      const errorMessage = error.response?.status === 401
        ? 'Authentication required. Please log in to access files.'
        : error.response?.data?.message || error.message || 'Navigation failed'
      state.value.error = errorMessage
      throw error
    } finally {
      state.value.isLoading = false
      state.value.isNavigating = false
      state.value.lastNavigationAt = Date.now()
      
      // Process any queued navigation requests
      setTimeout(processNavigationQueue, 0)
    }
  }

  // ===== CACHE MANAGEMENT =====
  function invalidateCache(path: string) {
    const normalizedPath = normalizePath(path)
    
    // Remove all cache entries for this path (all pages)
    for (const [key] of state.value.cache) {
      if (key.startsWith(`${normalizedPath}::`)) {
        state.value.cache.delete(key)
      }
    }
  }

  // ===== PAGINATED LOADING =====
  async function loadPage(path: string, page: number, append = false, forceRefresh = false) {
    const normalizedPath = normalizePath(path)
    const cacheKey = `${normalizedPath}::${page}`
    const metrics = state.value.performanceMetrics
    metrics.totalRequests++
    const startTime = performance.now()

    // Check cache (unless force refresh is requested)
    if (!forceRefresh && state.value.cache.has(cacheKey)) {
      metrics.cacheHits++
      const cached = state.value.cache.get(cacheKey)!
      
      if (!append) {
        const newItems = new Map<string, FileItem>()
        cached.items.forEach(item => newItems.set(item.path, item))
        state.value.items = newItems
        state.value = { ...state.value }
      }
      
      const elapsed = performance.now() - startTime
      metrics.avgResponseTime = metrics.avgResponseTime === 0 ? elapsed : (metrics.avgResponseTime * (metrics.totalRequests - 1) + elapsed) / metrics.totalRequests
      return { items: cached.items, totalCount: cached.totalCount, page: cached.page }
    }

    // Deduplicate concurrent loads
    if (inflightLoads.has(cacheKey)) {
      return inflightLoads.get(cacheKey)!
    }

    // Fetch from API
    const promise = (async () => {
      try {
        const response: any = await fileApi.list(normalizedPath, {
          page,
          limit: 100,
          sortBy: state.value.sorting.key,
          sortOrder: state.value.sorting.order,
          search: state.value.filters.search,
          forceRefresh: forceRefresh ? 'true' : undefined
        })

        const totalCount = typeof response.total === 'number'
          ? response.total
          : typeof response.totalCount === 'number'
            ? response.totalCount
            : Array.isArray(response.items) ? response.items.length : 0

        // Cache response
        state.value.cache.set(cacheKey, {
          items: response.items ?? [],
          timestamp: Date.now(),
          totalCount,
          page
        })

        // Update items
        if (append) {
          const merged = new Map(state.value.items)
          ;(response.items ?? []).forEach((item: FileItem) => merged.set(item.path, item))
          state.value.items = merged
        } else {
          const newItems = new Map<string, FileItem>()
          ;(response.items ?? []).forEach((item: FileItem) => newItems.set(item.path, item))
          state.value.items = newItems
        }
        
        state.value = { ...state.value }

        const elapsed = performance.now() - startTime
        metrics.avgResponseTime = metrics.avgResponseTime === 0 ? elapsed : (metrics.avgResponseTime * (metrics.totalRequests - 1) + elapsed) / metrics.totalRequests
        return { items: response.items ?? [], totalCount, page }
      } catch (error: any) {
        const elapsed = performance.now() - startTime
        metrics.avgResponseTime = metrics.avgResponseTime === 0 ? elapsed : (metrics.avgResponseTime * (metrics.totalRequests - 1) + elapsed) / metrics.totalRequests
        throw error
      }
    })()

    inflightLoads.set(cacheKey, promise)
    try {
      return await promise
    } finally {
      inflightLoads.delete(cacheKey)
    }
  }

  // ===== UTILITY FUNCTIONS =====
  function normalizePath(path: string): string {
    if (!path || path === '/') return '/'
    const normalized = path.replace(/\/+$/, '')
    return normalized.startsWith('/') ? normalized : '/' + normalized
  }

  function getParentPath(filePath: string): string {
    const parts = filePath.split('/')
    parts.pop()
    return parts.join('/') || '/'
  }

  function filterAndSortItems(items: FileItem[]): FileItem[] {
    let filtered = [...items]

    if (state.value.filters.types.length > 0) {
      filtered = filtered.filter(item =>
        state.value.filters.types.includes(item.extension || '')
      )
    }

    if (state.value.filters.dateRange) {
      const [start, end] = state.value.filters.dateRange
      filtered = filtered.filter(item => {
        const modified = new Date(item.modified || item.created || 0)
        return modified >= start && modified <= end
      })
    }

    if (state.value.filters.search) {
      const query = state.value.filters.search.toLowerCase()
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(query)
      )
    }

    // Sort items
    const sortMultiplier = state.value.sorting.order === 'asc' ? 1 : -1

    filtered.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1
      }

      switch (state.value.sorting.key) {
        case 'size': {
          const aSize = toBytes((a as unknown as { size?: unknown }).size)
          const bSize = toBytes((b as unknown as { size?: unknown }).size)
          return (aSize - bSize) * sortMultiplier
        }
        case 'modified': {
          const aTime = new Date(a.modified || a.created || 0).getTime()
          const bTime = new Date(b.modified || b.created || 0).getTime()
          return (aTime - bTime) * sortMultiplier
        }
        case 'extension': {
          const extA = a.extension || ''
          const extB = b.extension || ''
          return extA.localeCompare(extB) * sortMultiplier
        }
        case 'name':
        default:
          return a.name.localeCompare(b.name, undefined, { numeric: true }) * sortMultiplier
      }
    })

    return filtered
  }

  function toBytes(size: unknown): number {
    if (typeof size === 'number' && Number.isFinite(size)) return size
    if (typeof size === 'string') {
      const s = size.trim()
      const m = /^([0-9]+(?:\.[0-9]+)?)\s*(B|KB|MB|GB|TB)?$/i.exec(s)
      if (m) {
        const n = parseFloat(m[1])
        const unit = (m[2] || 'B').toUpperCase()
        const mult: Record<string, number> = { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4 }
        return n * (mult[unit] || 1)
      }
      const fallback = Number(s.replace(/[^0-9.]/g, ''))
      if (Number.isFinite(fallback)) return fallback
    }
    return Number.POSITIVE_INFINITY
  }

  // ===== REST OF STORE FUNCTIONS =====
  async function navigateUp() {
    const parts = state.value.currentPath.split('/').filter(Boolean)
    if (parts.length > 0) {
      parts.pop()
      const parentPath = '/' + parts.join('/')
      return navigateToPath(parentPath)
    }
  }

  async function navigateBack() {
    if (state.value.navigationHistory.length > 1) {
      state.value.navigationHistory.pop()
      const previousPath = state.value.navigationHistory[state.value.navigationHistory.length - 1]
      return navigateToPath(previousPath)
    }
  }

  async function loadFolderContents(path: string, useCache = true): Promise<FileItem[]> {
    const normalizedPath = normalizePath(path)
    const cached = state.value.cache.get(`${normalizedPath}::1`)
    
    if (useCache && cached) {
      if (!state.value.treeCache.has(normalizedPath)) {
        state.value.treeCache.set(normalizedPath, cached.items)
      }
      return cached.items
    }

    try {
      const response = await fileApi.list(normalizedPath, {
        sortBy: 'name',
        sortOrder: 'asc',
        limit: 1000,
        forceRefresh: !useCache ? 'true' : undefined
      })

      state.value.treeCache.set(normalizedPath, response.items)
      return response.items
    } catch (error: any) {
      console.error('Failed to load folder contents:', normalizedPath, error)
      if (error.response?.status === 401) {
        state.value.error = 'Authentication required. Please log in to access files.'
      }
      throw error
    }
  }

  function refreshCurrentPath() {
    return navigateToPath(state.value.currentPath, true)
  }

  // ===== SELECTION =====
  function selectItem(item: FileItem, mode: SelectionMode = 'single') {
    if (!item || !item.path) {
      console.warn('selectItem: Invalid item', item)
      return
    }

    const itemId = item.path

    switch (mode) {
      case 'single':
        state.value.selectedIds.clear()
        state.value.selectedIds.add(itemId)
        state.value.lastSelectedId = itemId
        break

      case 'toggle':
        if (state.value.selectedIds.has(itemId)) {
          state.value.selectedIds.delete(itemId)
          if (state.value.lastSelectedId === itemId) {
            state.value.lastSelectedId = null
          }
        } else {
          state.value.selectedIds.add(itemId)
          state.value.lastSelectedId = itemId
        }
        break

      case 'range':
        if (state.value.lastSelectedId) {
          selectItemsInRange(state.value.lastSelectedId, itemId)
        } else {
          state.value.selectedIds.add(itemId)
          state.value.lastSelectedId = itemId
        }
        break
    }

    state.value = { ...state.value }
  }

  function selectItemsInRange(fromId: string, toId: string) {
    const items = currentItems.value
    const fromIndex = items.findIndex(i => i.path === fromId)
    const toIndex = items.findIndex(i => i.path === toId)

    if (fromIndex === -1 || toIndex === -1) return

    const [start, end] = fromIndex < toIndex ? [fromIndex, toIndex] : [toIndex, fromIndex]

    for (let i = start; i <= end; i++) {
      state.value.selectedIds.add(items[i].path)
    }
  }

  function selectAll() {
    currentItems.value.forEach(item => {
      state.value.selectedIds.add(item.path)
    })
    state.value = { ...state.value }
  }

  function clearSelection() {
    state.value.selectedIds.clear()
    state.value.lastSelectedId = null
    state.value = { ...state.value }
  }

  function invertSelection() {
    const newSelection = new Set<string>()
    currentItems.value.forEach(item => {
      if (!state.value.selectedIds.has(item.path)) {
        newSelection.add(item.path)
      }
    })
    state.value.selectedIds = newSelection
    state.value = { ...state.value }
  }

  // ===== CLIPBOARD =====
  function copyItems(items?: FileItem[]) {
    const itemsToCopy = items || selectedItems.value
    if (itemsToCopy.length === 0) return

    state.value.clipboard = {
      operation: 'copy',
      items: [...itemsToCopy],
      timestamp: Date.now()
    }
    state.value = { ...state.value }
  }

  function cutItems(items?: FileItem[]) {
    const itemsToCut = items || selectedItems.value
    if (itemsToCut.length === 0) return

    state.value.clipboard = {
      operation: 'cut',
      items: [...itemsToCut],
      timestamp: Date.now()
    }
    state.value = { ...state.value }
  }

  async function pasteItems(destination?: string) {
    if (!state.value.clipboard) return

    const targetPath = destination || state.value.currentPath
    const { operation, items } = state.value.clipboard

    const fileOperation: FileOperation = {
      type: operation === 'cut' ? 'move' : 'copy',
      status: 'processing',
      files: items.map(i => i.name),
      timestamp: Date.now()
    }

    state.value.operations.push(fileOperation)

    try {
      if (operation === 'cut') {
        await fileApi.move(items.map(i => i.path), targetPath)
        state.value.clipboard = null
      } else {
        await fileApi.copy(items.map(i => i.path), targetPath)
      }

      fileOperation.status = 'completed'
      
      // Invalidate cache for all affected paths
      invalidateCache(targetPath)
      items.forEach(item => {
        const parentPath = getParentPath(item.path)
        invalidateCache(parentPath)
      })
      
      // Force refresh to show the pasted items
      await refreshCurrentPath()

    } catch (error: any) {
      fileOperation.status = 'failed'
      fileOperation.error = error.message
      throw error
    }
  }

  function clearClipboard() {
    state.value.clipboard = null
    state.value = { ...state.value }
  }

  // ===== FILE OPERATIONS =====

  async function deleteItems(items?: FileItem[]) {
    const itemsToDelete = items || selectedItems.value
    if (itemsToDelete.length === 0) return

    const operation: FileOperation = {
      type: 'delete',
      status: 'processing',
      files: itemsToDelete.map(i => i.name),
      timestamp: Date.now()
    }

    state.value.operations.push(operation)

    try {
      await fileApi.delete(itemsToDelete.map(i => i.path))

      // Optimistic update
      itemsToDelete.forEach(item => {
        state.value.items.delete(item.path)
        state.value.selectedIds.delete(item.path)
        const parentPath = getParentPath(item.path)
        invalidateCache(parentPath)
        
        // Clear tree cache for parent path
        state.value.treeCache.delete(parentPath)
        
        // If deleting a folder, also clear its own tree cache
        if (item.type === 'folder') {
          state.value.treeCache.delete(item.path)
        }
      })

      operation.status = 'completed'
      state.value = { ...state.value }
      
      // Force refresh to ensure UI reflects actual server state
      await refreshCurrentPath()
      return true
    } catch (error: any) {
      operation.status = 'failed'
      operation.error = error.message
      await refreshCurrentPath()
      throw error
    }
  }

  async function renameItem(item: FileItem, newName: string) {
    if (!item || !newName || item.name === newName) return

    const operation: FileOperation = {
      type: 'rename',
      status: 'processing',
      files: [item.name],
      timestamp: Date.now()
    }

    state.value.operations.push(operation)

    try {
      await fileApi.rename(item.path, newName)
      operation.status = 'completed'
      const parentPath = getParentPath(item.path)
      invalidateCache(parentPath)
      await refreshCurrentPath()
    } catch (error: any) {
      operation.status = 'failed'
      operation.error = error.message
      throw error
    }
  }

  async function createFolder(name: string, path?: string) {
    const targetPath = path || state.value.currentPath

    const operation: FileOperation = {
      type: 'create',
      status: 'processing',
      files: [name],
      timestamp: Date.now()
    }

    state.value.operations.push(operation)

    try {
      await fileApi.createFolder(name, targetPath)
      operation.status = 'completed'
      
      // Invalidate cache and force refresh to show new folder
      invalidateCache(targetPath)
      await refreshCurrentPath()
    } catch (error: any) {
      operation.status = 'failed'
      operation.error = error.message
      throw error
    }
  }

  // ===== SORTING & FILTERING =====
  function setSorting(key: string, order?: SortDirection) {
    if (state.value.sorting.key === key && !order) {
      state.value.sorting.order = state.value.sorting.order === 'asc' ? 'desc' : 'asc'
    } else {
      state.value.sorting.key = key
      state.value.sorting.order = order || 'asc'
    }
    refreshCurrentPath()
  }

  const debouncedSearch = debounce((query: string) => {
    state.value.filters.search = query
    refreshCurrentPath()
  }, 300)

  function setSearch(query: string) {
    debouncedSearch(query)
  }

  function setFilter(key: keyof FileFilters, value: any) {
    (state.value.filters as any)[key] = value
    state.value = { ...state.value }
  }

  function clearFilters() {
    state.value.filters = {
      search: '',
      types: [],
      dateRange: null,
      sizeRange: null,
      showHidden: false
    }
    refreshCurrentPath()
  }

  // ===== INITIALIZATION & CLEANUP =====
  function initialize() {
    const savedViewMode = localStorage.getItem('fileManager.viewMode')
    if (savedViewMode === 'grid' || savedViewMode === 'list' || savedViewMode === 'details') {
      state.value.viewMode = savedViewMode
    }

    const savedSorting = localStorage.getItem('fileManager.sorting')
    if (savedSorting) {
      try {
        const sorting = JSON.parse(savedSorting)
        state.value.sorting = sorting
      } catch (e) {
        console.error('Failed to parse saved sorting:', e)
      }
    }
  }

  function cleanup() {
    state.value.items.clear()
    state.value.selectedIds.clear()
    state.value.treeCache.clear()
    state.value.operations = []
    state.value.clipboard = null
    state.value.error = null
    state.value.cache.clear()
    state.value.performanceMetrics = { totalRequests: 0, cacheHits: 0, avgResponseTime: 0 }
  }

  function clearOperationHistory() {
    state.value.operations = state.value.operations.filter(op =>
      op.status === 'processing' || op.status === 'pending'
    )
    state.value = { ...state.value }
  }

  function getOperationsByType(type: FileOperation['type']) {
    return state.value.operations.filter(op => op.type === type)
  }

  // ===== REST OF API FUNCTIONS =====
  async function batchOperation(paths: string[], operation: (path: string) => Promise<any>) {
    const ops: FileOperation[] = []
    const promises = paths.map(path => {
      const op: FileOperation = {
        type: 'batch',
        status: 'pending',
        files: [path],
        timestamp: Date.now()
      }
      ops.push(op)
      state.value.operations.push(op)
      return operation(path)
        .then(result => {
          op.status = 'completed'
          return result
        })
        .catch(error => {
          op.status = 'failed'
          op.error = error?.message || String(error)
          throw error
        })
    })
    const results = await Promise.allSettled(promises)
    state.value = { ...state.value }
    return results
  }

  function updateVirtualScroll(startIndex: number, endIndex: number) {
    state.value.virtualScroll.startIndex = startIndex
    state.value.virtualScroll.endIndex = endIndex
    state.value = { ...state.value }
  }

  // Initialize on store creation
  initialize()

  // ===== PUBLIC API =====
  return {
    // State
    state,

    // Computed
    currentItems,
    selectedItems,
    breadcrumbs,
    hasClipboard,
    clipboardInfo,
    canPaste,
    hasActiveOperations,

    // WebSocket state
    isConnected,
    lastError,

    // Navigation
    navigateToPath,
    navigateUp,
    navigateBack,
    loadFolderContents,
    refreshCurrentPath,

    // Selection
    selectItem,
    selectItemsInRange,
    selectAll,
    clearSelection,
    invertSelection,

    // Clipboard
    copyItems,
    cutItems,
    pasteItems,
    clearClipboard,

    // File Operations
    deleteItems,
    renameItem,
    createFolder,

    // Sorting & Filtering
    setSorting,
    setSearch,
    setFilter,
    clearFilters,

    // Utilities
    clearOperationHistory,
    getOperationsByType,
    cleanup,

    // New API
    loadPage,
    batchOperation,
    updateVirtualScroll,
    performanceMetrics: computed(() => state.value.performanceMetrics),

    // WebSocket utilities
    subscribeToPath,
    unsubscribeFromPath
  }
})
