<template>
  <router-view />
  <toast />
  <GlobalUploadOverlay />
</template>

<script setup>
import Toast from '@/components/base/Toast.vue';
import GlobalUploadOverlay from '@/components/base/GlobalUploadOverlay.vue';
</script>