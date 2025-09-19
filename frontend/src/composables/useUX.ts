/**
 * User Experience Composables
 * Best practices: Loading states, error handling, feedback, animations, gestures
 */

import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useEventListener } from '@vueuse/core'
import { debounce, throttle } from '@/utils/performance'

// Loading states management
export function useLoadingStates() {
  const loadingStates = ref<Record<string, boolean>>({})
  const globalLoading = ref(false)

  const setLoading = (key: string, loading: boolean) => {
    loadingStates.value[key] = loading
    updateGlobalLoading()
  }

  const isLoading = (key: string) => computed(() => loadingStates.value[key] || false)

  const updateGlobalLoading = () => {
    globalLoading.value = Object.values(loadingStates.value).some(loading => loading)
  }

  const clearLoading = (key: string) => {
    delete loadingStates.value[key]
    updateGlobalLoading()
  }

  const clearAllLoading = () => {
    loadingStates.value = {}
    globalLoading.value = false
  }

  return {
    loadingStates: computed(() => loadingStates.value),
    globalLoading: computed(() => globalLoading.value),
    setLoading,
    isLoading,
    clearLoading,
    clearAllLoading
  }
}

// Toast notifications
export function useToast() {
  const toasts = ref<Array<{
    id: string
    type: 'success' | 'error' | 'warning' | 'info'
    title: string
    message?: string
    duration?: number
    persistent?: boolean
    actions?: Array<{ label: string; action: () => void }>
    timestamp: number
  }>>([])

  let toastIdCounter = 0

  const addToast = (toast: Omit<typeof toasts.value[0], 'id' | 'timestamp'>) => {
    const id = `toast-${++toastIdCounter}`
    const newToast = {
      ...toast,
      id,
      timestamp: Date.now()
    }

    toasts.value.push(newToast)

    // Auto-remove non-persistent toasts
    if (!toast.persistent) {
      setTimeout(() => {
        removeToast(id)
      }, toast.duration || 5000)
    }

    return id
  }

  const removeToast = (id: string) => {
    const index = toasts.value.findIndex(toast => toast.id === id)
    if (index > -1) {
      toasts.value.splice(index, 1)
    }
  }

  const clearToasts = () => {
    toasts.value = []
  }

  const success = (title: string, message?: string, options?: Partial<typeof toasts.value[0]>) => {
    return addToast({ type: 'success', title, message, ...options })
  }

  const error = (title: string, message?: string, options?: Partial<typeof toasts.value[0]>) => {
    return addToast({ type: 'error', title, message, ...options })
  }

  const warning = (title: string, message?: string, options?: Partial<typeof toasts.value[0]>) => {
    return addToast({ type: 'warning', title, message, ...options })
  }

  const info = (title: string, message?: string, options?: Partial<typeof toasts.value[0]>) => {
    return addToast({ type: 'info', title, message, ...options })
  }

  return {
    toasts: computed(() => toasts.value),
    addToast,
    removeToast,
    clearToasts,
    success,
    error,
    warning,
    info
  }
}

// Smooth scrolling and scroll management
export function useScroll() {
  const scrollPosition = ref(0)
  const isScrolling = ref(false)
  const scrollDirection = ref<'up' | 'down' | null>(null)

  let scrollTimeout: ReturnType<typeof setTimeout>
  let lastScrollTop = 0

  const updateScrollPosition = throttle(() => {
    const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop

    scrollPosition.value = currentScrollTop
    scrollDirection.value = currentScrollTop > lastScrollTop ? 'down' : 'up'
    lastScrollTop = currentScrollTop

    isScrolling.value = true

    clearTimeout(scrollTimeout)
    scrollTimeout = setTimeout(() => {
      isScrolling.value = false
    }, 150)
  }, 16) // ~60fps

  const scrollTo = (target: number | HTMLElement, options?: ScrollIntoViewOptions) => {
    if (typeof target === 'number') {
      window.scrollTo({
        top: target,
        behavior: 'smooth',
        ...options
      })
    } else {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        ...options
      })
    }
  }

  const scrollToTop = () => {
    scrollTo(0)
  }

  const scrollToBottom = () => {
    scrollTo(document.documentElement.scrollHeight)
  }

  useEventListener('scroll', updateScrollPosition)

  return {
    scrollPosition: computed(() => scrollPosition.value),
    isScrolling: computed(() => isScrolling.value),
    scrollDirection: computed(() => scrollDirection.value),
    scrollTo,
    scrollToTop,
    scrollToBottom
  }
}

