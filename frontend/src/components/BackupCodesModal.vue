<template>
  <div class="modal modal-blur" :class="{ show: show }" style="display: block" v-if="show">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">
            <Icon icon="tabler:key" class="me-2" />
            Backup Recovery Codes
          </h5>
          <button type="button" class="btn-close" @click="closeModal" :disabled="isLoading"></button>
        </div>

        <div class="modal-body">
          <!-- Loading State -->
          <div v-if="isLoading" class="text-center py-4">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
            <div class="mt-2 text-muted">Loading backup codes...</div>
          </div>

          <!-- No Codes State -->
          <div v-else-if="!hasBackupCodes && !codes.length" class="text-center py-4">
            <div class="avatar avatar-xl bg-warning-lt text-warning mx-auto mb-3">
              <Icon icon="tabler:alert-triangle" width="32" height="32" />
            </div>
            <h4 class="mb-2">No Backup Codes</h4>
            <p class="text-muted mb-4">
              You don't have any backup codes yet. Generate them now to ensure you can access your account if you lose your phone.
            </p>
            <button class="btn btn-primary" @click="generateCodes" :disabled="isGenerating">
              <Icon v-if="isGenerating" icon="tabler:loader-2" class="animate-spin me-2" />
              <Icon v-else icon="tabler:plus" class="me-2" />
              {{ isGenerating ? 'Generating...' : 'Generate Backup Codes' }}
            </button>
          </div>

          <!-- Existing Codes -->
          <div v-else>
            <div class="alert alert-info">
              <Icon icon="tabler:info-circle" class="me-2" />
              <strong>Important:</strong> Each backup code can only be used once. Store them in a safe place.
            </div>

            <div class="row g-2 mb-4">
              <div v-for="(code, index) in codes" :key="index" class="col-6">
                <div class="backup-code">
                  <code class="d-block p-3 bg-light rounded text-center fw-medium">{{ code }}</code>
                </div>
              </div>
            </div>

            <div class="alert alert-warning">
              <Icon icon="tabler:alert-triangle" class="me-2" />
              <strong>Security Notice:</strong>
              <ul class="mb-0 mt-2">
                <li>Save these codes in a secure location</li>
                <li>Don't share them with anyone</li>
                <li>Each code works only once</li>
                <li>Generate new codes if you think these are compromised</li>
              </ul>
            </div>

            <!-- Actions -->
            <div class="d-flex gap-2 justify-content-center">
              <button class="btn btn-outline-primary" @click="downloadCodes">
                <Icon icon="tabler:download" class="me-1" />
                Download
              </button>
              <button class="btn btn-outline-secondary" @click="printCodes">
                <Icon icon="tabler:printer" class="me-1" />
                Print
              </button>
              <button class="btn btn-outline-warning" @click="regenerateCodes" :disabled="isGenerating">
                <Icon v-if="isGenerating" icon="tabler:loader-2" class="animate-spin me-1" />
                <Icon v-else icon="tabler:refresh" class="me-1" />
                {{ isGenerating ? 'Generating...' : 'Regenerate' }}
              </button>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="closeModal">
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
  <div class="modal-backdrop show" v-if="show"></div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import TwoFactorService from '@/services/twoFactorService'

interface Props {
  show: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
}>()

// State
const isLoading = ref(false)
const isGenerating = ref(false)
const codes = ref<string[]>([])
const hasBackupCodes = ref(false)

// Methods
const closeModal = () => {
  emit('close')
}

const loadBackupCodes = async () => {
  try {
    isLoading.value = true
    const result = await TwoFactorService.getBackupCodes()
    codes.value = result.codes || []
    hasBackupCodes.value = result.generated
  } catch (error) {
    console.error('Failed to load backup codes:', error)
    hasBackupCodes.value = false
    codes.value = []
  } finally {
    isLoading.value = false
  }
}

const generateCodes = async () => {
  try {
    isGenerating.value = true
    const result = await TwoFactorService.generateBackupCodes()
    codes.value = result.codes
    hasBackupCodes.value = true
  } catch (error) {
    console.error('Failed to generate backup codes:', error)
  } finally {
    isGenerating.value = false
  }
}

const regenerateCodes = async () => {
  if (confirm('This will invalidate all existing backup codes. Are you sure?')) {
    await generateCodes()
  }
}

const downloadCodes = () => {
  const timestamp = new Date().toISOString().split('T')[0]
  const text = codes.value.map((code, index) => `${index + 1}. ${code}`).join('\n')
  const content = `Two-Factor Authentication Backup Codes
Generated: ${timestamp}

${text}

IMPORTANT SECURITY INFORMATION:
- Keep these codes safe and secure
- Each code can only be used once
- Don't share them with anyone
- Generate new codes if you think these are compromised
- Use these codes if you lose access to your authenticator app`

  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `backup-codes-${timestamp}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

const printCodes = () => {
  const timestamp = new Date().toLocaleString()
  const printContent = `
    <html>
      <head>
        <title>Backup Recovery Codes</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .header { text-align: center; margin-bottom: 30px; }
          .codes { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 20px 0; }
          .code { padding: 10px; border: 1px solid #ddd; text-align: center; font-family: monospace; font-size: 16px; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin-top: 20px; border-radius: 4px; }
          .footer { margin-top: 30px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Two-Factor Authentication Backup Codes</h1>
          <p>Generated: ${timestamp}</p>
        </div>
        <div class="codes">
          ${codes.value.map(code => `<div class="code">${code}</div>`).join('')}
        </div>
        <div class="warning">
          <strong>IMPORTANT SECURITY INFORMATION:</strong>
          <ul>
            <li>Keep these codes safe and secure</li>
            <li>Each code can only be used once</li>
            <li>Don't share them with anyone</li>
            <li>Generate new codes if you think these are compromised</li>
          </ul>
        </div>
        <div class="footer">
          <p>Store this document in a secure location.</p>
        </div>
      </body>
    </html>
  `

  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(printContent)
    printWindow.document.close()
    printWindow.print()
  }
}

// Watch for modal show/hide
watch(() => props.show, (newVal) => {
  if (newVal) {
    loadBackupCodes()
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

.backup-code {
  transition: transform 0.2s ease;
}

.backup-code:hover {
  transform: scale(1.02);
}

.backup-code code {
  user-select: all;
  cursor: pointer;
}
</style>