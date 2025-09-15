<template>
  <teleport to="body">
    <div
      v-if="isVisible"
      ref="menuRef"
      class="context-menu"
      :style="menuStyle"
      @click.stop
      @contextmenu.prevent
    >
      <div class="context-menu-content">
        <div
          v-for="item in menuItems"
          :key="item.id"
          class="context-menu-item"
          :class="{
            disabled: item.disabled,
            separator: item.separator,
            danger: item.id === 'delete-selected' || item.id === 'cut'
          }"
          @click="handleItemClick(item)"
        >
          <div v-if="item.separator" class="separator" />
          <template v-else>
            <Icon
              v-if="item.icon"
              :icon="item.icon"
              class="menu-icon"
            />
            <span class="menu-label">{{ item.label }}</span>
            <span
              v-if="item.shortcut"
              class="menu-shortcut"
            >
              {{ item.shortcut }}
            </span>
          </template>
        </div>
      </div>
    </div>
    <div
      v-if="isVisible"
      class="context-menu-backdrop"
      @click="hide"
      @contextmenu.prevent="hide"
    />
  </teleport>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'

const props = defineProps({
  items: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['item-click', 'hide'])

const isVisible = ref(false)
const menuRef = ref(null)
const position = ref({ x: 0, y: 0 })

const menuItems = computed(() => props.items)

const menuStyle = computed(() => ({
  left: `${position.value.x}px`,
  top: `${position.value.y}px`
}))

function show(event) {
  isVisible.value = true

  nextTick(() => {
    if (!menuRef.value) return

    const menuRect = menuRef.value.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    let x = event.clientX
    let y = event.clientY

    // Adjust position if menu would overflow viewport
    if (x + menuRect.width > viewportWidth) {
      x = viewportWidth - menuRect.width - 10
    }

    if (y + menuRect.height > viewportHeight) {
      y = viewportHeight - menuRect.height - 10
    }

    position.value = { x: Math.max(0, x), y: Math.max(0, y) }
  })
}

function hide() {
  isVisible.value = false
  emit('hide')
}

function handleItemClick(item) {
  if (item.disabled || item.separator) return

  emit('item-click', item)
  hide()
}

function handleEscape(event) {
  if (event.key === 'Escape' && isVisible.value) {
    hide()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleEscape)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscape)
})

defineExpose({
  show,
  hide
})
</script>

<style scoped>
.context-menu {
  position: fixed;
  z-index: 9999;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  min-width: 220px;
  max-width: 300px;
  user-select: none;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.context-menu-content {
  padding: 6px 0;
}

.context-menu-item {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  cursor: pointer;
  font-size: 0.875rem;
  color: #374151;
  transition: all 0.15s ease;
  font-weight: 400;
}

.context-menu-item:not(.separator):not(.disabled):hover {
  background-color: #f9fafb;
  color: #111827;
}

.context-menu-item.disabled {
  color: #9ca3af;
  cursor: not-allowed;
  opacity: 0.6;
}

.context-menu-item.danger {
  color: #dc2626;
}

.context-menu-item.danger:hover {
  background-color: #fef2f2;
  color: #b91c1c;
}

.context-menu-item.danger .menu-icon {
  color: #dc2626;
}

.context-menu-item.danger:hover .menu-icon {
  color: #b91c1c;
}

.context-menu-item.separator {
  padding: 0;
  cursor: default;
}

.separator {
  height: 1px;
  background-color: #f3f4f6;
  margin: 6px 0;
}

.menu-icon {
  width: 18px;
  height: 18px;
  margin-right: 12px;
  flex-shrink: 0;
  color: #6b7280;
}

.context-menu-item:hover .menu-icon {
  color: #374151;
}

.menu-label {
  flex: 1;
  font-weight: 400;
  letter-spacing: 0.01em;
}

.menu-shortcut {
  color: #9ca3af;
  font-size: 0.75rem;
  margin-left: 20px;
  font-weight: 400;
  letter-spacing: 0.02em;
}

.context-menu-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9998;
  background: transparent;
}

/* Focus styles */
.context-menu-item:focus {
  outline: none;
  background-color: #f3f4f6;
}

/* First and last item radius */
.context-menu-item:first-child {
  border-top-left-radius: 7px;
  border-top-right-radius: 7px;
}

.context-menu-item:last-child {
  border-bottom-left-radius: 7px;
  border-bottom-right-radius: 7px;
}
</style>