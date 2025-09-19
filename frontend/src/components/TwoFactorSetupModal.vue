<template>
  <div class="modal modal-blur" :class="{ show: show }" style="display: block" v-if="show">
    <div class="modal-dialog modal-lg modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">
            <Icon icon="tabler:shield-plus" class="me-2" />
            Set Up Two-Factor Authentication
          </h5>
          <button type="button" class="btn-close" @click="closeModal" :disabled="isLoading"></button>
        </div>

        <div class="modal-body">
          <!-- Step 1: Download App -->
          <div v-if="currentStep === 1" class="text-center">
            <div class="avatar avatar-xl bg-blue-lt text-blue mx-auto mb-4">
              <Icon icon="tabler:download" width="32" height="32" />
            </div>
            <h4 class="mb-3">Download Authenticator App</h4>
            <p class="text-muted mb-4">
              First, download a compatible authenticator app on your mobile device.
            </p>

            <div class="row g-3 mb-4">
              <div class="col-md-4">
                <div class="card card-link">
                  <div class="card-body text-center p-3">
                    <Icon icon="tabler:brand-google" class="text-danger mb-2" width="32" height="32" />
                    <div class="fw-medium">Google Authenticator</div>
                    <div class="small text-muted">Most popular choice</div>
                  </div>
                </div>
              </div>
              <div class="col-md-4">
                <div class="card card-link">
                  <div class="card-body text-center p-3">
                    <Icon icon="tabler:shield-check" class="text-success mb-2" width="32" height="32" />
                    <div class="fw-medium">Authy</div>
                    <div class="small text-muted">Multi-device sync</div>
                  </div>
                </div>
              </div>
              <div class="col-md-4">
                <div class="card card-link">
                  <div class="card-body text-center p-3">
                    <Icon icon="tabler:key" class="text-primary mb-2" width="32" height="32" />
                    <div class="fw-medium">1Password</div>
                    <div class="small text-muted">Password manager</div>
                  </div>
                </div>
              </div>
            </div>

            <div class="alert alert-info">
              <Icon icon="tabler:info-circle" class="me-2" />
              <strong>Note:</strong> You can use any TOTP-compatible authenticator app.
            </div>
          </div>

          <!-- Step 2: Scan QR Code -->
          <div v-else-if="currentStep === 2" class="text-center">
            <p class="text-muted mb-4">
              Open your authenticator app and scan this QR code.
            </p>

            <!-- QR Code Display -->
            <div class="mb-4">
              <div v-if="qrCodeData" class="border rounded p-3 bg-white mx-auto" style="max-width: 250px;">
                <img :src="qrCodeData" alt="2FA QR Code" class="img-fluid" />
              </div>
              <div v-else class="text-muted">
                <div class="spinner-border spinner-border-sm me-2" role="status" v-if="isLoading"></div>
                {{ isLoading ? 'Generating QR Code...' : 'QR Code not available' }}
              </div>
            </div>

            <!-- Manual Entry Option -->
            <div class="alert alert-secondary">
              <div class="d-flex align-items-center justify-content-between">
                <div>
                  <strong>Can't scan?</strong> Enter this key manually:
                </div>
                <button class="btn btn-sm btn-outline-secondary" @click="copySecret">
                  <Icon icon="tabler:copy" width="14" height="14" />
                  Copy
                </button>
              </div>
              <code class="d-block mt-2 user-select-all">{{ manualKey }}</code>
            </div>
          </div>

          <!-- Step 3: Verify Code -->
          <div v-else-if="currentStep === 3" class="text-center">
            <div class="avatar avatar-xl bg-green-lt text-green mx-auto mb-4">
              <Icon icon="tabler:check" width="32" height="32" />
            </div>
            <h4 class="mb-3">Verify Setup</h4>
            <p class="text-muted mb-4">
              Enter the 6-digit code from your authenticator app to complete setup.
            </p>

            <form @submit.prevent="verifyAndEnable">
              <div class="mb-3">
                <label class="form-label">Verification Code</label>
                <input
                  v-model="verificationCode"
                  type="text"
                  class="form-control form-control-lg text-center"
                  :class="{ 'is-invalid': verificationError }"
                  placeholder="000000"
                  maxlength="6"
                  pattern="\d{6}"
                  required
                  :disabled="isLoading"
                  @input="clearError"
                  ref="codeInput"
                />
                <div v-if="verificationError" class="invalid-feedback">
                  {{ verificationError }}
                </div>
              </div>

              <button type="submit" class="btn btn-primary btn-lg" :disabled="isLoading || verificationCode.length !== 6">
                <Icon v-if="isLoading" icon="tabler:loader-2" class="animate-spin me-2" />
                <Icon v-else icon="tabler:shield-check" class="me-2" />
                {{ isLoading ? 'Verifying...' : 'Enable Two-Factor Authentication' }}
              </button>
            </form>
          </div>

          <!-- Step 4: Success -->
          <div v-else-if="currentStep === 4" class="text-center">
            <div class="avatar avatar-xl bg-success-lt text-success mx-auto mb-4">
              <Icon icon="tabler:circle-check" width="32" height="32" />
            </div>
            <h4 class="mb-3">Setup Complete!</h4>
            <p class="text-success mb-4">
              Two-factor authentication has been successfully enabled for your account.
            </p>

            <!-- Backup Codes -->
            <div v-if="backupCodes.length > 0" class="alert alert-warning">
              <div class="d-flex align-items-center justify-content-between mb-2">
                <strong>
                  <Icon icon="tabler:shield-x" class="me-1" />
                  Save Your Backup Codes
                </strong>
                <button class="btn btn-sm btn-outline-warning" @click="downloadBackupCodes">
                  <Icon icon="tabler:download" width="14" height="14" />
                  Download
                </button>
              </div>
              <p class="small mb-3">
                Store these backup codes in a safe place. You can use them to access your account if you lose your phone.
              </p>
              <div class="row g-2">
                <div v-for="(code, index) in backupCodes" :key="index" class="col-6">
                  <code class="d-block p-2 bg-white rounded text-center">{{ code }}</code>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button
            v-if="currentStep > 1 && currentStep < 4"
            type="button"
            class="btn btn-outline-secondary"
            @click="previousStep"
            :disabled="isLoading"
          >
            <Icon icon="tabler:arrow-left" class="me-1" />
            Back
          </button>

          <button
            v-if="currentStep < 3"
            type="button"
            class="btn btn-primary"
            @click="nextStep"
            :disabled="isLoading"
          >
            Next
            <Icon icon="tabler:arrow-right" class="ms-1" />
          </button>

          <button
            v-if="currentStep === 4"
            type="button"
            class="btn btn-success"
            @click="closeModal"
          >
            <Icon icon="tabler:check" class="me-1" />
            Done
          </button>
        </div>
      </div>
    </div>
  </div>
  <div class="modal-backdrop show" v-if="show"></div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { Icon } from '@iconify/vue'
