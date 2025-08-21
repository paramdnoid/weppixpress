<script setup>

const menuItems = [
  { label: 'Files', to: '/files', icon: 'tabler:folders' },
  { label: 'Mails', to: '/mails', icon: 'tabler:mail' },
  { label: 'Flows', to: '/flows', icon: 'tabler:apps' },
  { label: 'Meetings', to: '/meetings', icon: 'tabler:messages' },
]
</script>

<template>
  <ul class="navbar-nav">
    <li v-for="item in menuItems" :key="item.to" class="nav-item">
      <router-link :to="item.to" class="nav-link" exact-active-class="active">
        <span class="nav-link-icon d-md-none d-lg-inline-block">
          <Icon :icon="item.icon" width="24" height="24" class="icon" />
        </span>
        <span class="nav-link-title">{{ item.label }}</span>
      </router-link>
    </li>
  </ul>
</template>