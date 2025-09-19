<template>
  <div class="user-management-component">
    <!-- Statistics Cards -->
    <div class="row mb-4">
      <div class="col-sm-6 col-lg-3">
        <div class="card bg-body rounded-2 border-1 card-sm">
          <div class="card-body">
            <div class="row align-items-center">
              <div class="col-auto">
                <span class="bg-blue text-white avatar">
                  <Icon icon="tabler:users" />
                </span>
              </div>
              <div class="col">
                <div class="font-weight-medium">
                  {{ users.length }}
                </div>
                <div class="text-muted">
                  Total Users
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-sm-6 col-lg-3">
        <div class="card bg-body rounded-2 border-1 card-sm">
          <div class="card-body">
            <div class="row align-items-center">
              <div class="col-auto">
                <span class="bg-red text-white avatar">
                  <Icon icon="tabler:shield-check" />
                </span>
              </div>
              <div class="col">
                <div class="font-weight-medium">
                  {{ adminCount }}
                </div>
                <div class="text-muted">
                  Administrators
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-sm-6 col-lg-3">
        <div class="card bg-body rounded-2 border-1 card-sm">
          <div class="card-body">
            <div class="row align-items-center">
              <div class="col-auto">
                <span class="bg-green text-white avatar">
                  <Icon icon="tabler:user-check" />
                </span>
              </div>
              <div class="col">
                <div class="font-weight-medium">
                  {{ verifiedCount }}
                </div>
                <div class="text-muted">
                  Verified Users
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-sm-6 col-lg-3">
        <div class="card bg-body rounded-2 border-1 card-sm">
          <div class="card-body">
            <div class="row align-items-center">
              <div class="col-auto">
                <span class="bg-yellow text-white avatar">
                  <Icon icon="tabler:user-exclamation" />
                </span>
              </div>
              <div class="col">
                <div class="font-weight-medium">
                  {{ users.length - verifiedCount }}
                </div>
                <div class="text-muted">
                  Pending Verification
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Users Table -->
    <div class="card">
      <div class="card-header border-0 pb-0 bg-body">
        <div class="row w-100 align-items-center justify-content-between">
          <div class="col">
            <h3 class="card-title mb-0">
              <Icon
                icon="tabler:table"
                class="me-2"
              />
              Users Directory
            </h3>
          </div>
          <div class="col-auto p-0">
            <div class="dropdown">
              <a
                href="#"
                class="btn-action dropdown-toggle"
                data-bs-toggle="dropdown"
                aria-haspopup="true"
                aria-expanded="false"
              >
                <Icon icon="tabler:dots-vertical" />
              </a>
              <div class="dropdown-menu dropdown-menu-end">
                <a
                  href="#"
                  class="dropdown-item"
                  @click="exportUsers"
                >
                  <Icon
                    icon="tabler:download"
                    class="me-2"
                  />
                  Export Users
                </a>
                <div class="dropdown-divider" />
                <a
                  href="#"
                  class="dropdown-item"
                  @click="refreshUsers"
                >
                  <Icon
                    icon="tabler:refresh"
                    class="me-2"
                  />
                  Refresh Data
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="card-header bg-body">
        <!-- Search and Filter Bar -->
        <div class="row w-100 g-0">
          <div class="col-md-6 pe-2">
            <div class="form-group mb-3 mb-md-0">
              <div class="input-icon">
                <span class="input-icon-addon">
                  <Icon icon="tabler:search" />
                </span>
                <input
                  v-model="searchQuery"
                  type="text"
                  class="form-control"
                  placeholder="Search users..."
                >
              </div>
            </div>
          </div>
          <div class="col-md-6">
            <div class="row g-1">
              <div class="col-6">
                <select
                  v-model="sortBy"
                  class="form-select"
                >
                  <option value="name">
                    Sort by Name
                  </option>
                  <option value="email">
                    Sort by Email
                  </option>
                  <option value="role">
                    Sort by Role
                  </option>
                  <option value="createdAt">
                    Sort by Join Date
                  </option>
                </select>
              </div>
              <div class="col-6">
                <select
                  v-model="sortOrder"
                  class="form-select"
                >
                  <option value="asc">
                    Ascending
                  </option>
                  <option value="desc">
                    Descending
                  </option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="card-body p-0">
        <div
          v-if="!filteredUsers.length"
          class="empty"
        >
          <div class="empty-img">
            <Icon
              icon="tabler:users-off"
              size="128"
              class="text-muted"
            />
          </div>
          <p class="empty-title">
            No users found
          </p>
          <p class="empty-subtitle text-muted">
            Try adjusting your search criteria or filters
          </p>
          <div class="empty-action">
            <button
              class="btn btn-primary"
              @click="clearFilters"
            >
              <Icon
                icon="tabler:filter-off"
                class="me-1"
              />
              Clear filters
            </button>
          </div>
        </div>
        <div
          v-else
          class="table-responsive"
        >
          <table class="table table-vcenter card-table">
            <thead>
              <tr>
                <th class="w-1">
                  <input
                    id="select-all-users"
                    class="form-check-input m-0 align-middle"
                    type="checkbox"
                    aria-label="Select all users"
                  >
                  <label
                    for="select-all-users"
                    class="sr-only"
                  >Select all users</label>
                </th>
                <th>User</th>
                <th>Status</th>
                <th>Role</th>
                <th>Joined</th>
                <th>Last Seen</th>
                <th class="w-1" />
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="user in paginatedUsers"
                :key="user.id"
                class="user-row"
              >
                <td>
                  <input
                    :id="`user-${user.id}`"
                    class="form-check-input m-0 align-middle"
                    type="checkbox"
                    :aria-label="`Select user ${sanitizeText(user.name)}`"
                  >
                  <label
                    :for="`user-${user.id}`"
                    class="sr-only"
                  >Select {{ sanitizeText(user.name) }}</label>
                </td>
                <td>
                  <div class="d-flex py-1 align-items-center">
                    <span class="avatar avatar-md me-3">
                      {{ getUserInitials(user.name) }}
                    </span>
                    <div class="flex-fill">
                      <div
                        class="font-weight-medium"
                        v-text="sanitizeText(user.name)"
                      />
                      <div class="text-muted">
                        <a
                          href="#"
                          class="text-reset"
                          v-text="sanitizeText(user.email)"
                        />
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <div class="d-flex align-items-center">
                    <!-- Online Status Indicator -->
                    <span
                      class="status-dot me-2"
                      :class="getUserOnlineStatus(user.id)"
                      :title="isUserOnline(user.id) ? 'Online' : 'Offline'"
                    />
                    <!-- Verification Status -->
                    <span
                      class="status-dot"
                      :class="user.isVerified ? 'status-dot-animated bg-green' : 'bg-yellow'"
                      :title="user.isVerified ? 'Verified' : 'Unverified'"
                    />
                    <span class="ms-2">{{ user.isVerified ? 'Verified' : 'Pending' }}</span>
                  </div>
                </td>
                <td>
                  <span
                    class="badge"
                    :class="getRoleBadgeClass(user.role)"
                  >
                    <Icon
                      :icon="getRoleIcon(user.role)"
                      class="me-1"
                      size="14"
                    />
                    {{ user.role.charAt(0).toUpperCase() + user.role.slice(1) }}
                  </span>
                </td>
                <td class="text-muted">
                  <div>{{ formatDate(user.createdAt) }}</div>
                  <div class="small">
                    {{ formatRelativeTime(user.createdAt) }}
                  </div>
                </td>
                <td>
                  <div class="d-flex align-items-center">
                    <span
                      class="activity-status-dot me-2"
                      :class="getActivityStatusClass(user.activityStatus)"
                    />
                    <div>
                      <div :class="getActivityTextClass(user.activityStatus)">
                        {{ getActivityStatusText(user.activityStatus, user.lastLoginAt) }}
                      </div>
                      <div
                        v-if="user.lastLoginAt && user.activityStatus !== 'Never'"
                        class="small text-muted"
                      >
                        {{ formatRelativeTime(user.lastLoginAt) }}
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <div class="dropdown">
                    <button
                      class="btn btn-ghost-secondary btn-sm dropdown-toggle"
                      data-bs-toggle="dropdown"
                      aria-expanded="false"
                      :disabled="isUpdating"
                    >
                      <Icon icon="tabler:dots-vertical" />
                    </button>
                    <div class="dropdown-menu dropdown-menu-end">
                      <h6 class="dropdown-header">
                        User Actions
                      </h6>
                      <a
                        href="#"
                        class="dropdown-item"
                      >
                        <Icon
                          icon="tabler:eye"
                          class="me-2"
                        />
                        View Profile
                      </a>
                      <a
                        href="#"
                        class="dropdown-item"
                      >
                        <Icon
                          icon="tabler:edit"
                          class="me-2"
                        />
                        Edit User
                      </a>
                      <div class="dropdown-divider" />
                      <h6 class="dropdown-header">
                        Role Management
                      </h6>
                      <template v-if="user.role === 'user'">
                        <a
                          href="#"
                          class="dropdown-item text-primary"
                          @click="makeAdmin(user)"
                        >
                          <Icon
                            icon="tabler:shield-up"
                            class="me-2"
                          />
                          Promote to Admin
                        </a>
                      </template>
                      <template v-else>
                        <a
                          href="#"
                          class="dropdown-item text-warning"
                          @click="removeAdmin(user)"
                        >
                          <Icon
                            icon="tabler:shield-down"
                            class="me-2"
                          />
                          Remove Admin Rights
                        </a>
                      </template>
                      <div class="dropdown-divider" />
                      <a
                        href="#"
                        class="dropdown-item text-danger"
                      >
                        <Icon
                          icon="tabler:user-minus"
                          class="me-2"
                        />
                        Suspend User
                      </a>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div
      v-if="filteredUsers.length > 0"
      class="d-flex justify-content-between align-items-center mt-4"
    >
      <div class="text-muted">
        Showing {{ Math.min(currentPage * itemsPerPage, filteredUsers.length) }} of {{ filteredUsers.length }} users
      </div>
      <nav aria-label="Page navigation">
        <ul class="pagination pagination-sm">
          <li
            class="page-item"
            :class="{ disabled: currentPage === 1 }"
          >
            <a
              class="page-link"
              href="#"
              @click.prevent="currentPage > 1 && (currentPage--)"
            >
              <Icon icon="tabler:chevron-left" />
              Previous
            </a>
          </li>
          <li
            v-for="page in totalPages"
            :key="page"
            class="page-item"
            :class="{ active: page === currentPage }"
          >
            <a
              class="page-link"
              href="#"
              @click.prevent="currentPage = page"
            >{{ page }}</a>
          </li>
          <li
            class="page-item"
            :class="{ disabled: currentPage === totalPages }"
          >
            <a
              class="page-link"
              href="#"
              @click.prevent="currentPage < totalPages && (currentPage++)"
            >
              Next
              <Icon icon="tabler:chevron-right" />
            </a>
          </li>
        </ul>
      </nav>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { Icon } from '@iconify/vue'
