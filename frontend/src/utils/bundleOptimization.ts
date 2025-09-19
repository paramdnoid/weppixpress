/**
 * Bundle Optimization Utilities
 * Best practices: Lazy loading, tree shaking, code splitting, dynamic imports
 */

// Dynamic import utilities for code splitting
export const dynamicImports = {
  // Component lazy loading
  lazyComponent: <T = any>(factory: () => Promise<T>) => {
    return defineAsyncComponent({
      loader: factory,
      delay: 200,
      timeout: 10000,
      errorComponent: () => h('div', { class: 'error' }, 'Failed to load component'),
      loadingComponent: () => h('div', { class: 'loading' }, 'Loading...')
    })
  },

  // Route-based code splitting
  lazyRoute: (importFn: () => Promise<any>) => {
    return () => ({
      component: importFn,
      meta: { requiresAuth: false } // Default meta, can be overridden
    })
  },

  // Feature-based lazy loading
  lazyFeature: async <T>(
    featureName: string,
    importFn: () => Promise<T>
  ): Promise<T> => {
    try {
      console.debug(`Loading feature: ${featureName}`)
      const module = await importFn()
      console.debug(`Feature loaded: ${featureName}`)
      return module
    } catch (error) {
      console.error(`Failed to load feature: ${featureName}`, error)
      throw error
    }
  },

  // Conditional loading based on environment
  conditionalImport: async <T>(
    condition: boolean,
    importFn: () => Promise<T>
  ): Promise<T | null> => {
    if (!condition) return null
    return await importFn()
  }
}

// Tree shaking utilities
export const treeShaking = {
  // Import only what you need from large libraries
  optimizedLodash: {
    debounce: () => import('lodash-es/debounce'),
    throttle: () => import('lodash-es/throttle'),
    merge: () => import('lodash-es/merge'),
    cloneDeep: () => import('lodash-es/cloneDeep'),
    pick: () => import('lodash-es/pick'),
    omit: () => import('lodash-es/omit')
  },

  // Date utilities (tree-shaken)
  dateFns: {
    format: () => import('date-fns/format'),
    parseISO: () => import('date-fns/parseISO'),
    differenceInDays: () => import('date-fns/differenceInDays'),
    addDays: () => import('date-fns/addDays'),
    subDays: () => import('date-fns/subDays'),
    isValid: () => import('date-fns/isValid')
  },

  // Chart.js (tree-shaken)
  chartJs: {
    Chart: () => import('chart.js/auto'),
    plugins: {
      tooltip: () => import('chart.js/auto').then(m => m.Tooltip),
      legend: () => import('chart.js/auto').then(m => m.Legend)
    }
  }
}

// Bundle analysis utilities
export const bundleAnalysis = {
  // Measure bundle size impact
  measureImport: async <T>(
    name: string,
    importFn: () => Promise<T>
  ): Promise<T> => {
    const start = performance.now()
    const module = await importFn()
    const end = performance.now()
    console.debug(`Import ${name} took ${end - start}ms`)
    return module
  },

  // Lazy load with size tracking
  lazyLoadWithMetrics: async <T>(
    name: string,
    importFn: () => Promise<T>
  ): Promise<T> => {
    const start = performance.now()
    const startMemory = (performance as any).memory?.usedJSHeapSize || 0

    const module = await importFn()

    const end = performance.now()
    const endMemory = (performance as any).memory?.usedJSHeapSize || 0
    const memoryDiff = endMemory - startMemory

    console.debug(`Loaded ${name}:`, {
      loadTime: `${end - start}ms`,
      memoryImpact: `${(memoryDiff / 1024 / 1024).toFixed(2)}MB`
    })

    return module
  }
}

// Preloading strategies
export const preloading = {
  // Preload critical routes
  preloadRoute: (routePath: string) => {
    const link = document.createElement('link')
    link.rel = 'prefetch'
    link.href = routePath
    document.head.appendChild(link)
  },

  // Preload images
  preloadImage: (src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve()
      img.onerror = reject
      img.src = src
    })
  },

  // Preload critical CSS
  preloadCSS: (href: string) => {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'style'
    link.href = href
    link.onload = () => {
      link.rel = 'stylesheet'
    }
    document.head.appendChild(link)
  },

  // Intersection Observer for lazy loading
  createLazyLoader: (
    callback: (entry: IntersectionObserverEntry) => void,
    options: IntersectionObserverInit = {}
  ) => {
    const defaultOptions = {
      root: null,
      rootMargin: '50px',
      threshold: 0.1,
      ...options
    }

    return new IntersectionObserver((entries) => {
      entries.forEach(callback)
    }, defaultOptions)
  }
}

