<template>
  <div class="form-floating mb-3 position-relative">
    <input
      :id="id"
      :type="show ? 'text' : 'password'"
      :placeholder="placeholder"
      class="form-control"
      :value="modelValue"
      required
      autocomplete="current-password"
      @input="$emit('update:modelValue', $event.target.value)"
    >
    <label :for="id">{{ label }}</label>

    <Icon
      class="position-absolute top-50 end-0 translate-middle-y me-2"
      :icon="show ? 'mdi:eye-off' : 'mdi:eye'"
      @click="show = !show"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue';

const _props = defineProps({
  modelValue: { type: String, default: '' },
  id: { type: String, default: '' },
  label: { type: String, default: '' },
  placeholder: { type: String, default: '' }
});

const emit = defineEmits(['update:modelValue'])

const show = ref(false);
</script>

<style>
.iconify:hover {
  cursor: pointer;
  opacity: .5;
}
</style>