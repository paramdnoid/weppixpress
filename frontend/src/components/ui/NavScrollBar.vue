<template>
  <div class="nav-scroller bg-body">
    <nav class="nav" aria-label="Secondary navigation"> 
      <slot />
    </nav>
  </div>
</template>

<script setup>

</script>
<style scoped>
.nav-scroller {
    position: relative;
    z-index: 2;
    overflow-y: hidden;
} 

.nav-scroller .nav {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    overflow-x: auto;
    white-space: nowrap;
    -webkit-overflow-scrolling: touch;
}
</style>