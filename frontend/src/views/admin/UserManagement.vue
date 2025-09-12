<template>
  <DefaultLayout>
    <div class="container-xl">
      <div class="page-header d-print-none">
        <div class="row align-items-center">
          <div class="col">
            <h2 class="page-title">
              User Management
            </h2>
            <div class="text-muted mt-1">
              Manage users and assign admin privileges
            </div>
          </div>
          <div class="col-auto ms-auto d-print-none">
            <button
              class="btn btn-primary"
              :disabled="isLoading"
              @click="refreshUsers"
            >
              <Icon
                icon="tabler:refresh"
                class="me-1"
              />
              {{ isLoading ? 'Loading...' : 'Refresh' }}
            </button>
          </div>
        </div>
      </div>

      <div
        v-if="error"
        class="alert alert-danger"
      >
        {{ error }}
      </div>

      <div
        v-if="successMessage"
        class="alert alert-success"
      >
        {{ successMessage }}
      </div>

      <!-- Users Table -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">
            All Users
          </h3>
          <div class="card-options">
            <div class="badge bg-blue">
              {{ users.length }} total users
            </div>
          </div>
        </div>
        <div class="card-body p-0">
          <div
            v-if="isLoading"
            class="text-center py-4"
          >
            <div
              class="spinner-border text-primary"
              role="status"
            >
              <span class="visually-hidden">Loading...</span>
            </div>
          </div>
          <div
            v-else-if="!users.length"
            class="text-center py-4 text-muted"
          >
            No users found
          </div>
          <div
            v-else
            class="table-responsive"
          >
            <table class="table table-vcenter card-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="user in users"
                  :key="user.id"
                >
                  <td>
                    <div class="d-flex align-items-center">
                      <span class="avatar avatar-sm rounded me-2">
                        {{ getUserInitials(user.name) }}
                      </span>
                      <div>
                        <strong>{{ user.name }}</strong>
                      </div>
                    </div>
                  </td>
                  <td>{{ user.email }}</td>
                  <td>
                    <span
                      class="badge"
                      :class="user.isVerified ? 'bg-success' : 'bg-warning'"
                    >
                      {{ user.isVerified ? 'Verified' : 'Pending' }}
                    </span>
                  </td>
                  <td>
                    <span
                      class="badge"
                      :class="getRoleBadgeClass(user.role)"
                    >
                      <Icon
                        :icon="getRoleIcon(user.role)"
                        class="me-1"
                      />
                      {{ user.role.charAt(0).toUpperCase() + user.role.slice(1) }}
                    </span>
                  </td>
                  <td class="text-muted">
                    {{ formatDate(user.createdAt) }}
                  </td>
                  <td>
                    <div class="btn-list">
                      <div class="dropdown">
                        <button
                          class="btn btn-outline-secondary btn-sm dropdown-toggle" 
                          data-bs-toggle="dropdown"
                          :disabled="isUpdating"
                        >
                          Actions
                        </button>
                        <div class="dropdown-menu">
                          <template v-if="user.role === 'user'">
                            <button 
                              class="dropdown-item text-success"
                              :disabled="isUpdating"
                              @click="makeAdmin(user)"
                            >
                              <Icon
                                icon="tabler:shield-check"
                                class="me-2"
                              />
                              Make Admin
                            </button>
                          </template>
                          <template v-else>
                            <button 
                              class="dropdown-item text-warning"
                              :disabled="isUpdating || isCurrentUser(user.id)"
                              @click="removeAdmin(user)"
                            >
                              <Icon
                                icon="tabler:shield-x"
                                class="me-2"
                              />
                              Remove Admin
                            </button>
                          </template>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Admin Statistics -->
      <div class="row mt-4">
        <div class="col-md-4">
          <div class="card">
            <div class="card-body text-center">
              <div class="text-muted mb-1">
                Total Users
              </div>
              <div class="h1 mb-1">
                {{ users.length }}
              </div>
              <Icon
                icon="tabler:users"
                class="text-blue"
                size="24"
              />
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card">
            <div class="card-body text-center">
              <div class="text-muted mb-1">
                Admin Users
              </div>
              <div class="h1 mb-1">
                {{ adminCount }}
              </div>
              <Icon
                icon="tabler:shield-check"
                class="text-success"
                size="24"
              />
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card">
            <div class="card-body text-center">
              <div class="text-muted mb-1">
                Verified Users
              </div>
              <div class="h1 mb-1">
                {{ verifiedCount }}
              </div>
              <Icon
                icon="tabler:check-circle"
                class="text-green"
                size="24"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import { ref, computed, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import api from '@/api/axios'
import { useAuthStore } from '@/stores/auth'

interface User {
  id: string
  name: string
  email: string
  role: 'user' | 'admin'
  isVerified: boolean
  createdAt: string
}

const users = ref<User[]>([])
const isLoading = ref(false)
const isUpdating = ref(false)
const error = ref('')
const successMessage = ref('')
const auth = useAuthStore()

const adminCount = computed(() => users.value.filter(u => u.role === 'admin').length)
const verifiedCount = computed(() => users.value.filter(u => u.isVerified).length)

const getUserInitials = (name: string) => {
  return name.split(' ').map(n => n.charAt(0)).join('').substring(0, 2).toUpperCase()
}

const getRoleBadgeClass = (role: string) => {
  return role === 'admin' ? 'bg-danger' : 'bg-blue'
}

const getRoleIcon = (role: string) => {
  return role === 'admin' ? 'tabler:shield-check' : 'tabler:user'
}

const isCurrentUser = (userId: string) => {
  return auth.user?.id === userId
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString()
}

const refreshUsers = async () => {
  if (isLoading.value) return
  
  isLoading.value = true
  error.value = ''
  
  try {
    const response = await api.get('/admin/users')
    users.value = response.data.users
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Failed to load users'
    console.error('Users error:', err)
  } finally {
    isLoading.value = false
  }
}

const makeAdmin = async (user: User) => {
  if (isUpdating.value) return
  
  if (!confirm(`Are you sure you want to make ${user.name} an admin?`)) {
    return
  }
  
  isUpdating.value = true
  error.value = ''
  successMessage.value = ''
  
  try {
    await api.post(`/admin/users/${user.id}/make-admin`)
    successMessage.value = `${user.name} has been granted admin privileges`
    
    // Update user in list
    const userIndex = users.value.findIndex(u => u.id === user.id)
    if (userIndex !== -1) {
      users.value[userIndex].role = 'admin'
    }
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      successMessage.value = ''
    }, 3000)
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Failed to make user admin'
    console.error('Make admin error:', err)
  } finally {
    isUpdating.value = false
  }
}

const removeAdmin = async (user: User) => {
  if (isUpdating.value || isCurrentUser(user.id)) return
  
  if (!confirm(`Are you sure you want to remove admin privileges from ${user.name}?`)) {
    return
  }
  
  isUpdating.value = true
  error.value = ''
  successMessage.value = ''
  
  try {
    await api.post(`/admin/users/${user.id}/remove-admin`)
    successMessage.value = `Admin privileges removed from ${user.name}`
    
    // Update user in list
    const userIndex = users.value.findIndex(u => u.id === user.id)
    if (userIndex !== -1) {
      users.value[userIndex].role = 'user'
    }
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      successMessage.value = ''
    }, 3000)
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Failed to remove admin privileges'
    console.error('Remove admin error:', err)
  } finally {
    isUpdating.value = false
  }
}

onMounted(() => {
  refreshUsers()
})
</script>

<style scoped>
.avatar {
  background-color: #206bc4;
  color: white;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.875rem;
}

.table td {
  vertical-align: middle;
}

.badge {
  font-weight: 500;
}

.btn:disabled {
  opacity: 0.5;
}
</style>