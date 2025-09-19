<template>
  <div class="topbar d-flex justify-content-between align-items-center py-1 px-1 bg-body gap-1">
    <nav
      class="d-flex align-items-center flex-fill gap-1"
      role="toolbar"
    >
      <!-- Sidebar Toggle -->
      <button
        type="button"
        class="btn btn-sm nav-link-sized"
        :aria-label="isSidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'"
        @click="emit('toggleSidebar')"
      >
        <Icon
          icon="mdi:file-tree"
          width="20"
          height="20"
        />
        <span class="d-none d-lg-inline ms-1">Toggle Sidebar</span>
      </button>

      <!-- Profile Actions -->
      <div class="nav-segmented nav-sm ms-auto">
        <button
          type="button"
          class="nav-link"
          :class="{ active: currentView === 'overview' }"
          @click="emit('viewChange', 'overview')"
        >
          <Icon
            icon="tabler:user"
            class="me-1"
          />
          Overview
        </button>
        <button
          type="button"
          class="nav-link"
          :class="{ active: currentView === 'settings' }"
          @click="emit('viewChange', 'settings')"
        >
          <Icon
            icon="tabler:settings"
            class="me-1"
          />
          Settings
        </button>
        <button
          type="button"
          class="nav-link"
          :class="{ active: currentView === 'security' }"
          @click="emit('viewChange', 'security')"
        >
          <Icon
            icon="tabler:shield-lock"
            class="me-1"
          />
          Security
        </button>
      </div>
    </nav>

    <!-- Right Side Actions -->
    <nav class="d-flex align-items-center gap-1">
      <!-- Save Button -->
      <button
        v-if="hasUnsavedChanges"
        type="button"
        class="btn btn-primary btn-sm"
        :disabled="isSaving"
        @click="emit('save')"
      >
        <Icon
          :icon="isSaving ? 'tabler:loader-2' : 'tabler:device-floppy'"
          :class="isSaving ? 'spinner-border spinner-border-sm me-1' : 'me-1'"
        />
        {{ isSaving ? 'Saving...' : 'Save Changes' }}
      </button>

      <!-- Reset Button -->
      <button
        v-if="hasUnsavedChanges"
        type="button"
        class="btn btn-outline-secondary btn-sm"
        @click="emit('reset')"
      >
        <Icon
          icon="tabler:refresh"
          class="me-1"
        />
        Reset
      </button>

      <!-- Profile Actions Dropdown -->
      <div class="dropdown">
        <button
          type="button"
          class="btn btn-outline-secondary btn-sm dropdown-toggle"
          data-bs-toggle="dropdown"
          aria-haspopup="true"
          aria-expanded="false"
        >
          <Icon
            icon="tabler:dots-vertical"
            class="me-1"
          />
          Actions
        </button>
        <div class="dropdown-menu dropdown-menu-end">
          <a
            href="#"
            class="dropdown-item"
            @click="emit('exportProfile')"
          >
            <Icon
              icon="tabler:download"
              class="me-2"
            />
            Export Profile Data
          </a>
          <div class="dropdown-divider" />
          <a
            href="#"
            class="dropdown-item text-danger"
            @click="emit('deleteAccount')"
          >
            <Icon
              icon="tabler:trash"
              class="me-2"
            />
            Delete Account
          </a>
        </div>
      </div>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'

interface Props {
  currentView: string
  isSidebarCollapsed: boolean
  hasUnsavedChanges: boolean
  isSaving: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  toggleSidebar: []
  viewChange: [view: string]
  save: []
  reset: []
  exportProfile: []
  deleteAccount: []
}>()
</script>

<style scoped>
.nav-link-sized {
  /* Match the height and padding of nav-segmented nav-sm buttons */
  height: 1.8rem;
  /* Same as nav-sm */
  min-height: 1.8rem;
  padding: 0.370rem 0.75rem;
  /* Same padding as nav-link in nav-sm */
  border-radius: 4px;
  /* Match border radius */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: none;
  color: var(--tblr-body-color);
  text-decoration: none;
  transition: background-color 0.15s ease;
}

.nav-link-sized:hover {
  background-color: var(--tblr-gray-100);
}

.nav-link-sized:focus,
.nav-link-sized:hover {
  box-shadow: none;
}

/* Match button heights with AdminToolbar */
.btn-sm {
  height: 1.8rem;
  min-height: 1.8rem;
  padding: 0.370rem 0.75rem;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: none;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.spinner-border-sm {
  animation: spin 1s linear infinite;
}
</style>