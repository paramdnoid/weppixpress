/**
 * Accessibility Composables
 * Best practices: ARIA, keyboard navigation, screen readers, focus management
 */

import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useEventListener } from '@vueuse/core'

// Focus management
export function useFocusManagement() {
  const focusableElements = ref<HTMLElement[]>([])
  const currentFocusIndex = ref(-1)

  const updateFocusableElements = (container: HTMLElement) => {
    const selectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])'
    ].join(',')

    focusableElements.value = Array.from(
      container.querySelectorAll(selectors)
    ) as HTMLElement[]
  }

  const focusFirst = () => {
    if (focusableElements.value.length > 0) {
      focusableElements.value[0].focus()
      currentFocusIndex.value = 0
    }
  }

  const focusLast = () => {
    const lastIndex = focusableElements.value.length - 1
    if (lastIndex >= 0) {
      focusableElements.value[lastIndex].focus()
      currentFocusIndex.value = lastIndex
    }
  }

  const focusNext = () => {
    const nextIndex = (currentFocusIndex.value + 1) % focusableElements.value.length
    if (focusableElements.value[nextIndex]) {
      focusableElements.value[nextIndex].focus()
      currentFocusIndex.value = nextIndex
    }
  }

  const focusPrevious = () => {
    const prevIndex = currentFocusIndex.value <= 0
      ? focusableElements.value.length - 1
      : currentFocusIndex.value - 1

    if (focusableElements.value[prevIndex]) {
      focusableElements.value[prevIndex].focus()
      currentFocusIndex.value = prevIndex
    }
  }

  const trapFocus = (container: HTMLElement) => {
    updateFocusableElements(container)

    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (focusableElements.value.length === 0) {
          e.preventDefault()
          return
        }

        if (e.shiftKey) {
          if (document.activeElement === focusableElements.value[0]) {
            e.preventDefault()
            focusLast()
          }
        } else {
          if (document.activeElement === focusableElements.value[focusableElements.value.length - 1]) {
            e.preventDefault()
            focusFirst()
          }
        }
      }
    }

    container.addEventListener('keydown', handleKeydown)

    return () => {
      container.removeEventListener('keydown', handleKeydown)
    }
  }

  return {
    focusableElements: computed(() => focusableElements.value),
    currentFocusIndex: computed(() => currentFocusIndex.value),
    updateFocusableElements,
    focusFirst,
    focusLast,
    focusNext,
    focusPrevious,
    trapFocus
  }
}

// Keyboard navigation
export function useKeyboardNavigation(options: {
  onEnter?: () => void
  onEscape?: () => void
  onArrowUp?: () => void
  onArrowDown?: () => void
  onArrowLeft?: () => void
  onArrowRight?: () => void
  onHome?: () => void
  onEnd?: () => void
  onSpace?: () => void
} = {}) {
  const keyMap = {
    Enter: options.onEnter,
    Escape: options.onEscape,
    ArrowUp: options.onArrowUp,
    ArrowDown: options.onArrowDown,
    ArrowLeft: options.onArrowLeft,
    ArrowRight: options.onArrowRight,
    Home: options.onHome,
    End: options.onEnd,
    ' ': options.onSpace // Space key
  }

  const handleKeydown = (e: KeyboardEvent) => {
    const handler = keyMap[e.key as keyof typeof keyMap]
    if (handler) {
      e.preventDefault()
      handler()
    }
  }

  return {
    handleKeydown,
    bindKeyboardEvents: (element: HTMLElement) => {
      element.addEventListener('keydown', handleKeydown)
      return () => element.removeEventListener('keydown', handleKeydown)
    }
  }
}

