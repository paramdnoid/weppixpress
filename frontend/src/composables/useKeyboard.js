import { ref, onMounted, onUnmounted, computed, readonly } from 'vue'

/**
 * Keyboard composable for handling keyboard shortcuts and navigation
 * @param {Object} options - Configuration options
 * @returns {Object} Keyboard utilities and state
 */
export function useKeyboard(options = {}) {
  const {
    target = document,
    preventDefault = true,
    stopPropagation = false,
    enableGlobalShortcuts = true,
    enableArrowNavigation = true,
    enableTabNavigation = true,
  } = options

  // Reactive state
  const pressedKeys = ref(new Set())
  const lastKeyPressed = ref('')
  const isModifierPressed = ref(false)
  const focusedElement = ref(null)

  // Computed properties
  const isCtrlPressed = computed(() => pressedKeys.value.has('Control'))
  const isShiftPressed = computed(() => pressedKeys.value.has('Shift'))
  const isAltPressed = computed(() => pressedKeys.value.has('Alt'))
  const isMetaPressed = computed(() => pressedKeys.value.has('Meta'))
  const isModifierActive = computed(() => 
    isCtrlPressed.value || isShiftPressed.value || isAltPressed.value || isMetaPressed.value
  )

  // Key combination checkers
  const isCtrlOrCmd = computed(() => 
    navigator.platform.includes('Mac') ? isMetaPressed.value : isCtrlPressed.value
  )

  // Shortcut registry
  const shortcuts = ref(new Map())
  const sequences = ref(new Map())
  let sequenceTimeout = null
  let currentSequence = []

  /**
   * Register a keyboard shortcut
   * @param {string|Array} keys - Key combination (e.g., 'ctrl+a', ['ctrl', 'a'])
   * @param {Function} callback - Function to execute when shortcut is triggered
   * @param {Object} options - Additional options
   */
  const registerShortcut = (keys, callback, shortcutOptions = {}) => {
    const keyString = Array.isArray(keys) ? keys.join('+') : keys
    const normalizedKeys = normalizeKeyString(keyString)
    
    shortcuts.value.set(normalizedKeys, {
      callback,
      description: shortcutOptions.description || '',
      preventDefault: shortcutOptions.preventDefault ?? preventDefault,
      stopPropagation: shortcutOptions.stopPropagation ?? stopPropagation,
      enabled: shortcutOptions.enabled ?? true,
      global: shortcutOptions.global ?? true,
    })
  }

  /**
   * Register a key sequence (e.g., 'g g' for GitHub-style navigation)
   * @param {Array} sequence - Array of keys in sequence
   * @param {Function} callback - Function to execute when sequence is completed
   * @param {Object} options - Additional options
   */
  const registerSequence = (sequence, callback, sequenceOptions = {}) => {
    const sequenceKey = sequence.join(' ')
    sequences.value.set(sequenceKey, {
      callback,
      timeout: sequenceOptions.timeout || 1000,
      description: sequenceOptions.description || '',
      enabled: sequenceOptions.enabled ?? true,
    })
  }

  /**
   * Unregister a keyboard shortcut
   * @param {string|Array} keys - Key combination to unregister
   */
  const unregisterShortcut = (keys) => {
    const keyString = Array.isArray(keys) ? keys.join('+') : keys
    const normalizedKeys = normalizeKeyString(keyString)
    shortcuts.value.delete(normalizedKeys)
  }

  /**
   * Unregister a key sequence
   * @param {Array} sequence - Sequence to unregister
   */
  const unregisterSequence = (sequence) => {
    const sequenceKey = sequence.join(' ')
    sequences.value.delete(sequenceKey)
  }

  /**
   * Normalize key string for consistent comparison
   * @param {string} keyString - Raw key string
   * @returns {string} Normalized key string
   */
  const normalizeKeyString = (keyString) => {
    return keyString
      .toLowerCase()
      .replace(/\s+/g, '')
      .split('+')
      .map(key => {
        // Normalize common key names
        const keyMap = {
          'cmd': 'meta',
          'command': 'meta',
          'ctrl': 'control',
          'esc': 'escape',
          'del': 'delete',
          'ins': 'insert',
          ' ': 'space',
        }
        return keyMap[key] || key
      })
      .sort()
      .join('+')
  }

  /**
   * Get current pressed key combination as string
   * @returns {string} Current key combination
   */
  const getCurrentKeyCombo = () => {
    const keys = Array.from(pressedKeys.value)
      .filter(key => !['Control', 'Shift', 'Alt', 'Meta'].includes(key))
    const modifiers = []
    
    if (isCtrlPressed.value) modifiers.push('control')
    if (isShiftPressed.value) modifiers.push('shift')
    if (isAltPressed.value) modifiers.push('alt')
    if (isMetaPressed.value) modifiers.push('meta')
    
    return [...modifiers, ...keys.map(k => k.toLowerCase())].sort().join('+')
  }

  /**
   * Check if a specific key combination is currently pressed
   * @param {string|Array} keys - Key combination to check
   * @returns {boolean} Whether the combination is pressed
   */
  const isKeyComboPressed = (keys) => {
    const keyString = Array.isArray(keys) ? keys.join('+') : keys
    const normalizedKeys = normalizeKeyString(keyString)
    const currentCombo = getCurrentKeyCombo()
    return normalizedKeys === currentCombo
  }

  /**
   * Focus management utilities
   */
  const focusUtils = {
    /**
     * Get all focusable elements within a container
     * @param {Element} container - Container element
     * @returns {Array} Array of focusable elements
     */
    getFocusableElements(container = document) {
      const focusableSelectors = [
        'button:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        'a[href]',
        '[tabindex]:not([tabindex="-1"])',
        '[contenteditable="true"]',
      ].join(', ')

      return Array.from(container.querySelectorAll(focusableSelectors))
        .filter(el => {
          // Check if element is visible and not hidden
          const rect = el.getBoundingClientRect()
          const style = window.getComputedStyle(el)
          return rect.width > 0 && 
                 rect.height > 0 &&
                 style.display !== 'none' && 
                 style.visibility !== 'hidden' && 
                 style.opacity !== '0'
        })
    },

    /**
     * Focus the next focusable element
     * @param {Element} currentElement - Currently focused element
     * @param {Element} container - Container to search within
     */
    focusNext(currentElement = document.activeElement, container = document) {
      const focusableElements = this.getFocusableElements(container)
      const currentIndex = focusableElements.indexOf(currentElement)
      const nextIndex = (currentIndex + 1) % focusableElements.length
      focusableElements[nextIndex]?.focus()
    },

    /**
     * Focus the previous focusable element
     * @param {Element} currentElement - Currently focused element
     * @param {Element} container - Container to search within
     */
    focusPrevious(currentElement = document.activeElement, container = document) {
      const focusableElements = this.getFocusableElements(container)
      const currentIndex = focusableElements.indexOf(currentElement)
      const prevIndex = currentIndex <= 0 ? focusableElements.length - 1 : currentIndex - 1
      focusableElements[prevIndex]?.focus()
    },

    /**
     * Focus the first focusable element
     * @param {Element} container - Container to search within
     */
    focusFirst(container = document) {
      const focusableElements = this.getFocusableElements(container)
      focusableElements[0]?.focus()
    },

    /**
     * Focus the last focusable element
     * @param {Element} container - Container to search within
     */
    focusLast(container = document) {
      const focusableElements = this.getFocusableElements(container)
      focusableElements[focusableElements.length - 1]?.focus()
    }
  }

  /**
   * Arrow key navigation handler
   * @param {KeyboardEvent} event - Keyboard event
   * @param {Object} options - Navigation options
   */
  const handleArrowNavigation = (event, navigationOptions = {}) => {
    if (!enableArrowNavigation) return

    const { 
      container = document,
      gridMode = false,
      itemsPerRow = null,
      wrapAround = true,
    } = navigationOptions

    const focusableElements = focusUtils.getFocusableElements(container)
    const currentIndex = focusableElements.indexOf(event.target)
    
    if (currentIndex === -1) return

    let nextIndex = currentIndex

    switch (event.key) {
      case 'ArrowDown':
        if (gridMode && itemsPerRow) {
          nextIndex = currentIndex + itemsPerRow
          if (nextIndex >= focusableElements.length && wrapAround) {
            nextIndex = currentIndex % itemsPerRow
          }
        } else {
          nextIndex = wrapAround 
            ? (currentIndex + 1) % focusableElements.length
            : Math.min(currentIndex + 1, focusableElements.length - 1)
        }
        break
      
      case 'ArrowUp':
        if (gridMode && itemsPerRow) {
          nextIndex = currentIndex - itemsPerRow
          if (nextIndex < 0 && wrapAround) {
            const lastRowStart = Math.floor((focusableElements.length - 1) / itemsPerRow) * itemsPerRow
            nextIndex = Math.min(lastRowStart + (currentIndex % itemsPerRow), focusableElements.length - 1)
          }
        } else {
          nextIndex = wrapAround 
            ? currentIndex <= 0 ? focusableElements.length - 1 : currentIndex - 1
            : Math.max(currentIndex - 1, 0)
        }
        break
      
      case 'ArrowRight':
        if (gridMode) {
          nextIndex = wrapAround 
            ? (currentIndex + 1) % focusableElements.length
            : Math.min(currentIndex + 1, focusableElements.length - 1)
        }
        break
      
      case 'ArrowLeft':
        if (gridMode) {
          nextIndex = wrapAround 
            ? currentIndex <= 0 ? focusableElements.length - 1 : currentIndex - 1
            : Math.max(currentIndex - 1, 0)
        }
        break
    }

    if (nextIndex !== currentIndex && focusableElements[nextIndex]) {
      event.preventDefault()
      focusableElements[nextIndex].focus()
    }
  }

  /**
   * Handle key sequences (like vim-style navigation)
   * @param {string} key - Pressed key
   */
  const handleSequences = (key) => {
    currentSequence.push(key)
    
    // Clear existing timeout
    if (sequenceTimeout) {
      clearTimeout(sequenceTimeout)
    }

    // Check for matching sequences
    const sequenceKey = currentSequence.join(' ')
    const sequence = sequences.value.get(sequenceKey)
    
    if (sequence && sequence.enabled) {
      sequence.callback(currentSequence)
      currentSequence = []
      return
    }

    // Check for partial matches
    const hasPartialMatch = Array.from(sequences.value.keys())
      .some(seq => seq.startsWith(sequenceKey + ' '))

    if (!hasPartialMatch) {
      currentSequence = [key] // Reset to current key
    }

    // Set timeout to reset sequence
    sequenceTimeout = setTimeout(() => {
      currentSequence = []
    }, 1000)
  }

  /**
   * Main keyboard event handler
   * @param {KeyboardEvent} event - Keyboard event
   */
  const handleKeyDown = (event) => {
    const key = event.key
    
    // Update pressed keys
    pressedKeys.value.add(key)
    lastKeyPressed.value = key
    isModifierPressed.value = isModifierActive.value

    // Handle sequences first
    if (!isModifierActive.value) {
      handleSequences(key.toLowerCase())
    }

    // Handle shortcuts
    const currentCombo = getCurrentKeyCombo()
    const shortcut = shortcuts.value.get(currentCombo)
    
    if (shortcut && shortcut.enabled) {
      // Check if shortcut should be global or only when not in input
      const isInInput = ['input', 'textarea', 'select'].includes(event.target.tagName.toLowerCase()) ||
                       event.target.contentEditable === 'true'
      
      if (shortcut.global || !isInInput) {
        if (shortcut.preventDefault) event.preventDefault()
        if (shortcut.stopPropagation) event.stopPropagation()
        
        try {
          shortcut.callback(event, currentCombo)
        } catch (error) {
          console.error('Keyboard shortcut error:', error)
        }
      }
    }

    // Handle arrow navigation for non-input elements
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      const isInInput = ['input', 'textarea', 'select'].includes(event.target.tagName.toLowerCase()) ||
                       event.target.contentEditable === 'true'
      
      if (!isInInput) {
        handleArrowNavigation(event)
      }
    }

    // Track focused element
    focusedElement.value = event.target
  }

  /**
   * Handle key up events
   * @param {KeyboardEvent} event - Keyboard event
   */
  const handleKeyUp = (event) => {
    pressedKeys.value.delete(event.key)
    isModifierPressed.value = isModifierActive.value
  }

  /**
   * Handle focus events for better tracking
   * @param {FocusEvent} event - Focus event
   */
  const handleFocus = (event) => {
    focusedElement.value = event.target
  }

  /**
   * Get all registered shortcuts for help/documentation
   * @returns {Array} Array of shortcut information
   */
  const getShortcuts = () => {
    return Array.from(shortcuts.value.entries()).map(([keys, shortcut]) => ({
      keys,
      description: shortcut.description,
      enabled: shortcut.enabled,
    }))
  }

  /**
   * Get all registered sequences
   * @returns {Array} Array of sequence information
   */
  const getSequences = () => {
    return Array.from(sequences.value.entries()).map(([sequence, config]) => ({
      sequence: sequence.split(' '),
      description: config.description,
      enabled: config.enabled,
    }))
  }

  /**
   * Clear all pressed keys (useful for cleanup)
   */
  const clearPressedKeys = () => {
    pressedKeys.value.clear()
    isModifierPressed.value = false
  }

  /**
   * Register common application shortcuts
   */
  const registerCommonShortcuts = () => {
    // Selection shortcuts
    registerShortcut('control+a', (event) => {
      // Let parent components handle this
      const selectAllEvent = new CustomEvent('keyboard-select-all', { 
        detail: { originalEvent: event }
      })
      event.target.dispatchEvent(selectAllEvent)
    }, { description: 'Select all items' })

    // Search shortcut
    registerShortcut('control+f', (event) => {
      const searchInput = document.querySelector('input[aria-label*="Search"], input[placeholder*="Search"], input[placeholder*="search"]')
      if (searchInput) {
        event.preventDefault()
        searchInput.focus()
        searchInput.select()
      }
    }, { description: 'Focus search input' })

    // Escape to clear/cancel
    registerShortcut('escape', (event) => {
      // Clear selection or close modals
      const escapeEvent = new CustomEvent('keyboard-escape', { 
        detail: { originalEvent: event }
      })
      event.target.dispatchEvent(escapeEvent)
      
      // If no custom handler, blur active element
      setTimeout(() => {
        if (document.activeElement && document.activeElement.blur) {
          document.activeElement.blur()
        }
      }, 0)
    }, { description: 'Clear focus/cancel action' })

    // Navigation shortcuts
    registerShortcut('home', (event) => {
      if (!['input', 'textarea'].includes(event.target.tagName.toLowerCase())) {
        event.preventDefault()
        focusUtils.focusFirst()
      }
    }, { description: 'Focus first item' })

    registerShortcut('end', (event) => {
      if (!['input', 'textarea'].includes(event.target.tagName.toLowerCase())) {
        event.preventDefault()
        focusUtils.focusLast()
      }
    }, { description: 'Focus last item' })

    // Delete shortcut
    registerShortcut('delete', (event) => {
      const deleteEvent = new CustomEvent('keyboard-delete', { 
        detail: { originalEvent: event }
      })
      event.target.dispatchEvent(deleteEvent)
    }, { description: 'Delete selected items' })

    // Refresh shortcut
    registerShortcut('f5', (event) => {
      const refreshEvent = new CustomEvent('keyboard-refresh', { 
        detail: { originalEvent: event }
      })
      event.target.dispatchEvent(refreshEvent)
    }, { description: 'Refresh current view' })
  }

  // Lifecycle management
  onMounted(() => {
    if (enableGlobalShortcuts) {
      target.addEventListener('keydown', handleKeyDown, { passive: false })
      target.addEventListener('keyup', handleKeyUp, { passive: true })
      target.addEventListener('focus', handleFocus, { passive: true, capture: true })
      
      // Handle window blur to clear pressed keys
      window.addEventListener('blur', clearPressedKeys, { passive: true })
      
      // Register common shortcuts
      registerCommonShortcuts()
    }
  })

  onUnmounted(() => {
    target.removeEventListener('keydown', handleKeyDown)
    target.removeEventListener('keyup', handleKeyUp)
    target.removeEventListener('focus', handleFocus)
    window.removeEventListener('blur', clearPressedKeys)
    
    if (sequenceTimeout) {
      clearTimeout(sequenceTimeout)
    }
  })

  return {
    // State (readonly to prevent external mutation)
    pressedKeys: readonly(pressedKeys),
    lastKeyPressed: readonly(lastKeyPressed),
    isModifierPressed: readonly(isModifierPressed),
    focusedElement: readonly(focusedElement),
    
    // Computed
    isCtrlPressed,
    isShiftPressed,
    isAltPressed,
    isMetaPressed,
    isModifierActive,
    isCtrlOrCmd,
    
    // Methods
    registerShortcut,
    registerSequence,
    unregisterShortcut,
    unregisterSequence,
    isKeyComboPressed,
    getCurrentKeyCombo,
    handleArrowNavigation,
    clearPressedKeys,
    
    // Focus utilities
    focusUtils,
    
    // Information
    getShortcuts,
    getSequences,
  }
}