<template>
  <button
    class="menu-button"
    :class="{ 'is-active': menuStore.isMenuOpen }"
    :aria-expanded="menuStore.isMenuOpen"
    @click="menuStore.isMenuOpen = !menuStore.isMenuOpen"
  >
    <svg width="24" height="24" viewBox="0 0 18 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="0" y="0" width="18" height="2" fill="currentColor"></rect>
      <rect x="0" y="5" width="18" height="2" fill="currentColor"></rect>
      <rect x="0" y="10" width="18" height="2" fill="currentColor"></rect>
    </svg>
    <span>Меню</span>
  </button>
</template>

<script setup>
import useMenuStore from './useMenu';
const menuStore = useMenuStore();
</script>

<style>
@import 'style.scss';
</style>
