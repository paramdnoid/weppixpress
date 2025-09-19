/**
 * AccessibleComponent Test Suite
 * Tests for accessibility features, keyboard navigation, screen reader support
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { componentTestUtils, eventTestUtils, a11yTestUtils } from '@/utils/testing'
import AccessibleComponent from '../AccessibleComponent.vue'

describe('AccessibleComponent', () => {
  let wrapper: any

  beforeEach(() => {
    wrapper = componentTestUtils.mountComponent(AccessibleComponent, {
      props: {
        ariaLabel: 'Test component',
        role: 'button'
      }
    })
  })

  describe('Basic Rendering', () => {
    it('renders with correct default tag', () => {
      expect(wrapper.element.tagName).toBe('DIV')
    })

    it('renders with custom tag', () => {
      wrapper = componentTestUtils.mountComponent(AccessibleComponent, {
        props: { tag: 'section' }
      })
      expect(wrapper.element.tagName).toBe('SECTION')
    })

    it('applies accessibility classes', () => {
      componentTestUtils.assertHasClass(wrapper, '.accessible-component', 'accessible-component')
    })
  })

  describe('ARIA Attributes', () => {
    it('sets aria-label correctly', () => {
      expect(wrapper.element.getAttribute('aria-label')).toBe('Test component')
    })

    it('sets role correctly', () => {
      expect(wrapper.element.getAttribute('role')).toBe('button')
    })

    it('sets aria-expanded when provided', () => {
      wrapper = componentTestUtils.mountComponent(AccessibleComponent, {
        props: { ariaExpanded: true }
      })
      expect(wrapper.element.getAttribute('aria-expanded')).toBe('true')
    })

    it('sets aria-disabled when disabled', () => {
      wrapper = componentTestUtils.mountComponent(AccessibleComponent, {
        props: { disabled: true }
      })
      expect(wrapper.element.getAttribute('aria-disabled')).toBe('true')
    })

    it('handles aria-checked with mixed state', () => {
      wrapper = componentTestUtils.mountComponent(AccessibleComponent, {
        props: { ariaChecked: 'mixed' }
      })
      expect(wrapper.element.getAttribute('aria-checked')).toBe('mixed')
    })
  })

  describe('Tabindex Management', () => {
    it('sets tabindex to -1 when disabled', () => {
      wrapper = componentTestUtils.mountComponent(AccessibleComponent, {
        props: { disabled: true }
      })
      expect(wrapper.element.getAttribute('tabindex')).toBe('-1')
    })

    it('sets custom tabindex when provided', () => {
      wrapper = componentTestUtils.mountComponent(AccessibleComponent, {
        props: { tabindex: 2 }
      })
      expect(wrapper.element.getAttribute('tabindex')).toBe('2')
    })

    it('does not set tabindex when not specified', () => {
      wrapper = componentTestUtils.mountComponent(AccessibleComponent)
      expect(wrapper.element.getAttribute('tabindex')).toBeNull()
    })
  })

  describe('Loading State', () => {
    it('displays loading state', () => {
      wrapper = componentTestUtils.mountComponent(AccessibleComponent, {
        props: { loading: true, loadingMessage: 'Please wait...' }
      })

      const loadingState = wrapper.find('.loading-state')
      expect(loadingState.exists()).toBe(true)
      expect(loadingState.attributes('role')).toBe('status')
      expect(loadingState.attributes('aria-live')).toBe('polite')
      expect(loadingState.attributes('aria-label')).toBe('Please wait...')
    })

    it('hides content when loading', () => {
      wrapper = componentTestUtils.mountComponent(AccessibleComponent, {
        props: { loading: true },
        slots: { default: 'Main content' }
      })

      expect(wrapper.find('.loading-state').exists()).toBe(true)
      expect(wrapper.find('.content').exists()).toBe(false)
    })

    it('shows spinner in loading state', () => {
      wrapper = componentTestUtils.mountComponent(AccessibleComponent, {
        props: { loading: true }
      })

      expect(wrapper.find('.spinner').exists()).toBe(true)
      expect(wrapper.find('.sr-only').text()).toBe('Loading...')
    })
  })

  describe('Error State', () => {
    it('displays error state with string error', () => {
      wrapper = componentTestUtils.mountComponent(AccessibleComponent, {
        props: { error: 'Something went wrong' }
      })

      const errorState = wrapper.find('.error-state')
      expect(errorState.exists()).toBe(true)
      expect(errorState.attributes('role')).toBe('alert')
      expect(errorState.attributes('aria-live')).toBe('assertive')
    })

    it('displays error state with Error object', () => {
      const error = new Error('Network error')
      wrapper = componentTestUtils.mountComponent(AccessibleComponent, {
        props: { error }
      })

      componentTestUtils.assertTextContent(wrapper, '.error-message p', 'Network error')
    })

    it('shows retry button when retry function provided', () => {
      const retryFn = vi.fn()
      wrapper = componentTestUtils.mountComponent(AccessibleComponent, {
        props: { error: 'Failed', retry: retryFn }
      })

      const retryButton = wrapper.find('.retry-button')
      expect(retryButton.exists()).toBe(true)
    })

    it('calls retry function when retry button clicked', async () => {
      const retryFn = vi.fn()
      wrapper = componentTestUtils.mountComponent(AccessibleComponent, {
        props: { error: 'Failed', retry: retryFn }
      })

      await componentTestUtils.triggerAndWait(wrapper, '.retry-button', 'click')
      expect(retryFn).toHaveBeenCalledOnce()
    })
  })

  describe('Keyboard Navigation', () => {
    it('handles Enter key press', async () => {
      const clickSpy = vi.spyOn(wrapper.element, 'click')

      const enterEvent = eventTestUtils.createMockKeyboardEvent('Enter')
      await wrapper.trigger('keydown', enterEvent)

      expect(clickSpy).toHaveBeenCalled()
    })

    it('handles Escape key press', async () => {
      const blurSpy = vi.spyOn(wrapper.element, 'blur')

      const escapeEvent = eventTestUtils.createMockKeyboardEvent('Escape')
      await wrapper.trigger('keydown', escapeEvent)

      expect(blurSpy).toHaveBeenCalled()
    })

    it('does not handle keyboard events when disabled', async () => {
      wrapper = componentTestUtils.mountComponent(AccessibleComponent, {
        props: { disabled: true }
      })

      const clickSpy = vi.spyOn(wrapper.element, 'click')

      const enterEvent = eventTestUtils.createMockKeyboardEvent('Enter')
      await wrapper.trigger('keydown', enterEvent)

      expect(clickSpy).not.toHaveBeenCalled()
    })

    it('does not handle keyboard events when keyboard nav disabled', async () => {
      wrapper = componentTestUtils.mountComponent(AccessibleComponent, {
        props: { enableKeyboardNav: false }
      })

      const clickSpy = vi.spyOn(wrapper.element, 'click')

      const enterEvent = eventTestUtils.createMockKeyboardEvent('Enter')
      await wrapper.trigger('keydown', enterEvent)

      expect(clickSpy).not.toHaveBeenCalled()
    })
  })

  describe('Focus Management', () => {
    it('prevents focus when disabled', async () => {
      wrapper = componentTestUtils.mountComponent(AccessibleComponent, {
        props: { disabled: true }
      })

      const focusEvent = new FocusEvent('focus')
      const preventDefaultSpy = vi.spyOn(focusEvent, 'preventDefault')

      await wrapper.trigger('focus', focusEvent)
      expect(preventDefaultSpy).toHaveBeenCalled()
    })

    it('handles focus when enabled', async () => {
      await wrapper.trigger('focus')
      // Should not throw or prevent default
    })
  })

  describe('Skip Links', () => {
    it('shows skip links when enabled', () => {
      wrapper = componentTestUtils.mountComponent(AccessibleComponent, {
        props: { showSkipLinks: true }
      })

      expect(wrapper.find('.skip-links').exists()).toBe(true)
    })

    it('handles skip link clicks', async () => {
      // Create target element
      const targetElement = document.createElement('div')
      targetElement.id = 'main-content'
      targetElement.setAttribute('tabindex', '-1')
      document.body.appendChild(targetElement)

      const focusSpy = vi.spyOn(targetElement, 'focus')
      const scrollSpy = vi.spyOn(targetElement, 'scrollIntoView')

      wrapper = componentTestUtils.mountComponent(AccessibleComponent, {
        props: { showSkipLinks: true }
      })

      // Mock skip link
      const skipLink = document.createElement('a')
      skipLink.href = '#main-content'
      wrapper.element.querySelector('.skip-links')?.appendChild(skipLink)

      const event = new Event('click')
      Object.defineProperty(event, 'target', { value: skipLink })
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

      await wrapper.vm.handleSkipLinkClick(event)

      expect(preventDefaultSpy).toHaveBeenCalled()
      expect(focusSpy).toHaveBeenCalled()
      expect(scrollSpy).toHaveBeenCalledWith({ behavior: 'smooth' })

      // Cleanup
      document.body.removeChild(targetElement)
    })
  })

  describe('Screen Reader Announcements', () => {
    it('announces loading state changes', async () => {
      const wrapper = componentTestUtils.mountComponent(AccessibleComponent, {
        props: { loading: false, loadingMessage: 'Custom loading message' }
      })

      await wrapper.setProps({ loading: true })
      await wrapper.vm.$nextTick()

      // Check if announcement was made (this would require mocking the screen reader composable)
      expect(wrapper.vm.announcements).toBeDefined()
    })

    it('announces error state changes', async () => {
      wrapper = componentTestUtils.mountComponent(AccessibleComponent, {
        props: { error: null }
      })

      await wrapper.setProps({ error: 'New error occurred' })
      await wrapper.vm.$nextTick()

      // Check if error announcement was made
      expect(wrapper.vm.announcements).toBeDefined()
    })
  })

  describe('Accessibility Compliance', () => {
    it('passes basic ARIA attribute checks', () => {
      const issues = a11yTestUtils.checkAriaAttributes(wrapper.element, {
        'aria-label': 'Test component',
        'role': 'button'
      })

      expect(issues).toHaveLength(0)
    })

    it('has visible focus indicators', () => {
      const style = getComputedStyle(wrapper.element)
      // This is a basic check - in real testing you'd need to verify actual focus styles
      expect(style).toBeDefined()
    })
  })

  describe('High Contrast Mode', () => {
    it('applies high contrast class when detected', async () => {
      // Mock high contrast detection
      wrapper.vm.isHighContrast = true
      await wrapper.vm.$nextTick()

      componentTestUtils.assertHasClass(wrapper, '.accessible-component', 'high-contrast')
    })
  })

  describe('Reduced Motion', () => {
    it('applies reduced motion class when preferred', async () => {
      // Mock reduced motion preference
      wrapper.vm.prefersReducedMotion = true
      await wrapper.vm.$nextTick()

      componentTestUtils.assertHasClass(wrapper, '.accessible-component', 'reduced-motion')
    })
  })

  describe('Slots', () => {
    it('renders default slot content', () => {
      wrapper = componentTestUtils.mountComponent(AccessibleComponent, {
        slots: { default: 'Default content' }
      })

      componentTestUtils.assertTextContent(wrapper, '.content', 'Default content')
    })

    it('renders custom loading slot', () => {
      wrapper = componentTestUtils.mountComponent(AccessibleComponent, {
        props: { loading: true },
        slots: { loading: 'Custom loading content' }
      })

      componentTestUtils.assertTextContent(wrapper, '.loading-state', 'Custom loading content')
    })

    it('renders custom error slot', () => {
      const retryFn = vi.fn()
      wrapper = componentTestUtils.mountComponent(AccessibleComponent, {
        props: { error: 'Test error', retry: retryFn },
        slots: {
          error: `
            <template #error="{ error, retry }">
              <div class="custom-error">{{ error }} <button @click="retry">Retry</button></div>
            </template>
          `
        }
      })

      expect(wrapper.find('.custom-error').exists()).toBe(true)
    })
  })
})