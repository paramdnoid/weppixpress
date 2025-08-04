<script setup>
defineProps({
  segments: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['navigate']);
const isObject = val => typeof val === 'object' && val !== null;
</script>
<template>
  <div>
  <ol class="breadcrumb breadcrumb-muted breadcrumb-arrows ps-2">
    <li v-for="(seg, idx) in segments" :key="idx" class="breadcrumb-item"
      :class="{ active: idx === segments.length - 1 }" :aria-current="idx === segments.length - 1 ? 'page' : null">
      <template v-if="idx < segments.length - 1">
        <a
          :href="isObject(seg) ? seg.path : '#'"
          @click.prevent="emit('navigate', isObject(seg) ? seg.path : '')"
          :title="isObject(seg) ? seg.name : seg"
        >
          {{ isObject(seg) ? seg.name : seg }}
        </a>
      </template>
      <template v-else>
        <span :title="isObject(seg) ? seg.name : seg">{{ isObject(seg) ? seg.name : seg }}</span>
      </template>
    </li>
  </ol>
  </div>

</template>

<style scoped>
.breadcrumb {
  display: -webkit-inline-box
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