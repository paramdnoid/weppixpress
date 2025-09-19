<template>
  <div class="user-management-component">
    <!-- Statistics Cards -->
    <div class="row mb-4">
      <div class="col-sm-6 col-lg-3">
        <div class="card card-sm">
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
        <div class="card card-sm">
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
        <div class="card card-sm">
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
        <div class="card card-sm">
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

    <!-- Search and Filter Bar -->
    <div class="card mb-4">
      <div class="card-body">
        <div class="row">
          <div class="col-md-6">
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
            <div class="row">
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
    </div>

    <!-- Users Table -->
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">
          <Icon
            icon="tabler:table"
            class="me-2"
          />
          Users Directory
        </h3>
        <div class="card-actions">
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
                <th>Contact</th>
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
                  <div>
                    <div class="text-muted">
                      <Icon
                        icon="tabler:mail"
                        class="me-1"
                        size="14"
                      />
                      <span v-text="sanitizeText(user.email)" />
                    </div>
                    <div
                      v-if="user.phone"
                      class="text-muted"
                    >
                      <Icon
                        icon="tabler:phone"
                        class="me-1"
                        size="14"
                      />
                      <span v-text="sanitizeText(user.phone)" />
                    </div>
                  </div>
                </td>
                <td>
                  <div class="d-flex align-items-center">
                    <span
                      class="status-dot"
                      :class="user.isVerified ? 'status-dot-animated bg-green' : 'bg-yellow'"
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
                <td class="text-muted">
                  <div>{{ user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Never' }}</div>
                  <div
                    v-if="user.lastLoginAt"
                    class="small"
                  >
                    {{ formatRelativeTime(user.lastLoginAt) }}
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
import { ref, computed, onMounted, watch } from 'vue'
import { Icon } from '@iconify/vue'
import api from '@/api/axios'
import { useAuthStore } from '@/stores/auth'

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
  createdAt: string
  lastLoginAt?: string
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

// Actions
const refreshUsers = async () => {
  emit('loading', true)

  try {
    const response = await api.get('/admin/users')
    users.value = response.data.users || []
    emit('success', 'Users refreshed successfully')
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
    await api.patch(
      `/admin/users/${user.id}/role`,
      { role: 'admin' },
      {
        headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {}
      }
    )
    user.role = 'admin'
    emit('success', `${sanitizeText(user.name)} has been promoted to administrator`)
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
    await api.patch(
      `/admin/users/${user.id}/role`,
      { role: 'user' },
      {
        headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {}
      }
    )
    user.role = 'user'
    emit('success', `${sanitizeText(user.name)}'s admin privileges have been removed`)
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
  } catch (err: any) {
    emit('error', 'Failed to export users')
  }
}

// Lifecycle
onMounted(() => {
  refreshUsers()
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

.card-sm {
  transition: transform 0.2s ease-in-out;
}

.card-sm:hover {
  transform: translateY(-2px);
}
</style>