// ARIA attributes management
export function useAria() {
  const setAriaLabel = (element: HTMLElement, label: string) => {
    element.setAttribute('aria-label', label)
  }

  const setAriaDescribedBy = (element: HTMLElement, id: string) => {
    element.setAttribute('aria-describedby', id)
  }

  const setAriaExpanded = (element: HTMLElement, expanded: boolean) => {
    element.setAttribute('aria-expanded', expanded.toString())
  }

  const setAriaSelected = (element: HTMLElement, selected: boolean) => {
    element.setAttribute('aria-selected', selected.toString())
  }

  const setAriaChecked = (element: HTMLElement, checked: boolean | 'mixed') => {
    element.setAttribute('aria-checked', checked.toString())
  }

  const setAriaDisabled = (element: HTMLElement, disabled: boolean) => {
    element.setAttribute('aria-disabled', disabled.toString())
  }

  const setAriaHidden = (element: HTMLElement, hidden: boolean) => {
    element.setAttribute('aria-hidden', hidden.toString())
  }

  const setRole = (element: HTMLElement, role: string) => {
    element.setAttribute('role', role)
  }

  const setTabIndex = (element: HTMLElement, index: number) => {
    element.setAttribute('tabindex', index.toString())
  }

  return {
    setAriaLabel,
    setAriaDescribedBy,
    setAriaExpanded,
    setAriaSelected,
    setAriaChecked,
    setAriaDisabled,
    setAriaHidden,
    setRole,
    setTabIndex
  }
}

// Screen reader announcements
export function useScreenReader() {
  const announcements = ref<string[]>([])

  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    announcements.value.push(message)

    // Create live region for announcement
    const liveRegion = document.createElement('div')
    liveRegion.setAttribute('aria-live', priority)
    liveRegion.setAttribute('aria-atomic', 'true')
    liveRegion.style.position = 'absolute'
    liveRegion.style.left = '-10000px'
    liveRegion.style.width = '1px'
    liveRegion.style.height = '1px'
    liveRegion.style.overflow = 'hidden'

    document.body.appendChild(liveRegion)

    // Announce message
    nextTick(() => {
      liveRegion.textContent = message

      // Remove after announcement
      setTimeout(() => {
        document.body.removeChild(liveRegion)
      }, 1000)
    })
  }

  const announceError = (message: string) => {
    announce(`Error: ${message}`, 'assertive')
  }

  const announceSuccess = (message: string) => {
    announce(`Success: ${message}`, 'polite')
  }

  const announceLoading = (message = 'Loading') => {
    announce(message, 'polite')
  }

  return {
    announcements: computed(() => announcements.value),
    announce,
    announceError,
    announceSuccess,
    announceLoading
  }
}

// Skip links for keyboard navigation
export function useSkipLinks() {
  const skipLinks = ref<Array<{ href: string; label: string }>>([])

  const addSkipLink = (href: string, label: string) => {
    skipLinks.value.push({ href, label })
  }

  const removeSkipLink = (href: string) => {
    const index = skipLinks.value.findIndex(link => link.href === href)
    if (index > -1) {
      skipLinks.value.splice(index, 1)
    }
  }

  const createSkipLinksHTML = () => {
    if (skipLinks.value.length === 0) return ''

    return `
      <div class="skip-links" aria-label="Skip navigation">
        ${skipLinks.value.map(link => `
          <a href="${link.href}" class="skip-link">
            ${link.label}
          </a>
        `).join('')}
      </div>
    `
  }

  return {
    skipLinks: computed(() => skipLinks.value),
    addSkipLink,
    removeSkipLink,
    createSkipLinksHTML
  }
}

// High contrast mode detection
export function useHighContrast() {
  const isHighContrast = ref(false)

  const checkHighContrast = () => {
    // Check for Windows high contrast mode
    const testElement = document.createElement('div')
    testElement.style.backgroundImage = 'url(data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==)'
    testElement.style.position = 'absolute'
    testElement.style.left = '-9999px'
    document.body.appendChild(testElement)

    const backgroundImage = getComputedStyle(testElement).backgroundImage
    isHighContrast.value = backgroundImage === 'none'

    document.body.removeChild(testElement)
  }

  onMounted(() => {
    checkHighContrast()

    // Listen for high contrast changes
    const mediaQuery = window.matchMedia('(prefers-contrast: high)')
    const handleChange = () => checkHighContrast()

    mediaQuery.addEventListener('change', handleChange)

    onUnmounted(() => {
      mediaQuery.removeEventListener('change', handleChange)
    })
  })

  return {
    isHighContrast: computed(() => isHighContrast.value)
  }
}

