<template>
  <nav aria-label="Breadcrumb">
    <ol class="breadcrumb breadcrumb-muted breadcrumb-arrows ps-2">
      <li
        v-for="(item, idx) in items"
        :key="item.path || idx"
        class="breadcrumb-item"
        :class="{ active: idx === items.length - 1 }"
      >
        <button
          v-if="item.path && idx < items.length - 1"
          type="button"
          class="btn btn-link p-0 m-0 border-0"
          :title="item.name"
          :aria-label="`Navigate to ${item.name}`"
          @click.stop.prevent="handleNavigate(item)"
          v-text="item.name"
        />
        <span
          v-else
          :title="item.name"
          v-text="item.name"
        />
      </li>
    </ol>
  </nav>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue'

const props = defineProps({
  items: {
    type: Array,
    required: true,
    validator: (items) => {
      return Array.isArray(items) && items.every(item =>
        item && typeof item === 'object' && 'name' in item
      )
    }
  }
})

const emit = defineEmits(['navigate'])

function handleNavigate(item) {
  emit('navigate', item)
}
</script>

<style scoped>
/* Base breadcrumb styling from FileView.vue */
.breadcrumb,
.breadcrumb-item {
  display: inline-flex;
  align-items: center;
  margin-bottom: 0;
}

.breadcrumb-item {
  min-width: 0;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.8rem;
  font-weight: 300;
}

.breadcrumb-item .btn-link {
  --tblr-btn-line-height: 1;
  color: var(--tblr-primary);
  text-decoration: none;
  font-size: inherit;
  font-weight: inherit;
  min-width: 0;
}

.breadcrumb-item .btn-link:hover {
  text-decoration: none;
  background-color: transparent;
}

.breadcrumb-item .btn-link:focus {
  outline: 2px solid var(--tblr-primary);
  outline-offset: 2px;
  border-radius: 0.25rem;
}

.breadcrumb-item.active {
  font-weight: 400;
  color: var(--tblr-dark);
}

.breadcrumb-item.active span {
  color: var(--tblr-dark);
  font-weight: 400;
}
</style>