import api from '@/api/axios'
import { useAuthStore } from '@/stores/auth'
import adminWebSocketService from '@/services/adminWebSocketService'
import globalWebSocketService from '@/services/globalWebSocketService'

// Utility function for sanitizing text
const sanitizeText = (text: string | undefined | null): string => {
  if (!text) return ''
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Authorization helper
const hasPermission = (_permission: string): boolean => {
  const authStore = useAuthStore()
  return authStore.user?.role === 'admin'
}

// CSRF token helper (assuming it's available globally or from a store)
const getCSRFToken = (): string => {
  return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
}

// Types
interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'user'
  isVerified: boolean
  isSuspended?: boolean
  createdAt: string
  lastLoginAt?: string
  activityStatus?: string
  minutesSinceLogin?: number
  phone?: string
}

interface Props {
  searchQuery?: string
  timeRange?: string
  autoRefresh?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  searchQuery: '',
  timeRange: 'last_hour',
  autoRefresh: true
})

const emit = defineEmits<{
  error: [message: string]
  success: [message: string]
  loading: [isLoading: boolean]
}>()

// Reactive state
const users = ref<User[]>([])
const searchQuery = ref(props.searchQuery)
const isUpdating = ref(false)
const sortBy = ref('name')
const sortOrder = ref('asc')
const isConnectedToWebSocket = computed(() => adminWebSocketService.isConnected.value)