// Intersection observer for visibility
export function useIntersectionObserver(
  target: Ref<HTMLElement | null>,
  callback: (entry: IntersectionObserverEntry) => void,
  options: IntersectionObserverInit = {}
) {
  const isIntersecting = ref(false)
  const observer = ref<IntersectionObserver | null>(null)

  const defaultOptions = {
    threshold: 0.1,
    rootMargin: '0px',
    ...options
  }

  const createObserver = () => {
    if (!target.value) return

    observer.value = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isIntersecting.value = entry.isIntersecting
          callback(entry)
        })
      },
      defaultOptions
    )

    observer.value.observe(target.value)
  }

  const stopObserver = () => {
    if (observer.value) {
      observer.value.disconnect()
      observer.value = null
    }
  }

  watch(target, (newTarget) => {
    stopObserver()
    if (newTarget) {
      nextTick(createObserver)
    }
  }, { immediate: true })

  onUnmounted(stopObserver)

  return {
    isIntersecting: computed(() => isIntersecting.value),
    stop: stopObserver
  }
}

// Form validation and feedback
export function useFormFeedback() {
  const formErrors = ref<Record<string, string[]>>({})
  const formWarnings = ref<Record<string, string[]>>({})
  const touchedFields = ref<Set<string>>(new Set())

  const setFieldError = (field: string, errors: string | string[]) => {
    formErrors.value[field] = Array.isArray(errors) ? errors : [errors]
  }

  const clearFieldError = (field: string) => {
    delete formErrors.value[field]
  }

  const setFieldWarning = (field: string, warnings: string | string[]) => {
    formWarnings.value[field] = Array.isArray(warnings) ? warnings : [warnings]
  }

  const clearFieldWarning = (field: string) => {
    delete formWarnings.value[field]
  }

  const setFieldTouched = (field: string) => {
    touchedFields.value.add(field)
  }

  const isFieldTouched = (field: string) => computed(() => touchedFields.value.has(field))

  const hasFieldError = (field: string) => computed(() =>
    isFieldTouched(field).value && (formErrors.value[field]?.length || 0) > 0
  )

  const hasFieldWarning = (field: string) => computed(() =>
    isFieldTouched(field).value && (formWarnings.value[field]?.length || 0) > 0
  )

  const getFieldErrors = (field: string) => computed(() => formErrors.value[field] || [])
  const getFieldWarnings = (field: string) => computed(() => formWarnings.value[field] || [])

  const hasErrors = computed(() => Object.keys(formErrors.value).length > 0)
  const hasWarnings = computed(() => Object.keys(formWarnings.value).length > 0)

  const clearAll = () => {
    formErrors.value = {}
    formWarnings.value = {}
    touchedFields.value.clear()
  }

  return {
    formErrors: computed(() => formErrors.value),
    formWarnings: computed(() => formWarnings.value),
    touchedFields: computed(() => touchedFields.value),
    setFieldError,
    clearFieldError,
    setFieldWarning,
    clearFieldWarning,
    setFieldTouched,
    isFieldTouched,
    hasFieldError,
    hasFieldWarning,
    getFieldErrors,
    getFieldWarnings,
    hasErrors,
    hasWarnings,
    clearAll
  }
}

