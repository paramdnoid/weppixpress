import { ref, computed, shallowRef } from 'vue';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  hits: number;
}

interface CacheOptions {
  maxAge?: number; // Max age in milliseconds
  maxSize?: number; // Max number of entries
  strategy?: 'lru' | 'lfu' | 'fifo'; // Cache eviction strategy
  persist?: boolean; // Persist to localStorage
  namespace?: string; // localStorage namespace
}

export function useCacheManager<T>(options: CacheOptions = {}) {
  const {
    maxAge = 5 * 60 * 1000, // 5 minutes default
    maxSize = 100,
    strategy = 'lru',
    persist = false,
    namespace = 'app-cache'
  } = options;

  const cache = shallowRef<Map<string, CacheEntry<T>>>(new Map());
  const accessOrder = ref<string[]>([]);

  // Load from localStorage if persist is enabled
  if (persist && typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(namespace);
      if (stored) {
        const parsed = JSON.parse(stored);
        cache.value = new Map(parsed);
      }
    } catch (error) {
      console.error('Failed to load cache from localStorage', error);
    }
  }

  // Save to localStorage
  const persistCache = () => {
    if (!persist || typeof window === 'undefined') return;

    try {
      const data = Array.from(cache.value.entries());
      localStorage.setItem(namespace, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to persist cache', error);
    }
  };

  // Get cache entry
  const get = (key: string): T | null => {
    const entry = cache.value.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > maxAge) {
      cache.value.delete(key);
      persistCache();
      return null;
    }

    // Update access order for LRU
    if (strategy === 'lru') {
      const index = accessOrder.value.indexOf(key);
      if (index > -1) {
        accessOrder.value.splice(index, 1);
      }
      accessOrder.value.push(key);
    }

    // Update hits for LFU
    if (strategy === 'lfu') {
      entry.hits++;
    }

    return entry.data;
  };

  // Set cache entry
  const set = (key: string, data: T): void => {
    // Evict if necessary
    if (cache.value.size >= maxSize && !cache.value.has(key)) {
      evict();
    }

    cache.value.set(key, {
      data,
      timestamp: Date.now(),
      hits: 1
    });

    if (strategy === 'lru') {
      accessOrder.value.push(key);
    }

    persistCache();
  };

  // Delete cache entry
  const remove = (key: string): boolean => {
    const result = cache.value.delete(key);
    
    if (strategy === 'lru') {
      const index = accessOrder.value.indexOf(key);
      if (index > -1) {
        accessOrder.value.splice(index, 1);
      }
    }

    persistCache();
    return result;
  };

  // Clear all cache
  const clear = (): void => {
    cache.value.clear();
    accessOrder.value = [];
    
    if (persist && typeof window !== 'undefined') {
      localStorage.removeItem(namespace);
    }
  };

  // Evict based on strategy
  const evict = (): void => {
    let keyToEvict: string | undefined;

    switch (strategy) {
      case 'lru':
        keyToEvict = accessOrder.value.shift();
        break;
        
      case 'lfu':
        let minHits = Infinity;
        cache.value.forEach((entry, key) => {
          if (entry.hits < minHits) {
            minHits = entry.hits;
            keyToEvict = key;
          }
        });
        break;
        
      case 'fifo':
      default:
        keyToEvict = cache.value.keys().next().value;
        break;
    }

    if (keyToEvict) {
      cache.value.delete(keyToEvict);
    }
  };

  // Invalidate entries matching pattern
  const invalidate = (pattern: string | RegExp): number => {
    let count = 0;
    const regex = typeof pattern === 'string' 
      ? new RegExp(pattern.replace(/\*/g, '.*'))
      : pattern;

    cache.value.forEach((_, key) => {
      if (regex.test(key)) {
        cache.value.delete(key);
        count++;
      }
    });

    if (count > 0) {
      persistCache();
    }

    return count;
  };

  // Get cache statistics
  const stats = computed(() => ({
    size: cache.value.size,
    maxSize,
    hitRate: calculateHitRate(),
    avgAge: calculateAvgAge(),
    memoryUsage: estimateMemoryUsage()
  }));

  // Helper: Calculate hit rate
  const calculateHitRate = (): number => {
    if (cache.value.size === 0) return 0;
    
    let totalHits = 0;
    cache.value.forEach(entry => {
      totalHits += entry.hits;
    });
    
    return totalHits / cache.value.size;
  };

  // Helper: Calculate average age
  const calculateAvgAge = (): number => {
    if (cache.value.size === 0) return 0;
    
    const now = Date.now();
    let totalAge = 0;
    
    cache.value.forEach(entry => {
      totalAge += now - entry.timestamp;
    });
    
    return totalAge / cache.value.size;
  };

  // Helper: Estimate memory usage
  const estimateMemoryUsage = (): string => {
    const jsonStr = JSON.stringify(Array.from(cache.value.entries()));
    const bytes = new Blob([jsonStr]).size;
    
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return {
    get,
    set,
    remove,
    clear,
    invalidate,
    stats
  };
}