// Online status tracking
const onlineUsers = ref<Set<string>>(new Set())

// Pagination
const currentPage = ref(1)
const itemsPerPage = ref(10)

// Watch for external search query changes
watch(() => props.searchQuery, (newValue) => {
  searchQuery.value = newValue
})

// Optimized user counts with single pass through array and memoization
const userCounts = computed(() => {
  let adminCount = 0
  let verifiedCount = 0

  const userList = users.value
  if (Array.isArray(userList)) {
    // Use more efficient iteration
    userList.forEach(user => {
      if (user.role === 'admin') adminCount++
      if (user.isVerified) verifiedCount++
    })
  }

  return { adminCount, verifiedCount }
})

const adminCount = computed(() => userCounts.value.adminCount)
const verifiedCount = computed(() => userCounts.value.verifiedCount)

// Filtered and sorted users
const filteredUsers = computed(() => {
  if (!Array.isArray(users.value)) {
    return []
  }

  let filtered = [...users.value]

  // Apply search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(user =>
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query)
    )
  }

  // Apply sorting with optimized comparison
  filtered.sort((a, b) => {
    const getComparableValue = (user: User, field: string) => {
      const value = user[field as keyof User] as string
      if (field === 'createdAt' || field === 'lastLoginAt') {
        return new Date(value || 0).getTime()
      }
      return value?.toLowerCase() || ''
    }

    const aValue = getComparableValue(a, sortBy.value)
    const bValue = getComparableValue(b, sortBy.value)

    let comparison: number
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      comparison = aValue - bValue
    } else {
      comparison = String(aValue).localeCompare(String(bValue))
    }

    return sortOrder.value === 'asc' ? comparison : -comparison
  })

  return filtered
})