import TwoFactorService from '@/services/twoFactorService'

interface Props {
  show: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  success: []
}>()

// State
const currentStep = ref(1)
const isLoading = ref(false)
const qrCodeData = ref('')
const manualKey = ref('')
const secret = ref('')
const verificationCode = ref('')
const verificationError = ref('')
const backupCodes = ref<string[]>([])
const codeInput = ref<HTMLInputElement>()

// Methods
const closeModal = () => {
  resetState()
  emit('close')
}

const resetState = () => {
  currentStep.value = 1
  isLoading.value = false
  qrCodeData.value = ''
  manualKey.value = ''
  secret.value = ''
  verificationCode.value = ''
  verificationError.value = ''
  backupCodes.value = []
}

const nextStep = async () => {
  if (currentStep.value === 1) {
    currentStep.value = 2
    await setupTwoFactor()
  } else if (currentStep.value === 2) {
    currentStep.value = 3
    await nextTick(() => {
      codeInput.value?.focus()
    })
  }
}

const previousStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

const setupTwoFactor = async () => {
  try {
    isLoading.value = true
    const setup = await TwoFactorService.setup()
    qrCodeData.value = setup.qrCode
    manualKey.value = setup.manualEntryKey
    secret.value = setup.secret
  } catch (error) {
    // Handle setup error silently
    // Handle error
  } finally {
    isLoading.value = false
  }
}

const verifyAndEnable = async () => {
  try {
    isLoading.value = true
    verificationError.value = ''

    const result = await TwoFactorService.enable(verificationCode.value, secret.value)

    if (result.success) {
      if (result.backupCodes) {
        backupCodes.value = result.backupCodes
      }
      currentStep.value = 4
      emit('success')
    }
  } catch (error: any) {
    verificationError.value = error.response?.data?.message || 'Invalid verification code'
  } finally {
    isLoading.value = false
  }
}

const clearError = () => {
  verificationError.value = ''
}

const copySecret = async () => {
  try {
    await navigator.clipboard.writeText(manualKey.value)
    // Show success toast
  } catch (error) {
    // Handle copy error silently
  }
}

const downloadBackupCodes = () => {
  const text = backupCodes.value.join('\n')
  const blob = new Blob([`Two-Factor Authentication Backup Codes\n\n${text}\n\nKeep these codes safe! Each can only be used once.`], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'backup-codes.txt'
  a.click()
  URL.revokeObjectURL(url)
}

// Watch for modal show/hide
watch(() => props.show, (newVal) => {
  if (newVal) {
    resetState()
  }
})
</script>

<style scoped>
.modal {
  z-index: 1050;
}

.modal-backdrop {
  z-index: 1040;
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.card-link {
  cursor: pointer;
  transition: all 0.2s ease;
}

.card-link:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.user-select-all {
  user-select: all;
}
</style>