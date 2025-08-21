<template>
  <div v-if="user && user.email" class="nav-item dropdown">
    <a href="#" @click.prevent class="nav-link d-flex lh-1 p-0 ps-2" data-bs-toggle="dropdown"
      aria-label="Open user menu">
      <span class="avatar avatar-sm text-primary">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"
          class="icon icon-tabler icons-tabler-filled icon-tabler-user">
          <path stroke="none" d="M0 0h24v24H0z" fill="none" />
          <path d="M12 2a5 5 0 1 1 -5 5l.005 -.217a5 5 0 0 1 4.995 -4.783z" />
          <path d="M14 14a5 5 0 0 1 5 5v1a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-1a5 5 0 0 1 5 -5h4z" />
        </svg>
      </span>
      <div class="d-none d-md-block ps-2 text-truncate user-info-truncate">
        <div class="text-light text-truncate w-100 overflow-hidden lh-xs">{{ user?.name }}
        </div>
        <div class="mt-1 small text-truncate w-auto overflow-hidden lh-xs"
          style="color: var(--tblr-gray-300);padding-right: 3px;">{{ user?.email }}
        </div>
      </div>
    </a>
    <div class="dropdown-menu dropdown-menu-end dropdown-menu-arrow" data-bs-theme="light">
      <router-link to="/profile" class="dropdown-item" exact-active-class="active">Profile</router-link>
      <div class="dropdown-divider"></div>
      <div @click="showConfirm = true" class="dropdown-item">Logout</div>
    </div>

    <div v-if="showConfirm" class="modal d-block modal-backdrop" tabindex="-1" data-bs-theme="light">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header border-0">
            <h5 class="modal-title">Logout bestätigen</h5>
            <button type="button" class="btn-close" @click="showConfirm = false"></button>
          </div>
          <div class="modal-body">
            <p>Möchtest du dich wirklich abmelden?</p>
          </div>
          <div class="modal-footer bg-white border-0 p-1 gap-0">
            <button class="btn btn-secondary" @click="showConfirm = false">Abbrechen</button>
            <button class="btn btn-danger" @click="confirmLogout">Logout</button>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="nav-item dropdown">
    <a href="#" @click.prevent class="nav-link d-flex lh-1 p-0 px-2" data-bs-toggle="dropdown"
      aria-label="Open user menu">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"
        class="icon icon-tabler icons-tabler-filled icon-tabler-lock">
        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
        <path
          d="M12 2a5 5 0 0 1 5 5v3a3 3 0 0 1 3 3v6a3 3 0 0 1 -3 3h-10a3 3 0 0 1 -3 -3v-6a3 3 0 0 1 3 -3v-3a5 5 0 0 1 5 -5m0 12a2 2 0 0 0 -1.995 1.85l-.005 .15a2 2 0 1 0 2 -2m0 -10a3 3 0 0 0 -3 3v3h6v-3a3 3 0 0 0 -3 -3" />
      </svg>
    </a>
    <div class="dropdown-menu dropdown-menu-end dropdown-menu-arrow" data-bs-theme="light">
      <router-link to="/login" class="dropdown-item" exact-active-class="active">Login</router-link>
      <router-link to="/register" class="dropdown-item" exact-active-class="active">Register</router-link>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
  user: Object
})

const showConfirm = ref(false)
const emit = defineEmits(['logout'])

// Note: The confirm logout modal can be extracted to a separate ConfirmModal component for reuse.

function confirmLogout() {
  showConfirm.value = false
  emit('logout')
}
</script>

<style scoped>
.modal-backdrop {
  background: rgba(0, 0, 0, 0.5);
}

.navbar .user-info-truncate {
  max-width: 140px !important;
}

.avatar {
  border: none;
  background-color: rgba(0, 0, 0, 0.2);
  padding: 0 5px;
  --tblr-avatar-bg: transparent !important;

  .icon {
    width: 1.2rem;
    height: 1.2rem;
    color: var(--tblr-light);
  }
}

.lh-xs {
  line-height: .8;
}
</style>