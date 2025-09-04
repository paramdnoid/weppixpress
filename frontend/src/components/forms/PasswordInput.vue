<template>
  <div class="form-floating mb-3 position-relative">
    <input :id="id" :type="show ? 'text' : 'password'" :placeholder="placeholder" class="form-control"
      :value="modelValue" @input="$emit('update:modelValue', $event.target.value)" required autocomplete="current-password" />
    <label :for="id">{{ label }}</label>

      <Icon @click="show = !show" class="position-absolute top-50 end-0 translate-middle-y me-2" :icon="show ? 'mdi:eye-off' : 'mdi:eye'" />
  </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  modelValue: String,
  id: String,
  label: String,
  placeholder: String
});

const show = ref(false);
</script>

<style>
.iconify:hover {
  cursor: pointer;
  opacity: .5;
}
</style>