// Reduced motion preference
export function useReducedMotion() {
  const prefersReducedMotion = ref(false)

  const checkReducedMotion = () => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    prefersReducedMotion.value = mediaQuery.matches

    const handleChange = (e: MediaQueryListEvent) => {
      prefersReducedMotion.value = e.matches
    }

    mediaQuery.addEventListener('change', handleChange)

    onUnmounted(() => {
      mediaQuery.removeEventListener('change', handleChange)
    })
  }

  onMounted(checkReducedMotion)

  return {
    prefersReducedMotion: computed(() => prefersReducedMotion.value)
  }
}

// Color contrast utilities
export function useColorContrast() {
  const calculateLuminance = (hex: string): number => {
    const rgb = hexToRgb(hex)
    if (!rgb) return 0

    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(c => {
      c = c / 255
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    })

    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }

  const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null
  }

  const getContrastRatio = (color1: string, color2: string): number => {
    const lum1 = calculateLuminance(color1)
    const lum2 = calculateLuminance(color2)
    const brightest = Math.max(lum1, lum2)
    const darkest = Math.min(lum1, lum2)
    return (brightest + 0.05) / (darkest + 0.05)
  }

  const meetsWCAG = (color1: string, color2: string, level: 'AA' | 'AAA' = 'AA'): boolean => {
    const ratio = getContrastRatio(color1, color2)
    return level === 'AAA' ? ratio >= 7 : ratio >= 4.5
  }

  const suggestContrastColor = (backgroundColor: string): string => {
    const luminance = calculateLuminance(backgroundColor)
    return luminance > 0.5 ? '#000000' : '#ffffff'
  }

  return {
    calculateLuminance,
    getContrastRatio,
    meetsWCAG,
    suggestContrastColor
  }
}

// Form accessibility
export function useFormAccessibility() {
  const validateFormAccessibility = (formElement: HTMLFormElement) => {
    const issues: string[] = []

    // Check for labels
    const inputs = formElement.querySelectorAll('input, select, textarea')
    inputs.forEach((input: Element) => {
      const id = input.getAttribute('id')
      const ariaLabel = input.getAttribute('aria-label')
      const ariaLabelledBy = input.getAttribute('aria-labelledby')

      if (!id || (!ariaLabel && !ariaLabelledBy && !formElement.querySelector(`label[for="${id}"]`))) {
        issues.push(`Input missing proper label: ${input.tagName}`)
      }
    })

    // Check for fieldsets in groups
    const radioGroups = formElement.querySelectorAll('input[type="radio"]')
    const radioNames = new Set()
    radioGroups.forEach((radio: Element) => {
      const name = radio.getAttribute('name')
      if (name) radioNames.add(name)
    })

    radioNames.forEach(name => {
      const radios = formElement.querySelectorAll(`input[type="radio"][name="${name}"]`)
      if (radios.length > 1 && !radios[0].closest('fieldset')) {
        issues.push(`Radio group "${name}" should be wrapped in fieldset`)
      }
    })

    return issues
  }

  const enhanceFormAccessibility = (formElement: HTMLFormElement) => {
    // Add aria-required to required fields
    const requiredInputs = formElement.querySelectorAll('input[required], select[required], textarea[required]')
    requiredInputs.forEach((input: Element) => {
      input.setAttribute('aria-required', 'true')
    })

    // Add aria-invalid for fields with errors
    const invalidInputs = formElement.querySelectorAll('.error input, .error select, .error textarea')
    invalidInputs.forEach((input: Element) => {
      input.setAttribute('aria-invalid', 'true')
    })

    // Auto-generate IDs and labels if missing
    let idCounter = 0
    const inputsWithoutIds = formElement.querySelectorAll('input:not([id]), select:not([id]), textarea:not([id])')
    inputsWithoutIds.forEach((input: Element) => {
      const id = `auto-id-${Date.now()}-${idCounter++}`
      input.setAttribute('id', id)
    })
  }

  return {
    validateFormAccessibility,
    enhanceFormAccessibility
  }
}