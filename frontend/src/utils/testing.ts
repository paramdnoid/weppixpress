/**
 * Testing Utilities and Helpers
 * Best practices: Test utilities, mocks, fixtures, component testing helpers
 */

import { mount, VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import { vi, type MockedFunction } from 'vitest'
import type { Component, App } from 'vue'

// Test setup utilities
export const testUtils = {
  // Create test Pinia instance
  createTestPinia: () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    return pinia
  },

  // Create test router
  createTestRouter: (routes = []) => {
    return createRouter({
      history: createWebHistory(),
      routes: [
        { path: '/', component: { template: '<div>Home</div>' } },
        { path: '/test', component: { template: '<div>Test</div>' } },
        ...routes
      ]
    })
  },

  // Global test plugins
  globalPlugins: {
    install(app: App) {
      // Add global test utilities
      app.config.globalProperties.$testUtils = testUtils
    }
  },

  // Wait for next tick multiple times
  waitFor: async (callback: () => boolean, timeout = 1000) => {
    const start = Date.now()
    while (Date.now() - start < timeout) {
      if (callback()) return true
      await new Promise(resolve => setTimeout(resolve, 10))
    }
    throw new Error(`Timeout waiting for condition after ${timeout}ms`)
  },

  // Wait for DOM updates
  flushPromises: () => new Promise(resolve => setTimeout(resolve, 0))
}

// Component testing helpers
export const componentTestUtils = {
  // Mount component with common setup
  mountComponent: <T extends Component>(
    component: T,
    options: {
      props?: Record<string, any>
      slots?: Record<string, any>
      global?: {
        plugins?: any[]
        mocks?: Record<string, any>
        stubs?: Record<string, any>
      }
      attachTo?: HTMLElement
    } = {}
  ): VueWrapper<any> => {
    const pinia = testUtils.createTestPinia()
    const router = testUtils.createTestRouter()

    return mount(component, {
      global: {
        plugins: [pinia, router, ...(options.global?.plugins || [])],
        mocks: options.global?.mocks || {},
        stubs: options.global?.stubs || {}
      },
      props: options.props || {},
      slots: options.slots || {},
      attachTo: options.attachTo
    })
  },

  // Find element by test ID
  findByTestId: (wrapper: VueWrapper<any>, testId: string) => {
    return wrapper.find(`[data-testid="${testId}"]`)
  },

  // Find all elements by test ID
  findAllByTestId: (wrapper: VueWrapper<any>, testId: string) => {
    return wrapper.findAll(`[data-testid="${testId}"]`)
  },

  // Trigger event and wait for updates
  triggerAndWait: async (wrapper: VueWrapper<any>, selector: string, event: string, payload?: any) => {
    await wrapper.find(selector).trigger(event, payload)
    await wrapper.vm.$nextTick()
    await testUtils.flushPromises()
  },

  // Type into input field
  typeIntoInput: async (wrapper: VueWrapper<any>, selector: string, value: string) => {
    const input = wrapper.find(selector)
    await input.setValue(value)
    await input.trigger('input')
    await wrapper.vm.$nextTick()
  },

  // Assert element exists
  assertExists: (wrapper: VueWrapper<any>, selector: string) => {
    const element = wrapper.find(selector)
    if (!element.exists()) {
      throw new Error(`Element not found: ${selector}`)
    }
    return element
  },

  // Assert element text content
  assertTextContent: (wrapper: VueWrapper<any>, selector: string, expectedText: string) => {
    const element = componentTestUtils.assertExists(wrapper, selector)
    const actualText = element.text()
    if (actualText !== expectedText) {
      throw new Error(`Expected text "${expectedText}", got "${actualText}"`)
    }
  },

  // Assert element is visible
  assertVisible: (wrapper: VueWrapper<any>, selector: string) => {
    const element = componentTestUtils.assertExists(wrapper, selector)
    if (!element.isVisible()) {
      throw new Error(`Element not visible: ${selector}`)
    }
  },

  // Assert element has class
  assertHasClass: (wrapper: VueWrapper<any>, selector: string, className: string) => {
    const element = componentTestUtils.assertExists(wrapper, selector)
    if (!element.classes().includes(className)) {
      throw new Error(`Element does not have class "${className}": ${selector}`)
    }
  }
}

