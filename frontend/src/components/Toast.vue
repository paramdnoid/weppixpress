<template>
  <div aria-live="polite" aria-atomic="true" class="position-fixed bottom-0 end-0 p-3" style="z-index: 1060">
    <div v-for="(toast, i) in toasts" :key="i" class="toast show mb-2" :class="toast.bg" role="alert">
      <div class="toast-body d-flex align-items-center">
        <span class="me-2" v-if="toast.icon" v-html="toast.icon"></span>
        {{ toast.message }}
        <button type="button" class="btn-close ms-auto" @click="remove(i)"></button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const toasts = ref([]);

function show(message, options = {}) {
  // options: { type: 'success' | 'danger' | 'info' | 'warning', timeout: ms, icon: svg }
  const types = {
    success: 'bg-success text-white',
    danger: 'bg-danger text-white',
    warning: 'bg-warning text-dark',
    info: 'bg-info text-dark'
  };
  const icons = {
    success: '✅',
    danger: '❌',
    info: 'ℹ️',
    warning: '⚠️'
  };
  const bg = types[options.type] || types.info;
  const icon = options.icon ?? icons[options.type] ?? '';
  const timeout = options.timeout ?? 3000;

  toasts.value.push({ message, bg, icon });
  const index = toasts.value.length - 1;
  setTimeout(() => remove(index), timeout);
}

function remove(index) {
  toasts.value.splice(index, 1);
}

// Im globalen Window für den schnellen Aufruf verfügbar machen:
if (typeof window !== 'undefined') {
  window.$toast = show;
}

</script>