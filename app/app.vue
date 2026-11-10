<template>
  <div id="app" :class="{ 'is-active': !state.isVisible }">
    <NuxtPage />
    <Preloader />
  </div>
</template>

<script setup>
import { usePreloaderStore } from './stores/preloaderStore';
import Preloader from '~/components/Preloader/Preloader.vue';

// import 'virtual:svg-icons-register';
// import vhFix from '@/utils/vhFix';

// vhFix.init();
const { state } = usePreloaderStore();
</script>