// Animation utilities
export function useAnimations() {
  const isAnimating = ref(false)
  const animations = ref<Map<string, Animation>>(new Map())

  const animate = (
    element: HTMLElement,
    keyframes: Keyframe[],
    options: KeyframeAnimationOptions = {},
    id?: string
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        const animation = element.animate(keyframes, {
          duration: 300,
          easing: 'ease-out',
          fill: 'forwards',
          ...options
        })

        if (id) {
          animations.value.set(id, animation)
        }

        isAnimating.value = true

        animation.addEventListener('finish', () => {
          isAnimating.value = false
          if (id) {
            animations.value.delete(id)
          }
          resolve()
        })

        animation.addEventListener('cancel', () => {
          isAnimating.value = false
          if (id) {
            animations.value.delete(id)
          }
          reject(new Error('Animation cancelled'))
        })

      } catch (error) {
        isAnimating.value = false
        reject(error)
      }
    })
  }

  const fadeIn = (element: HTMLElement, duration = 300) => {
    return animate(element, [
      { opacity: 0 },
      { opacity: 1 }
    ], { duration })
  }

  const fadeOut = (element: HTMLElement, duration = 300) => {
    return animate(element, [
      { opacity: 1 },
      { opacity: 0 }
    ], { duration })
  }

  const slideIn = (element: HTMLElement, direction: 'left' | 'right' | 'up' | 'down' = 'down', duration = 300) => {
    const transforms = {
      left: ['translateX(-100%)', 'translateX(0)'],
      right: ['translateX(100%)', 'translateX(0)'],
      up: ['translateY(-100%)', 'translateY(0)'],
      down: ['translateY(-100%)', 'translateY(0)']
    }

    return animate(element, [
      { transform: transforms[direction][0], opacity: 0 },
      { transform: transforms[direction][1], opacity: 1 }
    ], { duration })
  }

  const bounce = (element: HTMLElement, duration = 600) => {
    return animate(element, [
      { transform: 'translateY(0)' },
      { transform: 'translateY(-10px)' },
      { transform: 'translateY(0)' },
      { transform: 'translateY(-5px)' },
      { transform: 'translateY(0)' }
    ], { duration, easing: 'ease-in-out' })
  }

  const shake = (element: HTMLElement, duration = 400) => {
    return animate(element, [
      { transform: 'translateX(0)' },
      { transform: 'translateX(-10px)' },
      { transform: 'translateX(10px)' },
      { transform: 'translateX(-10px)' },
      { transform: 'translateX(10px)' },
      { transform: 'translateX(0)' }
    ], { duration })
  }

  const cancelAnimation = (id: string) => {
    const animation = animations.value.get(id)
    if (animation) {
      animation.cancel()
      animations.value.delete(id)
    }
  }

  const cancelAllAnimations = () => {
    animations.value.forEach(animation => animation.cancel())
    animations.value.clear()
    isAnimating.value = false
  }

  onUnmounted(cancelAllAnimations)

  return {
    isAnimating: computed(() => isAnimating.value),
    animate,
    fadeIn,
    fadeOut,
    slideIn,
    bounce,
    shake,
    cancelAnimation,
    cancelAllAnimations
  }
}

// Touch and gesture handling
export function useGestures(target: Ref<HTMLElement | null>) {
  const isTouching = ref(false)
  const touchStartPosition = ref({ x: 0, y: 0 })
  const touchCurrentPosition = ref({ x: 0, y: 0 })
  const swipeDirection = ref<'left' | 'right' | 'up' | 'down' | null>(null)

  const MIN_SWIPE_DISTANCE = 50

  const handleTouchStart = (event: TouchEvent) => {
    if (event.touches.length === 1) {
      isTouching.value = true
      const touch = event.touches[0]
      if (touch) {
        touchStartPosition.value = { x: touch.clientX, y: touch.clientY }
        touchCurrentPosition.value = { x: touch.clientX, y: touch.clientY }
      }
    }
  }

  const handleTouchMove = (event: TouchEvent) => {
    if (isTouching.value && event.touches.length === 1) {
      const touch = event.touches[0]
      if (touch) {
        touchCurrentPosition.value = { x: touch.clientX, y: touch.clientY }
      }
    }
  }

  const handleTouchEnd = () => {
    if (isTouching.value) {
      const deltaX = touchCurrentPosition.value.x - touchStartPosition.value.x
      const deltaY = touchCurrentPosition.value.y - touchStartPosition.value.y

      const absDeltaX = Math.abs(deltaX)
      const absDeltaY = Math.abs(deltaY)

      if (Math.max(absDeltaX, absDeltaY) > MIN_SWIPE_DISTANCE) {
        if (absDeltaX > absDeltaY) {
          swipeDirection.value = deltaX > 0 ? 'right' : 'left'
        } else {
          swipeDirection.value = deltaY > 0 ? 'down' : 'up'
        }
      } else {
        swipeDirection.value = null
      }

      isTouching.value = false
    }
  }

  const bindGestureEvents = () => {
    if (!target.value) return

    target.value.addEventListener('touchstart', handleTouchStart, { passive: true })
    target.value.addEventListener('touchmove', handleTouchMove, { passive: true })
    target.value.addEventListener('touchend', handleTouchEnd, { passive: true })
  }

  const unbindGestureEvents = () => {
    if (!target.value) return

    target.value.removeEventListener('touchstart', handleTouchStart)
    target.value.removeEventListener('touchmove', handleTouchMove)
    target.value.removeEventListener('touchend', handleTouchEnd)
  }

  watch(target, (newTarget, oldTarget) => {
    if (oldTarget) unbindGestureEvents()
    if (newTarget) bindGestureEvents()
  }, { immediate: true })

  onUnmounted(unbindGestureEvents)

  return {
    isTouching: computed(() => isTouching.value),
    touchStartPosition: computed(() => touchStartPosition.value),
    touchCurrentPosition: computed(() => touchCurrentPosition.value),
    swipeDirection: computed(() => swipeDirection.value)
  }
}

import type { Ref } from 'vue'