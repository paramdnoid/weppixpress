<template>
  <div class="profile-sidebar border-end d-flex flex-column"
    :style="{ width: isCollapsed ? '0px' : width + 'px' }">
    <div v-show="!isCollapsed" class="sidebar-content flex-fill overflow-auto">
      <!-- Navigation Menu -->
      <nav class="profile-nav">
        <div class="nav-section">
          <div class="nav-section-title">Profile</div>
          <a href="#" class="nav-item" :class="{ active: currentView === 'overview' }"
            @click.prevent="$emit('viewSelect', 'overview')">
            <Icon icon="tabler:user" class="nav-item-icon" />
            <span class="nav-item-text">Overview</span>
          </a>
          <a href="#" class="nav-item" :class="{ active: currentView === 'personal' }"
            @click.prevent="$emit('viewSelect', 'personal')">
            <Icon icon="tabler:user-edit" class="nav-item-icon" />
            <span class="nav-item-text">Personal Info</span>
          </a>
          <a href="#" class="nav-item" :class="{ active: currentView === 'avatar' }"
            @click.prevent="$emit('viewSelect', 'avatar')">
            <Icon icon="tabler:camera" class="nav-item-icon" />
            <span class="nav-item-text">Avatar & Photo</span>
          </a>
        </div>

        <div class="nav-section">
          <div class="nav-section-title">Account</div>
          <a href="#" class="nav-item" :class="{ active: currentView === 'settings' }"
            @click.prevent="$emit('viewSelect', 'settings')">
            <Icon icon="tabler:settings" class="nav-item-icon" />
            <span class="nav-item-text">Settings</span>
          </a>
          <a href="#" class="nav-item" :class="{ active: currentView === 'notifications' }"
            @click.prevent="$emit('viewSelect', 'notifications')">
            <Icon icon="tabler:bell" class="nav-item-icon" />
            <span class="nav-item-text">Notifications</span>
          </a>
          <a href="#" class="nav-item" :class="{ active: currentView === 'preferences' }"
            @click.prevent="$emit('viewSelect', 'preferences')">
            <Icon icon="tabler:palette" class="nav-item-icon" />
            <span class="nav-item-text">Preferences</span>
          </a>
        </div>

        <div class="nav-section">
          <div class="nav-section-title">Security</div>
          <a href="#" class="nav-item" :class="{ active: currentView === 'security' }"
            @click.prevent="$emit('viewSelect', 'security')">
            <Icon icon="tabler:shield-lock" class="nav-item-icon" />
            <span class="nav-item-text">Security</span>
          </a>
          <a href="#" class="nav-item" :class="{ active: currentView === 'password' }"
            @click.prevent="$emit('viewSelect', 'password')">
            <Icon icon="tabler:key" class="nav-item-icon" />
            <span class="nav-item-text">Change Password</span>
          </a>
          <a href="#" class="nav-item" :class="{ active: currentView === 'sessions' }"
            @click.prevent="$emit('viewSelect', 'sessions')">
            <Icon icon="tabler:device-desktop" class="nav-item-icon" />
            <span class="nav-item-text">Active Sessions</span>
          </a>
        </div>

        <div class="nav-section">
          <div class="nav-section-title">Data</div>
          <a href="#" class="nav-item" :class="{ active: currentView === 'privacy' }"
            @click.prevent="$emit('viewSelect', 'privacy')">
            <Icon icon="tabler:shield-check" class="nav-item-icon" />
            <span class="nav-item-text">Privacy</span>
          </a>
          <a href="#" class="nav-item" :class="{ active: currentView === 'export' }"
            @click.prevent="$emit('viewSelect', 'export')">
            <Icon icon="tabler:download" class="nav-item-icon" />
            <span class="nav-item-text">Export Data</span>
          </a>
          <a href="#" class="nav-item danger" :class="{ active: currentView === 'delete' }"
            @click.prevent="$emit('viewSelect', 'delete')">
            <Icon icon="tabler:trash" class="nav-item-icon" />
            <span class="nav-item-text">Delete Account</span>
          </a>
        </div>
      </nav>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'

interface Props {
  isCollapsed: boolean
  width: number
  currentView: string
}

defineProps<Props>()

defineEmits<{
  viewSelect: [view: string]
}>()
</script>

<style scoped>
.profile-sidebar {
  min-width: 300px !important;
  transition: width 0.3s ease;
  overflow: hidden;
}

.profile-overview {
  background: var(--tblr-bg-surface);
}

.avatar-xl {
  width: 4rem;
  height: 4rem;
  margin: 0 auto;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.avatar-text {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: 600;
  border-radius: 50%;
}

.profile-nav {
  padding: 0.5rem 0;
}

.nav-section {
  margin-bottom: 1rem;
}

.nav-section-title {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--tblr-text-muted);
  letter-spacing: 0.05em;
  padding: 0.5rem 1rem;
  margin-bottom: 0.25rem;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 0.5rem 1rem;
  color: var(--tblr-body-color);
  text-decoration: none;
  transition: all 0.15s ease;
  border-left: 3px solid transparent;
}

.nav-item:hover {
  background-color: var(--tblr-gray-50);
  color: var(--tblr-body-color);
  text-decoration: none;
}

.nav-item.active {
  background-color: var(--tblr-primary-lt);
  color: var(--tblr-primary);
  border-left-color: var(--tblr-primary);
  font-weight: 500;
}

.nav-item.danger {
  color: var(--tblr-red);
}

.nav-item.danger:hover {
  background-color: var(--tblr-red-lt);
  color: var(--tblr-red);
}

.nav-item.danger.active {
  background-color: var(--tblr-red-lt);
  border-left-color: var(--tblr-red);
}

.nav-item-icon {
  width: 1.125rem;
  height: 1.125rem;
  margin-right: 0.75rem;
  flex-shrink: 0;
}

.nav-item-text {
  flex: 1;
  font-size: 0.875rem;
}

/* Scrollbar styling */
.sidebar-content::-webkit-scrollbar {
  width: 6px;
}

.sidebar-content::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-content::-webkit-scrollbar-thumb {
  background: var(--tblr-border-color);
  border-radius: 3px;
}

.sidebar-content::-webkit-scrollbar-thumb:hover {
  background: var(--tblr-gray-400);
}
</style>