// Resource hints
export const resourceHints = {
  // DNS prefetch for external domains
  dnsPrefetch: (domain: string) => {
    const link = document.createElement('link')
    link.rel = 'dns-prefetch'
    link.href = domain
    document.head.appendChild(link)
  },

  // Preconnect to important origins
  preconnect: (origin: string, crossorigin = false) => {
    const link = document.createElement('link')
    link.rel = 'preconnect'
    link.href = origin
    if (crossorigin) {
      link.crossOrigin = 'anonymous'
    }
    document.head.appendChild(link)
  },

  // Module preload
  modulePreload: (href: string) => {
    const link = document.createElement('link')
    link.rel = 'modulepreload'
    link.href = href
    document.head.appendChild(link)
  }
}

// Code splitting patterns
export const codeSplitting = {
  // Feature-based splitting (placeholder - actual feature modules not implemented)
  features: {
    // admin: () => import('@/features/admin'),
    // charts: () => import('@/features/charts'),
    // fileManager: () => import('@/features/fileManager'),
    // settings: () => import('@/features/settings')
  },

  // Vendor splitting (placeholder - actual vendor modules not implemented)
  vendors: {
    // ui: () => import('@/vendors/ui'),
    // utils: () => import('@/vendors/utils'),
    // charts: () => import('@/vendors/charts')
  },

  // Page-based splitting
  pages: {
    dashboard: () => import('@/views/Dashboard.vue'),
    profile: () => import('@/views/Profile.vue'),
    settings: () => import('@/views/Settings.vue'),
    admin: () => import('@/views/admin/index.vue')
  }
}

// Performance monitoring
export const performanceMonitoring = {
  // Measure component render time
  measureRender: (componentName: string) => {
    return {
      onBeforeMount() {
        performance.mark(`${componentName}-render-start`)
      },
      onMounted() {
        performance.mark(`${componentName}-render-end`)
        performance.measure(
          `${componentName}-render`,
          `${componentName}-render-start`,
          `${componentName}-render-end`
        )
      }
    }
  },

  // Bundle loading performance
  trackBundleLoad: (bundleName: string, loadPromise: Promise<any>) => {
    const start = performance.now()
    return loadPromise.then(result => {
      const end = performance.now()
      console.debug(`Bundle ${bundleName} loaded in ${end - start}ms`)
      return result
    })
  },

  // Memory usage tracking
  trackMemoryUsage: (operationName: string) => {
    const beforeMemory = (performance as any).memory?.usedJSHeapSize || 0
    return {
      end: () => {
        const afterMemory = (performance as any).memory?.usedJSHeapSize || 0
        const diff = afterMemory - beforeMemory
        console.debug(`${operationName} memory impact: ${(diff / 1024 / 1024).toFixed(2)}MB`)
      }
    }
  }
}

// Critical resource loading
export const criticalResources = {
  // Load critical CSS inline
  loadCriticalCSS: (css: string) => {
    const style = document.createElement('style')
    style.textContent = css
    document.head.appendChild(style)
  },

  // Load non-critical CSS asynchronously
  loadNonCriticalCSS: (href: string) => {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'style'
    link.href = href
    link.onload = () => {
      link.rel = 'stylesheet'
    }
    document.head.appendChild(link)
  },

  // Progressive image loading
  progressiveImageLoad: (
    placeholder: string,
    fullSize: string,
    element: HTMLImageElement
  ) => {
    element.src = placeholder

    const img = new Image()
    img.onload = () => {
      element.src = fullSize
      element.classList.add('loaded')
    }
    img.src = fullSize
  }
}

// Web Workers for heavy computations
export const webWorkers = {
  // Create worker for heavy computations
  createComputeWorker: (workerScript: string) => {
    return new Worker(new URL(workerScript, import.meta.url))
  },

  // Offload JSON parsing to worker
  parseJSONInWorker: (jsonString: string): Promise<any> => {
    return new Promise((resolve, reject) => {
      const worker = new Worker(
        new URL('../workers/jsonParser.ts', import.meta.url)
      )

      worker.postMessage(jsonString)
      worker.onmessage = (e) => {
        resolve(e.data)
        worker.terminate()
      }
      worker.onerror = reject
    })
  }
}

import { defineAsyncComponent, h } from 'vue'