<template>
  <router-view />
  <toast />
  <GlobalUploadOverlay />
  <GlobalModal />
</template>

<script setup>
import Toast from '@/components/base/Toast.vue';
import GlobalUploadOverlay from '@/components/base/GlobalUploadOverlay.vue';
import GlobalModal from '@/components/ui/GlobalModal.vue';
</script>