// Pagination computed
const totalPages = computed(() => Math.ceil(filteredUsers.value.length / itemsPerPage.value))
const paginatedUsers = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  return filteredUsers.value.slice(start, start + itemsPerPage.value)
})

// Utility functions
const getUserInitials = (name: string) => {
  return name.split(' ').map(n => n.charAt(0)).join('').substring(0, 2).toUpperCase()
}

const getRoleBadgeClass = (role: string) => {
  return role === 'admin' ? 'bg-red-lt text-red' : 'bg-blue-lt text-blue'
}

const getRoleIcon = (role: string) => {
  return role === 'admin' ? 'tabler:shield-check' : 'tabler:user'
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const formatRelativeTime = (dateString: string) => {
  const now = new Date()
  const date = new Date(dateString)
  const diffInMs = now.getTime() - date.getTime()
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

  if (diffInDays === 0) return 'Today'
  if (diffInDays === 1) return 'Yesterday'
  if (diffInDays < 7) return `${diffInDays} days ago`
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`
  if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`
  return `${Math.floor(diffInDays / 365)} years ago`
}

// Activity status helpers
const getActivityStatusClass = (status?: string) => {
  switch (status) {
    case 'Online':
      return 'bg-green'
    case 'Recently':
      return 'bg-yellow'
    case 'Today':
      return 'bg-blue'
    case 'This week':
      return 'bg-orange'
    case 'This month':
      return 'bg-purple'
    case 'Never':
      return 'bg-gray'
    default:
      return 'bg-gray'
  }
}

const getActivityTextClass = (status?: string) => {
  switch (status) {
    case 'Online':
      return 'text-green fw-bold'
    case 'Recently':
      return 'text-yellow fw-medium'
    case 'Today':
      return 'text-blue'
    case 'This week':
      return 'text-orange'
    case 'This month':
      return 'text-purple'
    case 'Never':
      return 'text-muted'
    default:
      return 'text-muted'
  }
}

const getActivityStatusText = (status?: string, lastLoginAt?: string) => {
  if (!status) return 'Unknown'
  if (status === 'Never') return 'Never logged in'
  if (status === 'Online') return 'Online now'
  if (status === 'Recently') return 'Active recently'
  if (lastLoginAt) {
    return `${status} - ${formatDate(lastLoginAt)}`
  }
  return status
}

// Online status functions
const isUserOnline = (userId: string): boolean => {
  return onlineUsers.value.has(userId)
}

const getUserOnlineStatus = (userId: string): string => {
  const isOnline = isUserOnline(userId)
  return isOnline ? 'bg-green status-dot-animated' : 'bg-gray'
}

// Actions
const refreshUsers = async () => {
  emit('loading', true)

  try {
    const response = await api.get('/admin/users')
    users.value = response.data.users || []
    //emit('success', 'Users refreshed successfully')
  } catch (err: any) {
    emit('error', err.response?.data?.message || 'Failed to load users')
  } finally {
    emit('loading', false)
  }
}

const makeAdmin = async (user: User) => {
  // Add authorization check
  if (!hasPermission('MANAGE_USERS')) {
    emit('error', 'Insufficient permissions to manage user roles')
    return
  }

  isUpdating.value = true

  try {
    const csrfToken = getCSRFToken()
    await api.post(
      `/admin/users/${user.id}/make-admin`,
      {},
      {
        headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {}
      }
    )
    user.role = 'admin'
    // emit('success', `${sanitizeText(user.name)} has been promoted to administrator`)
  } catch (err: any) {
    emit('error', err.response?.data?.message || 'Failed to update user role')
  } finally {
    isUpdating.value = false
  }
}

const removeAdmin = async (user: User) => {
  // Add authorization check
  if (!hasPermission('MANAGE_USERS')) {
    emit('error', 'Insufficient permissions to manage user roles')
    return
  }

  isUpdating.value = true

  try {
    const csrfToken = getCSRFToken()
    await api.post(
      `/admin/users/${user.id}/remove-admin`,
      {},
      {
        headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {}
      }
    )
    user.role = 'user'
    //emit('success', `${sanitizeText(user.name)}'s admin privileges have been removed`)
  } catch (err: any) {
    emit('error', err.response?.data?.message || 'Failed to update user role')
  } finally {
    isUpdating.value = false
  }
}

const clearFilters = () => {
  searchQuery.value = ''
  currentPage.value = 1
}

const exportUsers = async () => {
  try {
    const response = await api.get('/admin/users/export', {
      responseType: 'blob',
      headers: {
        'Accept': 'text/csv'
      }
    })

    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `users-export-${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)

    emit('success', 'Users exported successfully')
  } catch (_err: any) {
    emit('error', 'Failed to export users')
  }
}

// WebSocket event handlers
const handleUserStatistics = (_data: any) => {
  // Update user counts based on WebSocket data
  // console.log('User statistics updated:', data)
}

const handleUserAction = (data: any) => {
  // console.log('User action received:', data)

  switch (data.action) {
    case 'admin_granted':
    case 'admin_revoked':
    case 'user_suspended':
    case 'user_reactivated':
    case 'user_deleted':
    case 'user_login':
      // Refresh user list when actions occur
      refreshUsers()
      break
  }

  //emit('success', `User action: ${data.action}`)
}

// Online status WebSocket handlers
const handleUserOnline = (data: { userId: string }) => {
  onlineUsers.value.add(data.userId)
}

const handleUserOffline = (data: { userId: string }) => {
  onlineUsers.value.delete(data.userId)
}

const handleOnlineUsersList = (data: { userIds: string[] }) => {
  onlineUsers.value = new Set(data.userIds)
}

// Lifecycle
onMounted(() => {
  // Set up WebSocket listeners for admin data
  adminWebSocketService.on('user_statistics_updated', handleUserStatistics)
  adminWebSocketService.on('user_action', handleUserAction)

  // Listen to global WebSocket for online status updates (all users use this)
  globalWebSocketService.on('user_online', handleUserOnline)
  globalWebSocketService.on('user_offline', handleUserOffline)
  globalWebSocketService.on('online_users_list', handleOnlineUsersList)

  refreshUsers()

  // Connect to WebSocket if not already connected
  if (!isConnectedToWebSocket.value) {
    adminWebSocketService.connect().catch(error => {
      console.warn('Failed to connect to WebSocket for user management:', error)
    })
  }

  // Set up WebSocket authentication when connection is established
  const authStore = useAuthStore()

  // Watch for WebSocket connection changes and authenticate
  watch(isConnectedToWebSocket, (isConnected) => {
    if (isConnected && authStore.user?.id) {
      adminWebSocketService.send({
        type: 'authenticate',
        userId: authStore.user.id
      })
    }
  }, { immediate: true })
})

onUnmounted(() => {
  // Remove WebSocket listeners
  adminWebSocketService.off('user_statistics_updated', handleUserStatistics)
  adminWebSocketService.off('user_action', handleUserAction)

  // Remove global WebSocket listeners
  globalWebSocketService.off('user_online', handleUserOnline)
  globalWebSocketService.off('user_offline', handleUserOffline)
  globalWebSocketService.off('online_users_list', handleOnlineUsersList)
})

// Expose utilities for template use
defineExpose({
  sanitizeText,
  hasPermission
})
</script>

<style scoped>
.user-row:hover {
  background-color: var(--tblr-gray-50);
}

.status-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  display: inline-block;
}

.activity-status-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}

.activity-status-dot.bg-green {
  background-color: var(--tblr-green);
  animation: pulse-green 2s infinite;
}

.activity-status-dot.bg-yellow {
  background-color: var(--tblr-yellow);
}

.activity-status-dot.bg-blue {
  background-color: var(--tblr-blue);
}

.activity-status-dot.bg-orange {
  background-color: var(--tblr-orange);
}

.activity-status-dot.bg-purple {
  background-color: var(--tblr-purple);
}

.activity-status-dot.bg-gray {
  background-color: var(--tblr-gray-500);
}

.activity-status-dot.bg-red {
  background-color: var(--tblr-red);
}

.status-dot-animated {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

@keyframes pulse-green {
  0%, 100% {
    opacity: 1;
    box-shadow: 0 0 0 0 rgba(var(--tblr-green-rgb), 0.7);
  }
  50% {
    opacity: 0.8;
    box-shadow: 0 0 0 4px rgba(var(--tblr-green-rgb), 0);
  }
}

.card-sm {
  transition: transform 0.2s ease-in-out;
}

.card-sm:hover {
  transform: translateY(-2px);
}

/* Fix dropdown positioning and visibility */
.dropdown-menu {
  z-index: 1050 !important;
}

/* Ensure table allows dropdowns to overflow */
.table-responsive {
  overflow: visible !important;
}

/* For dropdowns in table rows that might be cut off */
.dropdown {
  position: relative;
}

/* Fix for dropdowns near bottom of container */
.dropdown-menu.show {
  max-height: 300px;
  overflow-y: auto;
}
</style>