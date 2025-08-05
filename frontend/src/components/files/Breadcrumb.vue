<template>
  <nav aria-label="Breadcrumb">
    <ol class="breadcrumb breadcrumb-muted breadcrumb-arrows ps-2">
      <li v-for="(item, idx) in crumbItems" :key="item.path || idx" class="breadcrumb-item"
        :class="{ active: idx === crumbItems.length - 1 }"
        :aria-current="idx === crumbItems.length - 1 ? 'page' : null">
        <template v-if="item.isObject && idx < crumbItems.length - 1">
          <a :href="item.path" @click.prevent="emit('navigate', item.path)" :title="item.name">

            <template v-if="idx === 0">
            <Icon icon="mdi:home" width="16" height="16" class="me-0" />
            </template>
            <template v-else>
              {{ item.name }}
            </template>

          </a>
        </template>
        <template v-else>
          <span :title="item.name">
            {{ item.name }}
          </span>
        </template>
      </li>
    </ol>
  </nav>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  segments: {
    type: Array,
    default: () => []
  }
});
const emit = defineEmits(['navigate']);

const crumbItems = computed(() =>
  props.segments.map(seg => {
    if (typeof seg === 'object' && seg !== null) {
      return { name: seg.name, path: seg.path, isObject: true };
    }
    return { name: seg, path: '', isObject: false };
  })
);
</script>

<style scoped>
.breadcrumb {
  display: inline-flex;
}

.breadcrumb-item {
  min-width: 0;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: .8rem;
  font-weight: 200;
}

.breadcrumb-item a,
.breadcrumb-item span {
  display: inline-block;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
}

.breadcrumb-item.active {
  font-weight: 400;
  color: var(--tblr-black)
}
</style>