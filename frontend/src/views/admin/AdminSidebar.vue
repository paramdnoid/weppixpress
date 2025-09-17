<template>
  <aside
    class="border-end sidebar"
    :class="{ 'w-0': isCollapsed }"
    :style="sidebarStyle"
    :aria-hidden="isCollapsed"
  >
    <div class="col-docs flex-fill">
      <nav class="nav nav-vertical">
        <!-- Admin Navigation -->
        <div class="nav-section">
          <div class="nav-section-title">
            <Icon
              icon="tabler:shield-check"
              class="me-2"
            />
            Administration
          </div>

          <!-- Dashboard -->
          <a
            href="#"
            class="nav-link"
            :class="{ active: currentView === 'dashboard' }"
            @click.prevent="$emit('viewSelect', 'dashboard')"
          >
            <Icon
              icon="tabler:dashboard"
              class="nav-icon"
            />
            <span class="nav-title">Dashboard</span>
            <span class="nav-subtitle">System overview & metrics</span>
          </a>

          <!-- Error Analytics -->
          <a
            href="#"
            class="nav-link"
            :class="{ active: currentView === 'analytics' }"
            @click.prevent="$emit('viewSelect', 'analytics')"
          >
            <Icon
              icon="tabler:chart-line"
              class="nav-icon"
            />
            <span class="nav-title">Error Analytics</span>
            <span class="nav-subtitle">Error monitoring & analysis</span>
          </a>

          <!-- User Management -->
          <a
            href="#"
            class="nav-link"
            :class="{ active: currentView === 'users' }"
            @click.prevent="$emit('viewSelect', 'users')"
          >
            <Icon
              icon="tabler:users"
              class="nav-icon"
            />
            <span class="nav-title">User Management</span>
            <span class="nav-subtitle">Manage users & permissions</span>
          </a>
        </div>

        <!-- System Status -->
        <div class="nav-section mt-4">
          <div class="nav-section-title">
            <Icon
              icon="tabler:server"
              class="me-2"
            />
            System Status
          </div>

          <div class="nav-item-status">
            <div class="d-flex align-items-center justify-content-between">
              <div class="d-flex align-items-center">
                <div class="status-dot bg-green me-2" />
                <span class="small">System Health</span>
              </div>
              <span class="badge bg-green-lt text-green">Healthy</span>
            </div>
          </div>

          <div class="nav-item-status">
            <div class="d-flex align-items-center justify-content-between">
              <div class="d-flex align-items-center">
                <div class="status-dot bg-yellow me-2" />
                <span class="small">CPU Usage</span>
              </div>
              <span class="badge bg-yellow-lt text-yellow">75%</span>
            </div>
          </div>

          <div class="nav-item-status">
            <div class="d-flex align-items-center justify-content-between">
              <div class="d-flex align-items-center">
                <div class="status-dot bg-blue me-2" />
                <span class="small">Memory</span>
              </div>
              <span class="badge bg-blue-lt text-blue">60%</span>
            </div>
          </div>

          <div class="nav-item-status">
            <div class="d-flex align-items-center justify-content-between">
              <div class="d-flex align-items-center">
                <div class="status-dot bg-red me-2" />
                <span class="small">Errors (24h)</span>
              </div>
              <span class="badge bg-red-lt text-red">12</span>
            </div>
          </div>
        </div>

        <!-- Quick Stats -->
        <div class="nav-section mt-4">
          <div class="nav-section-title">
            <Icon
              icon="tabler:chart-bar"
              class="me-2"
            />
            Quick Stats
          </div>

          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-value">
                247
              </div>
              <div class="stat-label">
                Total Users
              </div>
            </div>
            <div class="stat-item">
              <div class="stat-value">
                15
              </div>
              <div class="stat-label">
                Admins
              </div>
            </div>
            <div class="stat-item">
              <div class="stat-value">
                1.2k
              </div>
              <div class="stat-label">
                Req/Min
              </div>
            </div>
            <div class="stat-item">
              <div class="stat-value">
                99.8%
              </div>
              <div class="stat-label">
                Uptime
              </div>
            </div>
          </div>
        </div>

        <!-- Recent Activity -->
        <div class="nav-section mt-4">
          <div class="nav-section-title">
            <Icon
              icon="tabler:activity"
              class="me-2"
            />
            Recent Activity
          </div>

          <div class="activity-list">
            <div class="activity-item">
              <div class="activity-icon bg-green-lt">
                <Icon
                  icon="tabler:user-plus"
                  size="14"
                />
              </div>
              <div class="activity-content">
                <div class="activity-text">
                  New user registered
                </div>
                <div class="activity-time">
                  2 minutes ago
                </div>
              </div>
            </div>

            <div class="activity-item">
              <div class="activity-icon bg-blue-lt">
                <Icon
                  icon="tabler:database-export"
                  size="14"
                />
              </div>
              <div class="activity-content">
                <div class="activity-text">
                  System backup completed
                </div>
                <div class="activity-time">
                  1 hour ago
                </div>
              </div>
            </div>

            <div class="activity-item">
              <div class="activity-icon bg-yellow-lt">
                <Icon
                  icon="tabler:alert-triangle"
                  size="14"
                />
              </div>
              <div class="activity-content">
                <div class="activity-text">
                  High memory usage detected
                </div>
                <div class="activity-time">
                  3 hours ago
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'

