<template>
  <component 
    :is="tag"
    :class="buttonClasses"
    :disabled="disabled || loading"
    v-bind="$attrs"
    @click="handleClick"
  >
    <Icon
      v-if="loading"
      name="mdi:loading"
      class="animate-spin me-2"
    />
    <Icon
      v-else-if="icon"
      :name="icon"
      :class="iconClasses"
    />
    <slot />
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark' | 'link'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  icon?: string
  iconPosition?: 'left' | 'right'
  tag?: string
  block?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  disabled: false,
  loading: false,
  iconPosition: 'left',
  tag: 'button',
  block: false
})

const emit = defineEmits<{
  click: [event: Event]
}>()

const buttonClasses = computed(() => {
  const classes = ['btn']
  
  if (props.variant) {
    classes.push(`btn-${props.variant}`)
  }
  
  if (props.size && props.size !== 'md') {
    classes.push(`btn-${props.size}`)
  }
  
  if (props.block) {
    classes.push('btn-block')
  }
  
  if (props.loading) {
    classes.push('btn-loading')
  }
  
  return classes
})

const iconClasses = computed(() => {
  const classes: string[] = []
  
  if (props.iconPosition === 'left') {
    classes.push('me-2')
  } else {
    classes.push('ms-2')
  }
  
  return classes
})

function handleClick(event: Event) {
  if (!props.disabled && !props.loading) {
    emit('click', event)
  }
}
</script>