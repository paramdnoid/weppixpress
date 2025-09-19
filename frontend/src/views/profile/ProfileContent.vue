<template>
  <div class="profile-content flex-fill border-start">
    <!-- Dynamic Content Area -->
    <div class="page-body m-0">
      <div class="container-fluid">
        <!-- Overview View -->
        <div v-if="currentView === 'overview'" class="view-content">
          <div class="row h-100">
            <div class="col-md-8 d-flex flex-column">
              <!-- Professional Profile Card -->
              <div class="card">
                <div class="card-body">
                  <div class="row align-items-center">
                    <div class="col-auto">
                      <span class="avatar avatar-xl"
                        :style="{ backgroundImage: userProfile?.avatar ? `url(${userProfile.avatar})` : 'none' }">
                        <span v-if="!userProfile?.avatar" class="avatar-title bg-primary text-white">
                          {{ getInitials(getFullName(userProfile)) }}
                        </span>
                      </span>
                    </div>
                    <div class="col">
                      <div class="card-title mb-1">{{ getFullName(userProfile) || 'User' }}</div>
                      <div class="card-subtitle">{{ userProfile?.email }}</div>
                      <div class="small mt-1">
                        <span class="badge bg-green-lt me-2">
                          <Icon icon="tabler:check" class="me-1" width="12" height="12" />
                          {{ userProfile?.isActive ? 'Active' : 'Inactive' }}
                        </span>
                        <span class="text-muted">
                          <Icon icon="tabler:calendar" class="me-1" width="14" height="14" />
                          Joined {{ formatDate(userProfile?.createdAt) }}
                        </span>
                      </div>
                    </div>
                    <div class="col-auto">
                      <div class="dropdown">
                        <button class="btn dropdown-toggle" data-bs-toggle="dropdown" aria-haspopup="true"
                          aria-expanded="false">
                          <Icon icon="tabler:dots-vertical" />
                        </button>
                        <div class="dropdown-menu dropdown-menu-end">
                          <a class="dropdown-item" href="#" @click.prevent="emit('viewChange', 'personal')">
                            <Icon icon="tabler:edit" class="me-2" />
                            Edit Profile
                          </a>
                          <a class="dropdown-item" href="#" @click.prevent="emit('viewChange', 'avatar')">
                            <Icon icon="tabler:camera" class="me-2" />
                            Change Photo
                          </a>
                          <div class="dropdown-divider"></div>
                          <a class="dropdown-item" href="#" @click.prevent="exportProfile">
                            <Icon icon="tabler:download" class="me-2" />
                            Export Data
                          </a>
                          <a class="dropdown-item" href="#" @click.prevent="printProfile">
                            <Icon icon="tabler:printer" class="me-2" />
                            Print Profile
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="card-footer">
                  <div class="row">
                    <div class="col">
                      <div class="d-flex align-items-center">
                        <span class="status-dot bg-success"></span>
                        <small class="text-muted ms-2">Last seen {{ formatRelativeTime(userProfile?.lastLogin)
                          }}</small>
                      </div>
                    </div>
                    <div class="col-auto">
                      <div class="d-flex gap-1">
                        <span v-if="userProfile?.twoFactorEnabled" class="badge bg-blue-lt"
                          title="Two-Factor Authentication">
                          <Icon icon="tabler:shield-check" width="12" height="12" />
                        </span>
                        <span v-if="(userProfile as any)?.emailVerified" class="badge bg-green-lt"
                          title="Verified Email">
                          <Icon icon="tabler:mail-check" width="12" height="12" />
                        </span>
                        <span class="badge bg-gray-lt text-capitalize">{{ userProfile?.role }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Account Information Card -->
              <div class="card mt-4 flex-fill">
                <div class="card-header d-flex justify-content-between align-items-center">
                  <h3 class="card-title mb-0">
                    <Icon icon="tabler:info-circle" class="me-2" />
                    Account Information
                  </h3>
                  <button class="btn btn-outline-primary btn-sm" @click="emit('viewChange', 'personal')">
                    <Icon icon="tabler:edit" class="me-1" />
                    Edit
                  </button>
                </div>
                <div class="card-body d-flex flex-column">
                  <div class="row g-3 flex-fill">
                    <div class="col-md-6">
                      <div class="info-item h-100 d-flex flex-column justify-content-center">
                        <label class="info-label">First Name</label>
                        <div class="info-value">{{ userProfile?.firstName || 'Not set' }}</div>
                      </div>
                    </div>
                    <div class="col-md-6">
                      <div class="info-item h-100 d-flex flex-column justify-content-center">
                        <label class="info-label">Last Name</label>
                        <div class="info-value">{{ userProfile?.lastName || 'Not set' }}</div>
                      </div>
                    </div>
                    <div class="col-md-6">
                      <div class="info-item h-100 d-flex flex-column justify-content-center">
                        <label class="info-label">Email Address</label>
                        <div class="info-value d-flex align-items-center">
                          {{ userProfile?.email }}
                          <span v-if="(userProfile as any)?.emailVerified" class="badge bg-green-lt text-green ms-2"
                            title="Email Verified">
                            <Icon icon="tabler:check" width="12" height="12" />
                            Verified
                          </span>
                        </div>
                      </div>
                    </div>
                    <div class="col-md-6">
                      <div class="info-item h-100 d-flex flex-column justify-content-center">
                        <label class="info-label">Phone Number</label>
                        <div class="info-value">{{ (userProfile as any)?.phone || 'Not set' }}</div>
                      </div>
                    </div>
                    <div class="col-md-6">
                      <div class="info-item h-100 d-flex flex-column justify-content-center">
                        <label class="info-label">Role</label>
                        <div class="info-value">
                          <span class="badge bg-blue-lt text-blue text-capitalize">
                            {{ userProfile?.role }}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div class="col-md-6">
                      <div class="info-item h-100 d-flex flex-column justify-content-center">
                        <label class="info-label">Department</label>
                        <div class="info-value">{{ (userProfile as any)?.department || 'Not specified' }}</div>
                      </div>
                    </div>
                    <div class="col-md-6">
                      <div class="info-item h-100 d-flex flex-column justify-content-center">
                        <label class="info-label">Member Since</label>
                        <div class="info-value">{{ formatDate(userProfile?.createdAt) }}</div>
                      </div>
                    </div>
                    <div class="col-md-6">
                      <div class="info-item h-100 d-flex flex-column justify-content-center">
                        <label class="info-label">Last Login</label>
                        <div class="info-value">{{ formatRelativeTime(userProfile?.lastLogin) }}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Sidebar -->
            <div class="col-md-4 d-flex flex-column">
              <!-- Account Statistics Card -->
              <div class="card flex-fill">
                <div class="card-header">
                  <h3 class="card-title mb-0">
                    <Icon icon="tabler:chart-bar" class="me-2" />
                    Account Statistics
                  </h3>
                </div>
                <div class="card-body d-flex flex-column">
                  <div class="row g-3 flex-fill">
                    <div class="col-6">
                      <div class="stat-item text-center h-100 d-flex flex-column justify-content-center">
                        <div class="stat-value text-primary">{{ getAccountAge() }}</div>
                        <div class="stat-label">Days Active</div>
                      </div>
                    </div>
                    <div class="col-6">
                      <div class="stat-item text-center h-100 d-flex flex-column justify-content-center">
                        <div class="stat-value text-success">{{ getProfileCompleteness() }}%</div>
                        <div class="stat-label">Complete</div>
                      </div>
                    </div>
                    <div class="col-6">
                      <div class="stat-item text-center h-100 d-flex flex-column justify-content-center">
                        <div class="stat-value text-info">{{ getTotalLogins() }}</div>
                        <div class="stat-label">Total Logins</div>
                      </div>
                    </div>
                    <div class="col-6">
                      <div class="stat-item text-center h-100 d-flex flex-column justify-content-center">
                        <div class="stat-value text-warning">{{ getSecurityScore() }}%</div>
                        <div class="stat-label">Security</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Security Status Card -->
              <div class="card mt-4 flex-fill">
                <div class="card-header">
                  <h3 class="card-title mb-0">
                    <Icon icon="tabler:shield-check" class="me-2" />
                    Security Status
                  </h3>
                </div>
                <div class="card-body d-flex flex-column">
                  <div class="security-items flex-fill">
                    <div class="security-item">
                      <div class="d-flex justify-content-between align-items-center">
                        <div class="d-flex align-items-center">
                          <Icon :icon="userProfile?.twoFactorEnabled ? 'tabler:check' : 'tabler:x'"
                            :class="userProfile?.twoFactorEnabled ? 'text-success' : 'text-danger'" class="me-2" />
                          <span>Two-Factor Auth</span>
                        </div>
                        <span :class="userProfile?.twoFactorEnabled ? 'text-success' : 'text-danger'"
                          class="small fw-medium">
                          {{ userProfile?.twoFactorEnabled ? 'Enabled' : 'Disabled' }}
                        </span>
                      </div>
                    </div>
                    <div class="security-item">
                      <div class="d-flex justify-content-between align-items-center">
                        <div class="d-flex align-items-center">
                          <Icon :icon="(userProfile as any)?.emailVerified ? 'tabler:check' : 'tabler:x'"
                            :class="(userProfile as any)?.emailVerified ? 'text-success' : 'text-danger'"
                            class="me-2" />
                          <span>Email Verified</span>
                        </div>
                        <span :class="(userProfile as any)?.emailVerified ? 'text-success' : 'text-danger'"
                          class="small fw-medium">
                          {{ (userProfile as any)?.emailVerified ? 'Verified' : 'Unverified' }}
                        </span>
                      </div>
                    </div>
                    <div class="security-item">
                      <div class="d-flex justify-content-between align-items-center">
                        <div class="d-flex align-items-center">
                          <Icon icon="tabler:clock" class="text-info me-2" />
                          <span>Password Age</span>
                        </div>
                        <span class="small text-muted">
                          {{ getPasswordAge() }} days
                        </span>
                      </div>
                    </div>
                  </div>
                  <div class="mt-auto pt-3">
                    <button class="btn btn-outline-primary btn-sm w-100" @click="emit('viewChange', 'security')">
                      <Icon icon="tabler:shield-lock" class="me-1" />
                      Review Security
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="col-12">
              <!-- Recent Activity Card -->
              <div class="card mt-4">
                <div class="card-header d-flex justify-content-between align-items-center">
                  <h3 class="card-title mb-0">
                    <Icon icon="tabler:activity" class="me-2" />
                    Recent Activity
                  </h3>
                  <button class="btn btn-sm btn-outline-secondary">
                    <Icon icon="tabler:filter" class="me-1" width="14" height="14" />
                    Filter
                  </button>
                </div>
                <div class="card-body p-0">
                  <div class="list-group list-group-flush">
                    <div v-for="activity in recentActivities" :key="activity.id"
                         class="list-group-item list-group-item-action activity-item">
                      <div class="row align-items-center">
                        <div class="col-auto">
                          <span class="avatar avatar-sm" :class="getActivityAvatarClass(activity.type)">
                            <Icon :icon="activity.icon" width="16" height="16" />
                          </span>
                        </div>
                        <div class="col">
                          <div class="d-flex justify-content-between align-items-start">
                            <div>
                              <div class="activity-title fw-medium">{{ activity.title }}</div>
                              <div class="activity-description text-muted small">{{ activity.description }}</div>
                              <div class="activity-meta d-flex align-items-center mt-1">
                                <Icon icon="tabler:clock" width="12" height="12" class="me-1 text-muted" />
                                <span class="text-muted small">{{ formatRelativeTime(activity.timestamp) }}</span>
                                <span v-if="activity.location" class="text-muted small ms-2">
                                  <Icon icon="tabler:map-pin" width="12" height="12" class="me-1" />
                                  {{ activity.location }}
                                </span>
                              </div>
                            </div>
                            <div class="activity-status">
                              <span class="badge" :class="getActivityBadgeClass(activity.status)">
                                {{ activity.status }}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="card-footer bg-transparent border-0">
                    <div class="text-center">
                      <button class="btn btn-link text-muted">
                        <Icon icon="tabler:chevron-down" class="me-1" width="14" height="14" />
                        View all activity
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        <!-- Personal Info View -->
        <div v-else-if="currentView === 'personal'" class="view-content">
          <form @submit.prevent="savePersonalInfo">
            <div class="card">
              <div class="card-header">
                <h3 class="card-title">
                  <Icon icon="tabler:user-edit" class="me-2" />
                  Personal Information
                </h3>
              </div>
              <div class="card-body">
                <div class="row g-3">
                  <div class="col-md-6">
                    <div class="mb-3">
                      <label class="form-label required">First Name</label>
                      <input v-model="editableProfile.firstName" type="text" class="form-control"
                        :class="{ 'is-invalid': errors.firstName }" placeholder="Enter your first name" required>
                      <div v-if="errors.firstName" class="invalid-feedback">
                        {{ errors.firstName }}
                      </div>
                    </div>
                  </div>
                  <div class="col-md-6">
                    <div class="mb-3">
                      <label class="form-label required">Last Name</label>
                      <input v-model="editableProfile.lastName" type="text" class="form-control"
                        :class="{ 'is-invalid': errors.lastName }" placeholder="Enter your last name" required>
                      <div v-if="errors.lastName" class="invalid-feedback">
                        {{ errors.lastName }}
                      </div>
                    </div>
                  </div>
                  <div class="col-md-6">
                    <div class="mb-3">
                      <label class="form-label">Email Address</label>
                      <div class="input-group">
                        <input v-model="editableProfile.email" type="email" class="form-control" readonly>
                        <button type="button" class="btn btn-outline-secondary" @click="requestEmailChange">
                          <Icon icon="tabler:edit" width="16" height="16" />
                        </button>
                      </div>
                      <div class="form-hint">Contact support to change your email address</div>
                    </div>
                  </div>
                  <div class="col-md-6">
                    <div class="mb-3">
                      <label class="form-label">Phone Number</label>
                      <input v-model="editableProfile.phone" type="tel" class="form-control"
                        :class="{ 'is-invalid': errors.phone }" placeholder="+1 (555) 123-4567">
                      <div v-if="errors.phone" class="invalid-feedback">
                        {{ errors.phone }}
                      </div>
                    </div>
                  </div>
                  <div class="col-md-6">
                    <div class="mb-3">
                      <label class="form-label">Date of Birth</label>
                      <input v-model="editableProfile.dateOfBirth" type="date" class="form-control">
                    </div>
                  </div>
                  <div class="col-md-6">
                    <div class="mb-3">
                      <label class="form-label">Department</label>
                      <select v-model="editableProfile.department" class="form-select">
                        <option value="">Select Department</option>
                        <option value="engineering">Engineering</option>
                        <option value="marketing">Marketing</option>
                        <option value="sales">Sales</option>
                        <option value="hr">Human Resources</option>
                        <option value="finance">Finance</option>
                        <option value="operations">Operations</option>
                      </select>
                    </div>
                  </div>
                  <div class="col-12">
                    <div class="mb-3">
                      <label class="form-label">Bio</label>
                      <textarea v-model="editableProfile.bio" class="form-control" rows="4"
                        placeholder="Tell us about yourself..." maxlength="500"></textarea>
                      <div class="form-hint">{{ editableProfile.bio?.length || 0 }}/500 characters</div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="card-footer">
                <div class="d-flex justify-content-between">
                  <button type="button" class="btn btn-outline-secondary" @click="resetPersonalInfo">
                    <Icon icon="tabler:refresh" class="me-1" />
                    Reset
                  </button>
                  <button type="submit" class="btn btn-primary" :disabled="isSaving">
                    <Icon :icon="isSaving ? 'tabler:loader-2' : 'tabler:device-floppy'"
                      :class="isSaving ? 'spinner-border spinner-border-sm me-1' : 'me-1'" />
                    {{ isSaving ? 'Saving...' : 'Save Changes' }}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>

        <!-- Avatar View -->
        <div v-else-if="currentView === 'avatar'" class="view-content">
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">
                <Icon icon="tabler:camera" class="me-2" />
                Avatar & Profile Photo
              </h3>
            </div>
            <div class="card-body">
              <div class="row">
                <div class="col-md-4">
                  <div class="text-center">
                    <div class="avatar avatar-2xl mx-auto mb-3">
                      <img v-if="previewImage || userProfile?.avatar" :src="previewImage || userProfile?.avatar"
                        :alt="getFullName(userProfile)" class="avatar-img">
                      <span v-else class="avatar-text bg-primary text-white">
                        {{ getInitials(getFullName(userProfile)) }}
                      </span>
                    </div>
                    <div class="mb-3">
                      <input ref="fileInput" type="file" accept="image/*" class="d-none" @change="handleFileSelect">
                      <button type="button" class="btn btn-primary btn-sm me-2" @click="fileInput?.click()">
                        <Icon icon="tabler:upload" class="me-1" />
                        Upload Photo
                      </button>
                      <button v-if="userProfile?.avatar || previewImage" type="button"
                        class="btn btn-outline-danger btn-sm" @click="removeAvatar">
                        <Icon icon="tabler:trash" class="me-1" />
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
                <div class="col-md-8">
                  <div class="alert alert-info">
                    <Icon icon="tabler:info-circle" class="me-2" />
                    <strong>Photo Guidelines:</strong>
                    <ul class="mb-0 mt-2">
                      <li>Use a clear, professional photo</li>
                      <li>Supported formats: JPG, PNG, GIF</li>
                      <li>Maximum file size: 5MB</li>
                      <li>Recommended size: 400x400 pixels</li>
                      <li>Square images work best</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Password Change View -->
        <div v-else-if="currentView === 'password'" class="view-content">
          <form @submit.prevent="changePassword">
            <div class="card">
              <div class="card-header">
                <h3 class="card-title">
                  <Icon icon="tabler:key" class="me-2" />
                  Change Password
                </h3>
              </div>
              <div class="card-body">
                <div class="row">
                  <div class="col-md-6">
                    <div class="mb-3">
                      <label class="form-label required">Current Password</label>
                      <div class="input-group">
                        <input v-model="passwordForm.currentPassword" :type="showPassword.current ? 'text' : 'password'"
                          class="form-control" :class="{ 'is-invalid': errors.currentPassword }"
                          placeholder="Enter current password" required>
                        <button type="button" class="btn btn-outline-secondary"
                          @click="showPassword.current = !showPassword.current">
                          <Icon :icon="showPassword.current ? 'tabler:eye-off' : 'tabler:eye'" width="16" height="16" />
                        </button>
                      </div>
                      <div v-if="errors.currentPassword" class="invalid-feedback">
                        {{ errors.currentPassword }}
                      </div>
                    </div>
                    <div class="mb-3">
                      <label class="form-label required">New Password</label>
                      <div class="input-group">
                        <input v-model="passwordForm.newPassword" :type="showPassword.new ? 'text' : 'password'"
                          class="form-control" :class="{ 'is-invalid': errors.newPassword }"
                          placeholder="Enter new password" required @input="validatePassword">
                        <button type="button" class="btn btn-outline-secondary"
                          @click="showPassword.new = !showPassword.new">
                          <Icon :icon="showPassword.new ? 'tabler:eye-off' : 'tabler:eye'" width="16" height="16" />
                        </button>
                      </div>
                      <div v-if="errors.newPassword" class="invalid-feedback">
                        {{ errors.newPassword }}
                      </div>
                    </div>
                    <div class="mb-3">
                      <label class="form-label required">Confirm New Password</label>
                      <div class="input-group">
                        <input v-model="passwordForm.confirmPassword" :type="showPassword.confirm ? 'text' : 'password'"
                          class="form-control" :class="{ 'is-invalid': errors.confirmPassword }"
                          placeholder="Confirm new password" required>
                        <button type="button" class="btn btn-outline-secondary"
                          @click="showPassword.confirm = !showPassword.confirm">
                          <Icon :icon="showPassword.confirm ? 'tabler:eye-off' : 'tabler:eye'" width="16" height="16" />
                        </button>
                      </div>
                      <div v-if="errors.confirmPassword" class="invalid-feedback">
                        {{ errors.confirmPassword }}
                      </div>
                    </div>
                  </div>
                  <div class="col-md-6">
                    <div class="card bg-light">
                      <div class="card-header">
                        <h4 class="card-title mb-0">Password Requirements</h4>
                      </div>
                      <div class="card-body">
                        <div class="password-requirements">
                          <div class="requirement-item" :class="{ 'valid': passwordStrength.length }">
                            <Icon :icon="passwordStrength.length ? 'tabler:check' : 'tabler:x'"
                              :class="passwordStrength.length ? 'text-success' : 'text-danger'" class="me-2" />
                            At least 8 characters
                          </div>
                          <div class="requirement-item" :class="{ 'valid': passwordStrength.uppercase }">
                            <Icon :icon="passwordStrength.uppercase ? 'tabler:check' : 'tabler:x'"
                              :class="passwordStrength.uppercase ? 'text-success' : 'text-danger'" class="me-2" />
                            One uppercase letter
                          </div>
                          <div class="requirement-item" :class="{ 'valid': passwordStrength.lowercase }">
                            <Icon :icon="passwordStrength.lowercase ? 'tabler:check' : 'tabler:x'"
                              :class="passwordStrength.lowercase ? 'text-success' : 'text-danger'" class="me-2" />
                            One lowercase letter
                          </div>
                          <div class="requirement-item" :class="{ 'valid': passwordStrength.number }">
                            <Icon :icon="passwordStrength.number ? 'tabler:check' : 'tabler:x'"
                              :class="passwordStrength.number ? 'text-success' : 'text-danger'" class="me-2" />
                            One number
                          </div>
                          <div class="requirement-item" :class="{ 'valid': passwordStrength.special }">
                            <Icon :icon="passwordStrength.special ? 'tabler:check' : 'tabler:x'"
                              :class="passwordStrength.special ? 'text-success' : 'text-danger'" class="me-2" />
                            One special character
                          </div>
                        </div>
                        <div class="mt-3">
                          <div class="mb-1">Password Strength</div>
                          <div class="progress">
                            <div class="progress-bar" :class="getPasswordStrengthClass()"
                              :style="{ width: getPasswordStrengthPercentage() + '%' }"></div>
                          </div>
                          <div class="small text-muted mt-1">{{ getPasswordStrengthText() }}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="card-footer">
                <div class="d-flex justify-content-between">
                  <button type="button" class="btn btn-outline-secondary" @click="resetPasswordForm">
                    <Icon icon="tabler:refresh" class="me-1" />
                    Reset
                  </button>
                  <button type="submit" class="btn btn-primary" :disabled="isSaving || !isPasswordValid">
                    <Icon :icon="isSaving ? 'tabler:loader-2' : 'tabler:key'"
                      :class="isSaving ? 'spinner-border spinner-border-sm me-1' : 'me-1'" />
                    {{ isSaving ? 'Changing...' : 'Change Password' }}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>

        <!-- Settings View -->
        <div v-else-if="currentView === 'settings'" class="view-content">
          <form @submit.prevent="saveSettings">
            <!-- General Settings -->
            <div class="card">
              <div class="card-header">
                <h3 class="card-title">
                  <Icon icon="tabler:settings" class="me-2" />
                  General Settings
                </h3>
              </div>
              <div class="card-body">
                <div class="row g-3">
                  <div class="col-md-6">
                    <div class="mb-3">
                      <label class="form-label">Theme Preference</label>
                      <select v-model="editableSettings.theme" class="form-select">
                        <option value="auto">🌓 Auto (System)</option>
                        <option value="light">☀️ Light</option>
                        <option value="dark">🌙 Dark</option>
                      </select>
                    </div>
                  </div>
                  <div class="col-md-6">
                    <div class="mb-3">
                      <label class="form-label">Language</label>
                      <select v-model="editableSettings.language" class="form-select">
                        <option value="en">🇺🇸 English</option>
                        <option value="de">🇩🇪 Deutsch</option>
                        <option value="fr">🇫🇷 Français</option>
                        <option value="es">🇪🇸 Español</option>
                      </select>
                    </div>
                  </div>
                  <div class="col-md-6">
                    <div class="mb-3">
                      <label class="form-label">Timezone</label>
                      <select v-model="editableSettings.timezone" class="form-select">
                        <option value="America/New_York">Eastern Time (ET)</option>
                        <option value="America/Chicago">Central Time (CT)</option>
                        <option value="America/Denver">Mountain Time (MT)</option>
                        <option value="America/Los_Angeles">Pacific Time (PT)</option>
                        <option value="Europe/London">Greenwich Mean Time (GMT)</option>
                        <option value="Europe/Berlin">Central European Time (CET)</option>
                      </select>
                    </div>
                  </div>
                  <div class="col-md-6">
                    <div class="mb-3">
                      <label class="form-label">Date Format</label>
                      <select v-model="editableSettings.dateFormat" class="form-select">
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Notification Settings -->
            <div class="card mt-4">
              <div class="card-header">
                <h3 class="card-title">
                  <Icon icon="tabler:bell" class="me-2" />
                  Notification Preferences
                </h3>
              </div>
              <div class="card-body">
                <div class="row g-3">
                  <div class="col-12">
                    <div class="form-check form-switch">
                      <input v-model="editableSettings.emailNotifications" class="form-check-input" type="checkbox"
                        id="emailNotifications">
                      <label class="form-check-label" for="emailNotifications">
                        Email Notifications
                      </label>
                      <div class="form-hint">Receive email notifications for important updates</div>
                    </div>
                  </div>
                  <div class="col-12">
                    <div class="form-check form-switch">
                      <input v-model="editableSettings.pushNotifications" class="form-check-input" type="checkbox"
                        id="pushNotifications">
                      <label class="form-check-label" for="pushNotifications">
                        Push Notifications
                      </label>
                      <div class="form-hint">Receive browser push notifications</div>
                    </div>
                  </div>
                  <div class="col-12">
                    <div class="form-check form-switch">
                      <input v-model="editableSettings.smsNotifications" class="form-check-input" type="checkbox"
                        id="smsNotifications">
                      <label class="form-check-label" for="smsNotifications">
                        SMS Notifications
                      </label>
                      <div class="form-hint">Receive text message notifications for critical alerts</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Privacy Settings -->
            <div class="card mt-4">
              <div class="card-header">
                <h3 class="card-title">
                  <Icon icon="tabler:shield-check" class="me-2" />
                  Privacy Settings
                </h3>
              </div>
              <div class="card-body">
                <div class="row g-3">
                  <div class="col-12">
                    <div class="form-check form-switch">
                      <input v-model="editableSettings.profileVisibility" class="form-check-input" type="checkbox"
                        id="profileVisibility">
                      <label class="form-check-label" for="profileVisibility">
                        Public Profile
                      </label>
                      <div class="form-hint">Make your profile visible to other users</div>
                    </div>
                  </div>
                  <div class="col-12">
                    <div class="form-check form-switch">
                      <input v-model="editableSettings.activityTracking" class="form-check-input" type="checkbox"
                        id="activityTracking">
                      <label class="form-check-label" for="activityTracking">
                        Activity Tracking
                      </label>
                      <div class="form-hint">Allow tracking of your activity for analytics</div>
                    </div>
                  </div>
                  <div class="col-12">
                    <div class="form-check form-switch">
                      <input v-model="editableSettings.dataSharing" class="form-check-input" type="checkbox"
                        id="dataSharing">
                      <label class="form-check-label" for="dataSharing">
                        Data Sharing
                      </label>
                      <div class="form-hint">Share anonymized data to improve our services</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Save Settings -->
            <div class="card mt-4">
              <div class="card-footer">
                <div class="d-flex justify-content-between">
                  <button type="button" class="btn btn-outline-secondary" @click="resetSettings">
                    <Icon icon="tabler:refresh" class="me-1" />
                    Reset
                  </button>
                  <button type="submit" class="btn btn-primary" :disabled="isSaving">
                    <Icon :icon="isSaving ? 'tabler:loader-2' : 'tabler:device-floppy'"
                      :class="isSaving ? 'spinner-border spinner-border-sm me-1' : 'me-1'" />
                    {{ isSaving ? 'Saving...' : 'Save Settings' }}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>

        <!-- Security View -->
        <div v-else-if="currentView === 'security'" class="view-content">
          <div class="row">
            <!-- Two-Factor Authentication -->
            <div class="col-12">
              <div class="card">
                <div class="card-status-top" :class="userProfile?.twoFactorEnabled ? 'bg-success' : 'bg-warning'"></div>
                <div class="card-header">
                  <h3 class="card-title">
                    <Icon icon="tabler:shield-lock" class="me-2" />
                    Two-Factor Authentication
                  </h3>
                  <div class="card-actions">
                    <span class="badge" :class="userProfile?.twoFactorEnabled ? 'bg-success-lt text-success' : 'bg-warning-lt text-warning'">
                      <Icon :icon="userProfile?.twoFactorEnabled ? 'tabler:check' : 'tabler:alert-triangle'" class="me-1" width="14" height="14" />
                      {{ userProfile?.twoFactorEnabled ? 'Enabled' : 'Disabled' }}
                    </span>
                  </div>
                </div>
                <div class="card-body">
                  <div class="row">
                    <!-- Left Column - Information -->
                    <div class="col-md-8">
                      <div class="d-flex align-items-start mb-4">
                        <div class="avatar avatar-lg me-3" :class="userProfile?.twoFactorEnabled ? 'bg-success-lt text-success' : 'bg-warning-lt text-warning'">
                          <Icon :icon="userProfile?.twoFactorEnabled ? 'tabler:shield-check' : 'tabler:shield-x'" width="24" height="24" />
                        </div>
                        <div>
                          <h4 class="mb-1">{{ userProfile?.twoFactorEnabled ? 'Your account is protected' : 'Enhance Your Account Security' }}</h4>
                          <p class="text-muted mb-0">
                            {{ userProfile?.twoFactorEnabled
                              ? 'Two-factor authentication is active and protecting your account with an additional security layer.'
                              : 'Add an extra layer of security by requiring both your password and a verification code from your mobile device.'
                            }}
                          </p>
                        </div>
                      </div>

                      <!-- Security Steps -->
                      <div class="steps steps-counter steps-vertical mb-4">
                        <div class="step-item" :class="{ active: userProfile?.twoFactorEnabled }">
                          <div class="h4 m-0">Download Authenticator App</div>
                          <div class="text-muted">Install Google Authenticator, Authy, or similar app on your mobile device</div>
                        </div>
                        <div class="step-item" :class="{ active: userProfile?.twoFactorEnabled }">
                          <div class="h4 m-0">Scan QR Code</div>
                          <div class="text-muted">Use your authenticator app to scan the QR code or enter the setup key manually</div>
                        </div>
                        <div class="step-item" :class="{ active: userProfile?.twoFactorEnabled }">
                          <div class="h4 m-0">Verify Setup</div>
                          <div class="text-muted">Enter a verification code from your app to complete the setup process</div>
                        </div>
                      </div>

                      <!-- Action Buttons -->
                      <div class="btn-list">
                        <button v-if="!userProfile?.twoFactorEnabled" class="btn btn-primary" @click="showSetupModal = true">
                          <Icon icon="tabler:shield-plus" class="me-1" />
                          Set Up Two-Factor Authentication
                        </button>
                        <button v-else class="btn btn-success" @click="showBackupCodesModal = true">
                          <Icon icon="tabler:qrcode" class="me-1" />
                          View Backup Codes
                        </button>
                        <button v-if="userProfile?.twoFactorEnabled" class="btn btn-outline-danger" @click="disableTwoFactor">
                          <Icon icon="tabler:shield-off" class="me-1" />
                          Disable 2FA
                        </button>
                      </div>
                    </div>

                    <!-- Right Column - Visual -->
                    <div class="col-md-4">
                      <div class="text-center">
                        <div class="avatar avatar-2xl mx-auto mb-3" :class="userProfile?.twoFactorEnabled ? 'bg-success-lt text-success' : 'bg-blue-lt text-blue'">
                          <Icon :icon="userProfile?.twoFactorEnabled ? 'tabler:shield-check' : 'tabler:device-mobile'" width="48" height="48" />
                        </div>
                        <h5 class="mb-2">{{ userProfile?.twoFactorEnabled ? 'Protected Account' : 'Mobile Authentication' }}</h5>
                        <p class="text-muted small mb-3">
                          {{ userProfile?.twoFactorEnabled
                            ? 'Your account uses time-based codes for enhanced security.'
                            : 'Use your phone to generate secure access codes.'
                          }}
                        </p>

                        <!-- Security Score -->
                        <div class="progress progress-sm mb-2">
                          <div class="progress-bar" :class="userProfile?.twoFactorEnabled ? 'bg-success' : 'bg-warning'"
                               :style="{ width: userProfile?.twoFactorEnabled ? '100%' : '60%' }"></div>
                        </div>
                        <div class="small text-muted">
                          Security Level: {{ userProfile?.twoFactorEnabled ? 'Excellent' : 'Good' }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Card Footer with Benefits -->
                <div class="card-footer" v-if="!userProfile?.twoFactorEnabled">
                  <div class="row">
                    <div class="col-md-4 text-center">
                      <Icon icon="tabler:lock" class="text-primary mb-2" width="24" height="24" />
                      <div class="small fw-medium">Enhanced Security</div>
                      <div class="small text-muted">Protect against unauthorized access</div>
                    </div>
                    <div class="col-md-4 text-center">
                      <Icon icon="tabler:mobile" class="text-primary mb-2" width="24" height="24" />
                      <div class="small fw-medium">Mobile Convenience</div>
                      <div class="small text-muted">Quick access via your phone</div>
                    </div>
                    <div class="col-md-4 text-center">
                      <Icon icon="tabler:shield-check" class="text-primary mb-2" width="24" height="24" />
                      <div class="small fw-medium">Industry Standard</div>
                      <div class="small text-muted">Trusted by millions worldwide</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Active Sessions -->
          <div class="card mt-4">
            <div class="card-header">
              <h3 class="card-title">
                <Icon icon="tabler:device-desktop" class="me-2" />
                Active Sessions
              </h3>
            </div>
            <div class="card-body">
              <div class="session-list">
                <div v-for="session in activeSessions" :key="session.id" class="session-item">
                  <div class="d-flex align-items-center">
                    <div class="session-icon me-3">
                      <Icon :icon="getDeviceIcon(session.device)" size="24" class="text-primary" />
                    </div>
                    <div class="flex-fill">
                      <div class="fw-medium">{{ session.device }}</div>
                      <div class="text-muted small">
                        {{ session.location }} • {{ formatRelativeTime(session.lastActive) }}
                      </div>
                      <div class="text-muted small">
                        IP: {{ session.ipAddress }}
                      </div>
                    </div>
                    <div class="session-actions">
                      <span v-if="session.current" class="badge bg-success-lt text-success">
                        Current Session
                      </span>
                      <button v-else class="btn btn-outline-danger btn-sm" @click="terminateSession(session.id)">
                        <Icon icon="tabler:x" width="14" height="14" />
                        Terminate
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Security Logs -->
          <div class="card mt-4">
            <div class="card-header">
              <h3 class="card-title">
                <Icon icon="tabler:file-text" class="me-2" />
                Recent Security Activity
              </h3>
            </div>
            <div class="card-body">
              <div class="security-logs">
                <div v-for="log in securityLogs" :key="log.id" class="log-item">
                  <div class="d-flex align-items-start">
                    <div class="log-icon me-3">
                      <Icon :icon="log.icon"
                        :class="log.severity === 'warning' ? 'text-warning' : log.severity === 'danger' ? 'text-danger' : 'text-success'" />
                    </div>
                    <div class="flex-fill">
                      <div class="fw-medium">{{ log.event }}</div>
                      <div class="text-muted small">{{ log.description }}</div>
                      <div class="text-muted small">{{ formatRelativeTime(log.timestamp) }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Data Export View -->
        <div v-else-if="currentView === 'export'" class="view-content">
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">
                <Icon icon="tabler:download" class="me-2" />
                Export Your Data
              </h3>
            </div>
            <div class="card-body">
              <div class="row">
                <div class="col-md-8">
                  <p class="text-muted mb-4">
                    You can export your personal data in various formats. This includes your profile information,
                    settings, and activity history.
                  </p>
                  <div class="export-options">
                    <div class="export-option">
                      <div class="d-flex justify-content-between align-items-center p-3 border rounded">
                        <div class="d-flex align-items-center">
                          <Icon icon="tabler:file-type-json" class="me-3 text-primary" size="24" />
                          <div>
                            <div class="fw-medium">JSON Format</div>
                            <div class="text-muted small">Machine-readable format for developers</div>
                          </div>
                        </div>
                        <button class="btn btn-outline-primary btn-sm" @click="exportData('json')">
                          <Icon icon="tabler:download" class="me-1" />
                          Export
                        </button>
                      </div>
                    </div>
                    <div class="export-option mt-3">
                      <div class="d-flex justify-content-between align-items-center p-3 border rounded">
                        <div class="d-flex align-items-center">
                          <Icon icon="tabler:file-type-csv" class="me-3 text-success" size="24" />
                          <div>
                            <div class="fw-medium">CSV Format</div>
                            <div class="text-muted small">Spreadsheet-compatible format</div>
                          </div>
                        </div>
                        <button class="btn btn-outline-success btn-sm" @click="exportData('csv')">
                          <Icon icon="tabler:download" class="me-1" />
                          Export
                        </button>
                      </div>
                    </div>
                    <div class="export-option mt-3">
                      <div class="d-flex justify-content-between align-items-center p-3 border rounded">
                        <div class="d-flex align-items-center">
                          <Icon icon="tabler:file-type-pdf" class="me-3 text-danger" size="24" />
                          <div>
                            <div class="fw-medium">PDF Report</div>
                            <div class="text-muted small">Formatted document for printing</div>
                          </div>
                        </div>
                        <button class="btn btn-outline-danger btn-sm" @click="exportData('pdf')">
                          <Icon icon="tabler:download" class="me-1" />
                          Export
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="col-md-4">
                  <div class="alert alert-info">
                    <Icon icon="tabler:info-circle" class="me-2" />
                    <strong>Data Export Information</strong>
                    <ul class="mb-0 mt-2">
                      <li>Exports may take a few minutes to generate</li>
                      <li>You'll receive an email when ready</li>
                      <li>Download links expire after 7 days</li>
                      <li>All exports are encrypted</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Account Deletion View -->
        <div v-else-if="currentView === 'delete'" class="view-content">
          <div class="card border-danger">
            <div class="card-header bg-danger-lt">
              <h3 class="card-title text-danger mb-0">
                <Icon icon="tabler:alert-triangle" class="me-2" />
                Delete Account
              </h3>
            </div>
            <div class="card-body">
              <div class="alert alert-danger">
                <Icon icon="tabler:alert-triangle" class="me-2" />
                <strong>Warning:</strong> This action is irreversible. Your account and all associated data will be
                permanently deleted.
              </div>
              <h4>What will be deleted:</h4>
              <ul class="mb-4">
                <li>Your profile information and settings</li>
                <li>All uploaded files and documents</li>
                <li>Activity history and logs</li>
                <li>Any personalized configurations</li>
              </ul>
              <h4>Before you delete your account:</h4>
              <ul class="mb-4">
                <li>Download any important data you want to keep</li>
                <li>Cancel any active subscriptions</li>
                <li>Inform team members if you're part of a group</li>
              </ul>
              <div class="row">
                <div class="col-md-6">
                  <div class="mb-3">
                    <label class="form-label">To confirm deletion, type <strong>DELETE</strong> below:</label>
                    <input v-model="deleteConfirmation" type="text" class="form-control"
                      placeholder="Type DELETE to confirm">
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Enter your password to confirm:</label>
                    <input v-model="deletePassword" type="password" class="form-control"
                      placeholder="Enter your password">
                  </div>
                  <button class="btn btn-danger" :disabled="deleteConfirmation !== 'DELETE' || !deletePassword"
                    @click="deleteAccount">
                    <Icon icon="tabler:trash" class="me-1" />
                    Permanently Delete Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Default/Unknown View -->
        <div v-else class="view-content">
          <div class="card">
            <div class="card-body text-center py-5">
              <Icon icon="tabler:settings" size="48" class="text-muted mb-3" />
              <h3>{{ currentView.charAt(0).toUpperCase() + currentView.slice(1) }}</h3>
              <p class="text-muted">This section is under development.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Two-Factor Authentication Setup Modal -->
  <TwoFactorSetupModal
    :show="showSetupModal"
    @close="showSetupModal = false"
    @success="handle2FASetupSuccess"
  />

  <!-- Backup Codes Modal -->
  <BackupCodesModal
    :show="showBackupCodesModal"
    @close="showBackupCodesModal = false"
  />
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { useAuthStore } from '@/stores/auth'
import type { User } from '@/types/auth'
import TwoFactorSetupModal from '@/components/TwoFactorSetupModal.vue'
import BackupCodesModal from '@/components/BackupCodesModal.vue'
import TwoFactorService from '@/services/twoFactorService'

interface Props {
  currentView: string
  hasUnsavedChanges?: boolean
  isSaving?: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  viewChange: [view: string]
  unsavedChanges: [hasChanges: boolean]
}>()

const authStore = useAuthStore()

const userProfile = computed(() => authStore.user)

// Form states
const isSaving = ref(false)
const errors = ref<Record<string, string>>({})
const previewImage = ref<string | null>(null)
const deleteConfirmation = ref('')
const deletePassword = ref('')
const fileInput = ref<HTMLInputElement | null>(null)

// 2FA Modal states
const showSetupModal = ref(false)
const showBackupCodesModal = ref(false)

// Editable profile data
const editableProfile = ref({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  department: '',
  bio: ''
})

// Editable settings data
const editableSettings = ref({
  theme: 'auto',
  language: 'en',
  timezone: 'America/New_York',
  dateFormat: 'MM/DD/YYYY',
  emailNotifications: true,
  pushNotifications: true,
  smsNotifications: false,
  profileVisibility: true,
  activityTracking: true,
  dataSharing: false
})

// Password form
const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const showPassword = ref({
  current: false,
  new: false,
  confirm: false
})

// Password strength tracking
const passwordStrength = ref({
  length: false,
  uppercase: false,
  lowercase: false,
  number: false,
  special: false
})

// Mock data for demonstration
const recentActivities = ref([
  {
    id: 1,
    type: 'login',
    icon: 'tabler:login',
    title: 'Account Login',
    description: 'Successful login from Chrome on Windows',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    location: 'New York, NY',
    status: 'success'
  },
  {
    id: 2,
    type: 'profile',
    icon: 'tabler:user-edit',
    title: 'Profile Updated',
    description: 'Updated personal information and preferences',
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    location: 'New York, NY',
    status: 'completed'
  },
  {
    id: 3,
    type: 'security',
    icon: 'tabler:shield-check',
    title: 'Two-Factor Authentication',
    description: 'Enabled 2FA for enhanced security',
    timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    status: 'enabled'
  },
  {
    id: 4,
    type: 'password',
    icon: 'tabler:key',
    title: 'Password Changed',
    description: 'Successfully updated account password',
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    location: 'New York, NY',
    status: 'completed'
  },
  {
    id: 5,
    type: 'download',
    icon: 'tabler:download',
    title: 'Data Export',
    description: 'Downloaded profile data in JSON format',
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'completed'
  },
  {
    id: 6,
    type: 'settings',
    icon: 'tabler:settings',
    title: 'Settings Updated',
    description: 'Changed notification preferences',
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'updated'
  }
])

const activeSessions = ref([
  {
    id: 'current',
    device: 'Chrome on Windows 11',
    location: 'New York, NY',
    ipAddress: '192.168.1.100',
    lastActive: new Date().toISOString(),
    current: true
  },
  {
    id: 'mobile',
    device: 'Safari on iPhone',
    location: 'New York, NY',
    ipAddress: '192.168.1.105',
    lastActive: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    current: false
  }
])

const securityLogs = ref([
  {
    id: 1,
    icon: 'tabler:login',
    event: 'Successful Login',
    description: 'Login from Chrome on Windows',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    severity: 'success'
  },
  {
    id: 2,
    icon: 'tabler:alert-triangle',
    event: 'Failed Login Attempt',
    description: 'Invalid password from unknown device',
    timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    severity: 'warning'
  }
])

// Helper functions
const getFullName = (user: User | null | undefined): string => {
  if (!user) return ''
  const firstName = user.firstName || ''
  const lastName = user.lastName || ''
  return `${firstName} ${lastName}`.trim() || user.email?.split('@')[0] || ''
}

const getInitials = (name: string | undefined): string => {
  if (!name) return 'U'
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')
}

const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return 'Never'
  return new Date(dateString).toLocaleDateString()
}

const formatRelativeTime = (dateString: string | undefined): string => {
  if (!dateString) return 'Never'
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} minutes ago`
  if (diffHours < 24) return `${diffHours} hours ago`
  if (diffDays < 7) return `${diffDays} days ago`
  return formatDate(dateString)
}

const getAccountAge = (): number => {
  if (!userProfile.value?.createdAt) return 0
  const created = new Date(userProfile.value.createdAt)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - created.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

const getProfileCompleteness = (): number => {
  if (!userProfile.value) return 0
  const fields = ['firstName', 'lastName', 'email', 'phone', 'avatar']
  const completed = fields.filter(field => userProfile.value?.[field as keyof User]).length
  return Math.round((completed / fields.length) * 100)
}

const getTotalLogins = (): number => {
  return (userProfile.value as any)?.loginCount || 0
}

const getSecurityScore = (): number => {
  let score = 0
  if (userProfile.value?.twoFactorEnabled) score += 40
  if ((userProfile.value as any)?.emailVerified) score += 30
  if (getPasswordAge() < 90) score += 30
  return score
}

const getPasswordAge = (): number => {
  if (!(userProfile.value as any)?.passwordUpdatedAt) return 0
  const updated = new Date((userProfile.value as any).passwordUpdatedAt)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - updated.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

const getDeviceIcon = (device: string): string => {
  if (device.toLowerCase().includes('iphone') || device.toLowerCase().includes('android')) {
    return 'tabler:device-mobile'
  }
  if (device.toLowerCase().includes('ipad') || device.toLowerCase().includes('tablet')) {
    return 'tabler:device-tablet'
  }
  return 'tabler:device-desktop'
}

const getActivityAvatarClass = (type: string): string => {
  const classes: Record<string, string> = {
    login: 'bg-blue-lt text-blue',
    profile: 'bg-green-lt text-green',
    security: 'bg-purple-lt text-purple',
    password: 'bg-orange-lt text-orange',
    download: 'bg-cyan-lt text-cyan',
    settings: 'bg-gray-lt text-gray'
  }
  return classes[type] || 'bg-gray-lt text-gray'
}

const getActivityBadgeClass = (status: string): string => {
  const classes: Record<string, string> = {
    success: 'bg-green-lt text-green',
    completed: 'bg-blue-lt text-blue',
    enabled: 'bg-purple-lt text-purple',
    updated: 'bg-cyan-lt text-cyan',
    warning: 'bg-yellow-lt text-yellow',
    error: 'bg-red-lt text-red'
  }
  return classes[status] || 'bg-gray-lt text-gray'
}

// Password validation
const validatePassword = () => {
  const password = passwordForm.value.newPassword
  passwordStrength.value = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  }
}

const isPasswordValid = computed(() => {
  return Object.values(passwordStrength.value).every(Boolean) &&
    passwordForm.value.newPassword === passwordForm.value.confirmPassword
})

const getPasswordStrengthPercentage = (): number => {
  const validCount = Object.values(passwordStrength.value).filter(Boolean).length
  return (validCount / 5) * 100
}

const getPasswordStrengthClass = (): string => {
  const percentage = getPasswordStrengthPercentage()
  if (percentage < 40) return 'bg-danger'
  if (percentage < 80) return 'bg-warning'
  return 'bg-success'
}

const getPasswordStrengthText = (): string => {
  const percentage = getPasswordStrengthPercentage()
  if (percentage < 40) return 'Weak'
  if (percentage < 80) return 'Medium'
  return 'Strong'
}

// Form handlers
const savePersonalInfo = async () => {
  isSaving.value = true
  errors.value = {}

  try {
    // Validate form
    if (!editableProfile.value.firstName.trim()) {
      errors.value.firstName = 'First name is required'
    }
    if (!editableProfile.value.lastName.trim()) {
      errors.value.lastName = 'Last name is required'
    }
    if (editableProfile.value.phone && !/^[+]?[1-9]\d{1,14}$/.test(editableProfile.value.phone.replace(/[\s\-\(\)]/g, ''))) {
      errors.value.phone = 'Please enter a valid phone number'
    }

    if (Object.keys(errors.value).length > 0) {
      return
    }

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Here you would make the actual API call
    // await authStore.updateProfile(editableProfile.value)

    console.log('Profile updated:', editableProfile.value)
  } catch (error) {
    console.error('Failed to update profile:', error)
  } finally {
    isSaving.value = false
  }
}

const saveSettings = async () => {
  isSaving.value = true
  try {
    await new Promise(resolve => setTimeout(resolve, 1000))
    console.log('Settings saved:', editableSettings.value)
  } catch (error) {
    console.error('Failed to save settings:', error)
  } finally {
    isSaving.value = false
  }
}

const changePassword = async () => {
  if (!isPasswordValid.value) return

  isSaving.value = true
  errors.value = {}

  try {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Reset form
    passwordForm.value = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }

    console.log('Password changed successfully')
  } catch (error) {
    console.error('Failed to change password:', error)
  } finally {
    isSaving.value = false
  }
}

const handleFileSelect = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  // Validate file
  if (file.size > 5 * 1024 * 1024) {
    alert('File size must be less than 5MB')
    return
  }

  if (!file.type.startsWith('image/')) {
    alert('Please select an image file')
    return
  }

  // Create preview
  const reader = new FileReader()
  reader.onload = (e) => {
    previewImage.value = e.target?.result as string
  }
  reader.readAsDataURL(file)
}

const removeAvatar = () => {
  previewImage.value = null
  // Here you would also call API to remove avatar
}

const resetPersonalInfo = () => {
  if (userProfile.value) {
    editableProfile.value = {
      firstName: userProfile.value.firstName || '',
      lastName: userProfile.value.lastName || '',
      email: userProfile.value.email,
      phone: (userProfile.value as any).phone || '',
      dateOfBirth: (userProfile.value as any).dateOfBirth || '',
      department: (userProfile.value as any).department || '',
      bio: (userProfile.value as any).bio || ''
    }
  }
  errors.value = {}
}

const resetSettings = () => {
  editableSettings.value = {
    theme: userProfile.value?.settings?.theme || 'auto',
    language: userProfile.value?.settings?.language || 'en',
    timezone: (userProfile.value?.settings as any)?.timezone || 'America/New_York',
    dateFormat: (userProfile.value?.settings as any)?.dateFormat || 'MM/DD/YYYY',
    emailNotifications: (userProfile.value?.settings as any)?.emailNotifications ?? true,
    pushNotifications: (userProfile.value?.settings as any)?.pushNotifications ?? true,
    smsNotifications: (userProfile.value?.settings as any)?.smsNotifications ?? false,
    profileVisibility: (userProfile.value?.settings as any)?.profileVisibility ?? true,
    activityTracking: (userProfile.value?.settings as any)?.activityTracking ?? true,
    dataSharing: (userProfile.value?.settings as any)?.dataSharing ?? false
  }
}

const resetPasswordForm = () => {
  passwordForm.value = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  }
  errors.value = {}
  showPassword.value = {
    current: false,
    new: false,
    confirm: false
  }
}

// Action handlers
const requestEmailChange = () => {
  alert('Please contact support to change your email address for security reasons.')
}

const exportProfile = () => {
  console.log('Exporting profile...')
}

const printProfile = () => {
  window.print()
}

const setupTwoFactor = () => {
  console.log('Setting up two-factor authentication...')
}

const disableTwoFactor = async () => {
  if (confirm('Are you sure you want to disable two-factor authentication? This will make your account less secure.')) {
    try {
      await TwoFactorService.disable()
      // Refresh user data to update 2FA status
      await authStore.fetchUser()
      console.log('Two-factor authentication disabled successfully')
    } catch (error) {
      console.error('Failed to disable two-factor authentication:', error)
    }
  }
}

const handle2FASetupSuccess = async () => {
  // Refresh user data to update 2FA status
  await authStore.fetchUser()
  showSetupModal.value = false
}

const terminateSession = (sessionId: string) => {
  if (confirm('Are you sure you want to terminate this session?')) {
    activeSessions.value = activeSessions.value.filter(s => s.id !== sessionId)
  }
}

const exportData = (format: string) => {
  console.log(`Exporting data in ${format} format...`)
  // Simulate export process
  alert(`Your data export in ${format.toUpperCase()} format has been queued. You will receive an email when it's ready.`)
}

const deleteAccount = async () => {
  if (deleteConfirmation.value !== 'DELETE' || !deletePassword.value) {
    return
  }

  if (confirm('This action cannot be undone. Are you absolutely sure?')) {
    console.log('Deleting account...')
    // Here you would call the delete API
  }
}

// Initialize editable data when user profile changes
watch(userProfile, (newProfile) => {
  if (newProfile) {
    editableProfile.value = {
      firstName: newProfile.firstName || '',
      lastName: newProfile.lastName || '',
      email: newProfile.email,
      phone: (newProfile as any).phone || '',
      dateOfBirth: (newProfile as any).dateOfBirth || '',
      department: (newProfile as any).department || '',
      bio: (newProfile as any).bio || ''
    }

    editableSettings.value = {
      theme: newProfile.settings?.theme || 'auto',
      language: newProfile.settings?.language || 'en',
      timezone: (newProfile.settings as any)?.timezone || 'America/New_York',
      dateFormat: (newProfile.settings as any)?.dateFormat || 'MM/DD/YYYY',
      emailNotifications: (newProfile.settings as any)?.emailNotifications ?? true,
      pushNotifications: (newProfile.settings as any)?.pushNotifications ?? true,
      smsNotifications: (newProfile.settings as any)?.smsNotifications ?? false,
      profileVisibility: (newProfile.settings as any)?.profileVisibility ?? true,
      activityTracking: (newProfile.settings as any)?.activityTracking ?? true,
      dataSharing: (newProfile.settings as any)?.dataSharing ?? false
    }
  }
}, { immediate: true })

// Watch for changes to emit unsaved changes status
watch([editableProfile, editableSettings], () => {
  const hasChanges =
    editableProfile.value.firstName !== (userProfile.value?.firstName || '') ||
    editableProfile.value.lastName !== (userProfile.value?.lastName || '') ||
    editableProfile.value.phone !== ((userProfile.value as any)?.phone || '') ||
    editableProfile.value.dateOfBirth !== ((userProfile.value as any)?.dateOfBirth || '') ||
    editableProfile.value.department !== ((userProfile.value as any)?.department || '') ||
    editableProfile.value.bio !== ((userProfile.value as any)?.bio || '') ||
    editableSettings.value.theme !== (userProfile.value?.settings?.theme || 'auto') ||
    editableSettings.value.language !== (userProfile.value?.settings?.language || 'en')

  emit('unsavedChanges', hasChanges)
}, { deep: true })
</script>

<style scoped>
.profile-content {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: var(--tblr-bg-surface);
  min-height: 0;
  height: 100%;
}

.page-body {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 0;
  min-height: 0;
}

.view-content {
  margin-top: 0px;
  animation: slideInUp 0.4s ease-out;
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(0);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.avatar-xl {
  width: 4rem;
  height: 4rem;
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

/* Recent Activity Styles */
.activity-item {
  border: none !important;
  transition: all 0.2s ease;
  padding: 1rem;
}

.activity-item:hover {
  background-color: var(--tblr-gray-50);
  transform: translateX(2px);
}

.activity-title {
  font-size: 0.875rem;
  line-height: 1.4;
}

.activity-description {
  font-size: 0.75rem;
  line-height: 1.3;
  margin-top: 0.25rem;
}

.activity-meta {
  font-size: 0.75rem;
  margin-top: 0.5rem;
}

.activity-status .badge {
  font-size: 0.65rem;
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
}

/* Avatar for activities */
.avatar-sm {
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-weight: 500;
}

/* Status indicator improvements */
.stat-item {
  padding: 1rem;
  border-radius: 0.5rem;
  transition: all 0.2s ease;
}

.stat-item:hover {
  background-color: var(--tblr-gray-50);
  transform: translateY(-1px);
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.2;
}

.stat-label {
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-top: 0.25rem;
  opacity: 0.8;
}

/* Security items styling */
.security-item {
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--tblr-border-color-translucent);
}

.security-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

/* Info items styling */
.info-item {
  padding: 1rem;
  border-radius: 0.5rem;
  transition: all 0.2s ease;
  background-color: transparent;
}

.info-item:hover {
  background-color: var(--tblr-gray-50);
  transform: translateY(-1px);
}

.info-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--tblr-text-muted);
  margin-bottom: 0.5rem;
}

.info-value {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--tblr-body-color);
  line-height: 1.4;
}
</style>