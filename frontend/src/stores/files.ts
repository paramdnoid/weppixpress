import { defineStore } from 'pinia';
import { computed, shallowRef } from 'vue';
import type { FileItem, PaginatedResponse, FileOperation } from '@/types';
import { fileApi } from '@/api/files';
import { useCacheManager } from '@/composables/useCacheManager';
import { useWebSocket } from '@/composables/useWebSocket';

interface FileFilters {
  types: string[];
  dateRange: [Date, Date] | null;
  sizeRange: [number, number] | null;
  showHidden: boolean;
}

interface FileState {
  currentPath: string;
  items: Map<string, FileItem>;
  selectedIds: Set<string>;
  operations: FileOperation[];
  viewMode: 'grid' | 'list' | 'details';
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  filters: FileFilters;
  searchQuery: string;
  isLoading: boolean;
  error: string | null;
}


export const useFileStore = defineStore('files', () => {
  // State
  const state = shallowRef<FileState>({
    currentPath: '/',
    items: new Map(),
    selectedIds: new Set(),
    operations: [],
    viewMode: 'grid',
    sortBy: 'name',
    sortOrder: 'asc',
    filters: {
      types: [],
      dateRange: null,
      sizeRange: null,
      showHidden: false
    },
    searchQuery: '',
    isLoading: false,
    error: null
  });

  // Cache manager for file listings
  const cache = useCacheManager<PaginatedResponse<FileItem>>({
    maxAge: 5 * 60 * 1000, // 5 minutes
    maxSize: 100
  });

  // WebSocket for real-time updates
  const ws = useWebSocket('/ws/files', {
    onMessage: handleWebSocketMessage,
    reconnect: true
  });

  // Computed
  const currentItems = computed(() => {
    const items = Array.from(state.value.items.values());
const filtered = filterAndSortItems(items);
    return filtered;
  });

  const selectedItems = computed(() => {
    return Array.from(state.value.selectedIds)
      .map(id => state.value.items.get(id))
      .filter(Boolean) as FileItem[];
  });

  const breadcrumbs = computed(() => {
    const parts = state.value.currentPath.split('/').filter(Boolean);
    return [
      { name: 'Home', path: '/' },
      ...parts.map((name, i) => ({
        name,
        path: '/' + parts.slice(0, i + 1).join('/')
      }))
    ];
  });

  const hasActiveOperations = computed(() => {
    return state.value.operations.some(op => 
      op.status === 'pending' || op.status === 'processing'
    );
  });

  // Actions
  async function fetchFolderContents(path: string, options: any = {}) {
    // This function loads folder contents without changing the current navigation path
    // Used for tree loading and other non-navigation purposes
    const normalizedPath = path === '/' ? '/' : path.replace(/\/+$/, '');
    const cacheKey = `${normalizedPath}:${JSON.stringify(options)}`;
    
    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached && !options.force) {
      return cached;
    }

    try {
      const response = await fileApi.list(normalizedPath, {
        ...options,
        sortBy: state.value.sortBy,
        sortOrder: state.value.sortOrder,
        search: state.value.searchQuery
      });

      cache.set(cacheKey, response);
      return response;
    } catch (error: any) {
      console.error('Failed to fetch folder contents for:', normalizedPath, error);
      throw error;
    }
  }

  async function fetchItems(path: string = state.value.currentPath, options: any = {}) {
    // Normalize path - ensure root path is exactly '/'
    const normalizedPath = path === '/' ? '/' : path.replace(/\/+$/, '');

    const cacheKey = `${normalizedPath}:${JSON.stringify(options)}`;
    
    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached && !options.force) {
      updateItemsFromResponse(cached);
      return cached;
    }

    state.value.isLoading = true;
    state.value.error = null;

    try {
      const response = await fileApi.list(normalizedPath, {
        ...options,
        sortBy: state.value.sortBy,
        sortOrder: state.value.sortOrder,
        search: state.value.searchQuery
      });

      cache.set(cacheKey, response);
      updateItemsFromResponse(response);
      state.value.currentPath = normalizedPath;

      // Subscribe to WebSocket updates for this path
      ws.send({ type: 'subscribe', path: normalizedPath });

      return response;
    } catch (error: any) {
      state.value.error = error.message;
      throw error;
    } finally {
      state.value.isLoading = false;
    }
  }

  async function uploadFiles(files: File[], _options: any = {}) {
    const operation: FileOperation = {
      type: 'upload',
      status: 'pending',
      files: files.map(f => f.name),
      timestamp: Date.now()
    };

    state.value.operations.push(operation);

    try {
      operation.status = 'processing';
      
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
      formData.append('path', state.value.currentPath);

      const response = await fileApi.upload(formData, {
        onUploadProgress: (progress) => {
          operation.progress = Math.round((progress.loaded * 100) / progress.total);
        }
      });

      operation.status = 'completed';
      
      // Invalidate cache and refresh
      cache.invalidate(state.value.currentPath);
      await fetchItems(state.value.currentPath, { force: true });

      return response;
    } catch (error: any) {
      operation.status = 'failed';
      operation.error = error.message;
      throw error;
    }
  }

  async function deleteItems(items: FileItem[]) {
    const operation: FileOperation = {
      type: 'delete',
      status: 'processing',
      files: items.map(i => i.name),
      timestamp: Date.now()
    };

    state.value.operations.push(operation);

    try {
      await fileApi.delete(items.map(i => i.path));
      
      // Optimistic update
      items.forEach(item => {
        state.value.items.delete(item.path);
        state.value.selectedIds.delete(item.path);
      });

      operation.status = 'completed';
      
      // Invalidate cache
      cache.invalidate(state.value.currentPath);
      
      return true;
    } catch (error: any) {
      operation.status = 'failed';
      operation.error = error.message;
      
      // Revert optimistic update
      await fetchItems(state.value.currentPath, { force: true });
      throw error;
    }
  }

  async function moveItems(items: FileItem[], destination: string) {
    const operation: FileOperation = {
      type: 'move',
      status: 'processing',
      files: items.map(i => i.name),
      timestamp: Date.now()
    };

    state.value.operations.push(operation);

    try {
      await fileApi.move(items.map(i => i.path), destination);
      
      // Optimistic update
      items.forEach(item => {
        state.value.items.delete(item.path);
        state.value.selectedIds.delete(item.path);
      });

      operation.status = 'completed';
      
      // Invalidate both source and destination cache
      cache.invalidate(state.value.currentPath);
      cache.invalidate(destination);
      
      return true;
    } catch (error: any) {
      operation.status = 'failed';
      operation.error = error.message;
      
      // Revert optimistic update
      await fetchItems(state.value.currentPath, { force: true });
      throw error;
    }
  }

  // Selection management with keyboard support
  function selectItem(item: FileItem, mode: 'single' | 'toggle' | 'range' = 'single') {
    if (!item || !item.path) {
      console.warn('selectItem called with invalid item:', item);
      return;
    }
    switch (mode) {
      case 'single':
        state.value.selectedIds.clear();
        state.value.selectedIds.add(item.path);
        break;
      
      case 'toggle':
        if (state.value.selectedIds.has(item.path)) {
          state.value.selectedIds.delete(item.path);
        } else {
          state.value.selectedIds.add(item.path);
        }
        break;
      
      case 'range':
        // Implement range selection logic
        const items = currentItems.value;
        const lastSelected = Array.from(state.value.selectedIds).pop();
        if (lastSelected) {
          const startIdx = items.findIndex(i => i.path === lastSelected);
          const endIdx = items.findIndex(i => i.path === item.path);
          const [minIdx, maxIdx] = [Math.min(startIdx, endIdx), Math.max(startIdx, endIdx)];
          
          for (let i = minIdx; i <= maxIdx; i++) {
            state.value.selectedIds.add(items[i].path);
          }
        }
        break;
    }
  }

  function selectAll() {
    currentItems.value.forEach(item => {
      state.value.selectedIds.add(item.path);
    });
  }

  function clearSelection() {
    state.value.selectedIds.clear();
  }

  // Filtering and sorting
  function filterAndSortItems(items: FileItem[]): FileItem[] {
    let filtered = [...items];

    // Apply filters
    if (!state.value.filters.showHidden) {
      filtered = filtered.filter(item => !item.name.startsWith('.'));
    }

    if (state.value.filters.types.length > 0) {
      filtered = filtered.filter(item => 
        state.value.filters.types.includes(item.extension || '')
      );
    }

    if (state.value.filters.dateRange) {
      const [start, end] = state.value.filters.dateRange;
      filtered = filtered.filter(item => {
        const modified = new Date(item.modified);
        return modified >= start && modified <= end;
      });
    }

    if (state.value.searchQuery) {
      const query = state.value.searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(query)
      );
    }

    // Sort items
    const sortMultiplier = state.value.sortOrder === 'asc' ? 1 : -1;
    
    filtered.sort((a, b) => {
      // Folders always come first
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
      }

      switch (state.value.sortBy) {
        case 'size':
          return (a.size - b.size) * sortMultiplier;
        case 'modified':
          return (new Date(a.modified).getTime() - new Date(b.modified).getTime()) * sortMultiplier;
        case 'name':
        default:
          return a.name.localeCompare(b.name, undefined, { numeric: true }) * sortMultiplier;
      }
    });

    return filtered;
  }

  // WebSocket message handler
  function handleWebSocketMessage(event: MessageEvent) {
    const data = JSON.parse(event.data);
    
    switch (data.type) {
      case 'file_created':
      case 'file_updated':
        if (data.path.startsWith(state.value.currentPath)) {
          // Update single item
          state.value.items.set(data.file.path, data.file);
        }
        break;
      
      case 'file_deleted':
        state.value.items.delete(data.path);
        state.value.selectedIds.delete(data.path);
        break;
      
      case 'folder_changed':
        if (data.path === state.value.currentPath) {
          // Refresh current folder
          fetchItems(state.value.currentPath, { force: true });
        }
        break;
    }
  }

  // Helper to update items from API response
  function updateItemsFromResponse(response: PaginatedResponse<FileItem>) {
    const newItems = new Map<string, FileItem>();
    response.items.forEach(item => {
      newItems.set(item.path, item);
    });
    // Trigger reactivity by replacing the entire state object
    state.value = {
      ...state.value,
      items: newItems
    };
  }

  // Cleanup
  function cleanup() {
    ws.close();
    cache.clear();
    state.value.items.clear();
    state.value.selectedIds.clear();
    state.value.operations = [];
  }

  return {
    // State
    state,
    
    // Computed
    currentItems,
    selectedItems,
    breadcrumbs,
    hasActiveOperations,
    
    // Actions
    fetchItems,
    fetchFolderContents,
    uploadFiles,
    deleteItems,
    moveItems,
    selectItem,
    selectAll,
    clearSelection,
    cleanup
  };
});