interface Props {
  isCollapsed: boolean
  width: number
  currentView: string
}

const props = defineProps<Props>()

defineEmits<{
  viewSelect: [view: string]
}>()

const sidebarStyle = computed(() => {
  if (props.isCollapsed) {
    return { width: '0px', minWidth: '0px' }
  }
  return { width: `${props.width}px`, minWidth: `${props.width}px` }
})
</script>

<style scoped>
.sidebar {
  background-color: var(--tblr-bg-surface);
  transition: width 0.3s ease;
  overflow: hidden;
  border-right: 1px solid var(--tblr-border-color);
}

.col-docs {
  padding: 1rem;
  height: 100%;
  overflow-y: auto;
}

.nav-vertical {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.nav-section {
  margin-bottom: 1rem;
}

.nav-section-title {
  display: flex;
  align-items: center;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--tblr-text-muted);
  margin-bottom: 0.5rem;
  padding: 0 0.75rem;
  letter-spacing: 0.05em;
}

.nav-link {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 0.75rem;
  border-radius: var(--tblr-border-radius);
  color: var(--tblr-body-color);
  text-decoration: none;
  transition: all 0.2s ease;
  border: 1px solid transparent;
  margin-bottom: 0.25rem;
}

.nav-link:hover {
  background-color: var(--tblr-gray-100);
  color: var(--tblr-body-color);
}

.nav-link.active {
  background-color: var(--tblr-primary);
  color: white;
  border-color: var(--tblr-primary);
  box-shadow: 0 2px 4px rgba(var(--tblr-primary-rgb), 0.25);
}

.nav-icon {
  font-size: 1.25rem;
  margin-bottom: 0.25rem;
}

.nav-title {
  font-weight: 600;
  font-size: 0.875rem;
  margin-bottom: 0.125rem;
}

.nav-subtitle {
  font-size: 0.75rem;
  opacity: 0.8;
  line-height: 1.2;
}

.nav-link.active .nav-subtitle {
  opacity: 0.9;
}

.nav-item-status {
  padding: 0.5rem 0.75rem;
  margin-bottom: 0.25rem;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.stat-item {
  text-align: center;
  padding: 0.75rem 0.5rem;
  background-color: var(--tblr-bg-surface-secondary);
  border-radius: var(--tblr-border-radius);
  border: 1px solid var(--tblr-border-color);
}

.stat-value {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--tblr-primary);
  margin-bottom: 0.125rem;
}

.stat-label {
  font-size: 0.75rem;
  color: var(--tblr-text-muted);
  font-weight: 500;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.activity-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.5rem;
  background-color: var(--tblr-bg-surface-secondary);
  border-radius: var(--tblr-border-radius);
  border: 1px solid var(--tblr-border-color);
}

.activity-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.activity-content {
  flex: 1;
  min-width: 0;
}

.activity-text {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--tblr-body-color);
  margin-bottom: 0.125rem;
}

.activity-time {
  font-size: 0.75rem;
  color: var(--tblr-text-muted);
}

/* Scrollbar styling */
.col-docs::-webkit-scrollbar {
  width: 4px;
}

.col-docs::-webkit-scrollbar-track {
  background: transparent;
}

.col-docs::-webkit-scrollbar-thumb {
  background: var(--tblr-border-color);
  border-radius: 2px;
}

.col-docs::-webkit-scrollbar-thumb:hover {
  background: var(--tblr-gray-400);
}
</style>