<template>
  <DefaultLayout>
    <div class="card flex-fill profile-root">
      <!-- Profile Toolbar -->
      <ProfileToolbar
        :current-view="currentView"
        :is-sidebar-collapsed="isCollapsed"
        :has-unsaved-changes="hasUnsavedChanges"
        :is-saving="isSaving"
        @toggle-sidebar="toggleSidebar"
        @view-change="handleViewChange"
        @save="handleSave"
        @reset="handleReset"
        @export-profile="handleExportProfile"
        @delete-account="handleDeleteAccount"
      />

      <div class="d-flex border-top splitter-container flex-fill position-relative">
        <!-- Profile Sidebar -->
        <ProfileSidebar
          :is-collapsed="isCollapsed"
          :width="sidebarWidth"
          :current-view="currentView"
          @view-select="handleViewChange"
          class="border-end"
        />

        <!-- Splitter -->
        <div
          v-show="!isCollapsed"
          class="splitter"
          role="separator"
          @mousedown="startDragging"
        />

        <!-- Profile Content -->
        <ProfileContent
          :current-view="currentView"
          :has-unsaved-changes="hasUnsavedChanges"
          :is-saving="isSaving"
          @view-change="handleViewChange"
          @unsaved-changes="handleUnsavedChanges"
        />
      </div>
    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import ProfileToolbar from './ProfileToolbar.vue'
import ProfileSidebar from './ProfileSidebar.vue'
import ProfileContent from './ProfileContent.vue'

// State
const currentView = ref('overview')
const isCollapsed = ref(false)
const sidebarWidth = ref(280)
const hasUnsavedChanges = ref(false)
const isSaving = ref(false)

// Drag handling for splitter
const isDragging = ref(false)
const dragStartX = ref(0)
const dragStartWidth = ref(0)

// View management
const handleViewChange = (view: string) => {
  if (hasUnsavedChanges.value) {
    if (!confirm('You have unsaved changes. Are you sure you want to continue?')) {
      return
    }
    hasUnsavedChanges.value = false
  }
  currentView.value = view
}

// Sidebar management
const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value
}

// Splitter drag handling
const startDragging = (event: MouseEvent) => {
  isDragging.value = true
  dragStartX.value = event.clientX
  dragStartWidth.value = sidebarWidth.value
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDragging)
  event.preventDefault()
}

const onDrag = (event: MouseEvent) => {
  if (!isDragging.value) return

  const deltaX = event.clientX - dragStartX.value
  const newWidth = Math.max(200, Math.min(500, dragStartWidth.value + deltaX))
  sidebarWidth.value = newWidth
}

const stopDragging = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDragging)
}

// Action handlers
const handleSave = async () => {
  isSaving.value = true
  try {
    // Simulate save operation
    await new Promise(resolve => setTimeout(resolve, 1000))
    hasUnsavedChanges.value = false
    // You would implement actual save logic here
  } catch (error) {
    console.error('Failed to save profile:', error)
  } finally {
    isSaving.value = false
  }
}

const handleReset = () => {
  if (confirm('Are you sure you want to reset all changes?')) {
    hasUnsavedChanges.value = false
    // Reset form data logic would go here
  }
}

const handleUnsavedChanges = (hasChanges: boolean) => {
  hasUnsavedChanges.value = hasChanges
}

const handleExportProfile = () => {
  // Export profile data logic
  console.log('Exporting profile data...')
}

const handleDeleteAccount = () => {
  if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
    // Delete account logic
    console.log('Deleting account...')
  }
}

onMounted(() => {
  // Load initial data if needed
})

onUnmounted(() => {
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDragging)
})
</script>

<style scoped>
.profile-root {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: calc(100vh - 54px);
}

.splitter-container {
  display: flex;
  position: relative;
  overflow: hidden;
  flex: 1 1 auto;
  min-height: 0;
}

.splitter {
  width: 5px;
  cursor: col-resize;
  background: var(--tblr-gray-50);
  transition: background-color 0.2s ease;
  z-index: 10;
  user-select: none;
  flex-shrink: 0;
}

.splitter:hover,
.splitter:focus {
  background-color: var(--tblr-gray-100);
}
</style>