// Mock factories
export const mockFactories = {
  // Mock user data
  createMockUser: (overrides: Partial<any> = {}) => ({
    id: '1',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'user',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides
  }),

  // Mock file data
  createMockFile: (overrides: Partial<any> = {}) => ({
    id: '1',
    name: 'test-file.txt',
    size: 1024,
    type: 'text/plain',
    url: '/files/test-file.txt',
    uploadedAt: new Date().toISOString(),
    ...overrides
  }),

  // Mock API response
  createMockApiResponse: <T>(data: T, overrides: Partial<any> = {}) => ({
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    ...overrides
  }),

  // Mock error response
  createMockErrorResponse: (message = 'Test error', status = 400) => ({
    response: {
      data: { message },
      status,
      statusText: 'Bad Request'
    },
    message,
    name: 'AxiosError'
  }),

  // Mock form data
  createMockFormData: (fields: Record<string, any> = {}) => {
    const formData = new FormData()
    Object.entries(fields).forEach(([key, value]) => {
      formData.append(key, value)
    })
    return formData
  }
}

// API mocking utilities
export const apiMockUtils = {
  // Mock axios instance
  createMockAxios: () => {
    return {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
      request: vi.fn(),
      defaults: {
        headers: {
          common: {}
        }
      },
      interceptors: {
        request: {
          use: vi.fn(),
          eject: vi.fn()
        },
        response: {
          use: vi.fn(),
          eject: vi.fn()
        }
      }
    }
  },

  // Mock successful API calls
  mockSuccessResponse: <T>(mockAxios: any, method: string, data: T) => {
    const response = mockFactories.createMockApiResponse(data)
    ;(mockAxios[method] as MockedFunction<any>).mockResolvedValue(response)
    return response
  },

  // Mock error API calls
  mockErrorResponse: (mockAxios: any, method: string, error: any) => {
    ;(mockAxios[method] as MockedFunction<any>).mockRejectedValue(error)
  },

  // Mock API with delay
  mockDelayedResponse: <T>(mockAxios: any, method: string, data: T, delay = 100) => {
    const response = mockFactories.createMockApiResponse(data)
    ;(mockAxios[method] as MockedFunction<any>).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(response), delay))
    )
    return response
  }
}

// Event testing utilities
export const eventTestUtils = {
  // Mock DOM events
  createMockEvent: (type: string, properties: Partial<Event> = {}): Event => {
    const event = new Event(type, { bubbles: true, cancelable: true })
    Object.assign(event, properties)
    return event
  },

  // Mock keyboard events
  createMockKeyboardEvent: (key: string, properties: Partial<KeyboardEvent> = {}): KeyboardEvent => {
    return new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
      ...properties
    })
  },

  // Mock mouse events
  createMockMouseEvent: (type: string, properties: Partial<MouseEvent> = {}): MouseEvent => {
    return new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      ...properties
    })
  },

  // Mock touch events
  createMockTouchEvent: (type: string, touches: any[] = []): TouchEvent => {
    const event = new Event(type, { bubbles: true, cancelable: true }) as any
    event.touches = touches
    event.changedTouches = touches
    return event as TouchEvent
  },

  // Fire event on element
  fireEvent: (element: HTMLElement, event: Event) => {
    element.dispatchEvent(event)
  }
}

