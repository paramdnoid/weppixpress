<template>
  <div class="admin-content flex-fill">
    <!-- Page Header -->
    <div class="page-header d-print-none m-0">
      <div class="container-fluid">
        <div class="row align-items-center">
          <div class="col">
            <div class="page-pretitle">
              Administration
            </div>
            <h2 class="page-title">
              <Icon
                :icon="getCurrentViewIcon()"
                class="me-2"
              />
              {{ getCurrentViewTitle() }}
            </h2>
            <div class="text-muted mt-1">
              {{ getCurrentViewDescription() }}
            </div>
          </div>
          <div class="col-auto d-print-none">
            <div class="btn-list">
              <span
                v-if="isLoading"
                class="badge bg-blue"
              >
                <Icon
                  icon="tabler:loader-2"
                  class="spinner me-1"
                />
                Loading...
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>


    <!-- Dynamic Content Area -->
    <div class="page-body">
      <div class="container-fluid">
        <!-- Dashboard View -->
        <div
          v-if="currentView === 'dashboard'"
          class="view-content"
        >
          <DashboardComponent
            :search-query="searchQuery"
            :time-range="timeRange"
            :auto-refresh="autoRefresh"
            @error="handleError"
            @success="handleSuccess"
            @loading="handleLoading"
          />
        </div>

        <!-- Error Analytics View -->
        <div
          v-if="currentView === 'analytics'"
          class="view-content"
        >
          <ErrorAnalyticsComponent
            :search-query="searchQuery"
            :time-range="timeRange"
            :auto-refresh="autoRefresh"
            @error="handleError"
            @success="handleSuccess"
            @loading="handleLoading"
          />
        </div>

        <!-- User Management View -->
        <div
          v-if="currentView === 'users'"
          class="view-content"
        >
          <UserManagementComponent
            :search-query="searchQuery"
            :time-range="timeRange"
            :auto-refresh="autoRefresh"
            @error="handleError"
            @success="handleSuccess"
            @loading="handleLoading"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import DashboardComponent from '@/components/admin/DashboardComponent.vue'
import ErrorAnalyticsComponent from '@/components/admin/ErrorAnalyticsComponent.vue'
import UserManagementComponent from '@/components/admin/UserManagementComponent.vue'

interface Props {
  currentView: string
  searchQuery: string
  timeRange: string
  autoRefresh: boolean
  isLoading: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  error: [message: string]
  success: [message: string]
  loading: [isLoading: boolean]
}>()

// View configuration
const viewConfig = {
  dashboard: {
    icon: 'tabler:dashboard',
    title: 'Dashboard',
    description: 'Comprehensive system monitoring and analytics overview'
  },
  analytics: {
    icon: 'tabler:chart-line',
    title: 'Error Analytics',
    description: 'Real-time error monitoring, analysis and trending insights'
  },
  users: {
    icon: 'tabler:users',
    title: 'User Management',
    description: 'Manage users, roles, and permissions across your organization'
  }
}

// Helper functions
const getCurrentViewIcon = () => {
  return viewConfig[props.currentView as keyof typeof viewConfig]?.icon || 'tabler:dashboard'
}

const getCurrentViewTitle = () => {
  return viewConfig[props.currentView as keyof typeof viewConfig]?.title || 'Dashboard'
}

const getCurrentViewDescription = () => {
  return viewConfig[props.currentView as keyof typeof viewConfig]?.description || ''
}

// Event handlers
const handleError = (message: string) => {
  if (typeof window !== 'undefined' && window.$toast) {
    window.$toast(message, { type: 'danger' })
  }
  emit('error', message)
}

const handleSuccess = (message: string) => {
  if (typeof window !== 'undefined' && window.$toast) {
    window.$toast(message, { type: 'success' })
  }
  emit('success', message)
}

const handleLoading = (loading: boolean) => {
  emit('loading', loading)
}
</script>

<style scoped>
.admin-content {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: var(--tblr-bg-surface);
}

.page-header {
  padding: 1rem 0;
  background-color: var(--tblr-bg-surface);
  border-bottom: 1px solid var(--tblr-border-color);
}

.page-pretitle {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--tblr-text-muted);
  letter-spacing: 0.05em;
  margin-bottom: 0.25rem;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--tblr-body-color);
  margin: 0;
  display: flex;
  align-items: center;
}

.page-body {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}

.view-content {
  animation: slideInUp 0.4s ease-out;
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.alert-dismissible {
  border-left: 4px solid var(--tblr-primary);
  border-radius: var(--tblr-border-radius);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.alert-danger {
  border-left-color: var(--tblr-danger);
  background-color: rgba(var(--tblr-danger-rgb), 0.05);
}

.alert-success {
  border-left-color: var(--tblr-success);
  background-color: rgba(var(--tblr-success-rgb), 0.05);
}

/* Scrollbar styling */
.page-body::-webkit-scrollbar {
  width: 6px;
}

.page-body::-webkit-scrollbar-track {
  background: transparent;
}

.page-body::-webkit-scrollbar-thumb {
  background: var(--tblr-border-color);
  border-radius: 3px;
}

.page-body::-webkit-scrollbar-thumb:hover {
  background: var(--tblr-gray-400);
}
</style>