// Performance testing utilities
export const performanceTestUtils = {
  // Measure execution time
  measureTime: async (fn: () => Promise<any> | any): Promise<{ result: any; duration: number }> => {
    const start = performance.now()
    const result = await fn()
    const end = performance.now()
    return { result, duration: end - start }
  },

  // Memory usage testing
  measureMemory: async (fn: () => Promise<any> | any) => {
    const beforeMemory = (performance as any).memory?.usedJSHeapSize || 0
    const result = await fn()
    const afterMemory = (performance as any).memory?.usedJSHeapSize || 0

    return {
      result,
      memoryUsed: afterMemory - beforeMemory,
      beforeMemory,
      afterMemory
    }
  },

  // Benchmark function
  benchmark: async (fn: () => any, iterations = 100) => {
    const times: number[] = []

    for (let i = 0; i < iterations; i++) {
      const { duration } = await performanceTestUtils.measureTime(fn)
      times.push(duration)
    }

    const average = times.reduce((sum, time) => sum + time, 0) / times.length
    const min = Math.min(...times)
    const max = Math.max(...times)

    return { average, min, max, times }
  }
}

// Accessibility testing utilities
export const a11yTestUtils = {
  // Check for ARIA attributes
  checkAriaAttributes: (element: HTMLElement, expectedAttributes: Record<string, string>) => {
    const issues: string[] = []

    Object.entries(expectedAttributes).forEach(([attr, expectedValue]) => {
      const actualValue = element.getAttribute(attr)
      if (actualValue !== expectedValue) {
        issues.push(`Expected ${attr}="${expectedValue}", got "${actualValue}"`)
      }
    })

    return issues
  },

  // Check keyboard navigation
  checkKeyboardNavigation: async (wrapper: VueWrapper<any>) => {
    const focusableElements = wrapper.element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )

    const issues: string[] = []

    for (const element of focusableElements) {
      const htmlElement = element as HTMLElement

      // Check if element is focusable
      htmlElement.focus()
      if (document.activeElement !== htmlElement) {
        issues.push(`Element cannot be focused: ${htmlElement.tagName}`)
      }

      // Check for visible focus indicator
      const computedStyle = getComputedStyle(htmlElement)
      if (!computedStyle.outline && !computedStyle.boxShadow) {
        issues.push(`Element has no visible focus indicator: ${htmlElement.tagName}`)
      }
    }

    return issues
  },

  // Check color contrast
  checkColorContrast: (element: HTMLElement) => {
    const style = getComputedStyle(element)
    const backgroundColor = style.backgroundColor
    const color = style.color

    // This is a simplified check - in real testing you'd use a proper contrast library
    if (backgroundColor === 'rgba(0, 0, 0, 0)' || !color) {
      return { passed: false, message: 'Cannot determine color contrast' }
    }

    return { passed: true, message: 'Color contrast check passed' }
  }
}

// Data generation utilities
export const dataTestUtils = {
  // Generate random string
  randomString: (length = 10) => {
    return Math.random().toString(36).substring(2, length + 2)
  },

  // Generate random number
  randomNumber: (min = 0, max = 100) => {
    return Math.floor(Math.random() * (max - min + 1)) + min
  },

  // Generate random email
  randomEmail: () => {
    return `${dataTestUtils.randomString(8)}@example.com`
  },

  // Generate random date
  randomDate: (start = new Date(2020, 0, 1), end = new Date()) => {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
  },

  // Generate array of items
  generateArray: <T>(length: number, factory: (index: number) => T): T[] => {
    return Array.from({ length }, (_, index) => factory(index))
  }
}

// Test cleanup utilities
export const cleanupTestUtils = {
  // Clean up DOM
  cleanupDOM: () => {
    document.body.innerHTML = ''
  },

  // Clean up local storage
  cleanupStorage: () => {
    localStorage.clear()
    sessionStorage.clear()
  },

  // Clean up timers
  cleanupTimers: () => {
    vi.clearAllTimers()
  },

  // Clean up all mocks
  cleanupMocks: () => {
    vi.clearAllMocks()
    vi.resetAllMocks()
  },

  // Full cleanup
  fullCleanup: () => {
    cleanupTestUtils.cleanupDOM()
    cleanupTestUtils.cleanupStorage()
    cleanupTestUtils.cleanupTimers()
    cleanupTestUtils.cleanupMocks()
  }
}