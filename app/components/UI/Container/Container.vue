<template>
  <div :class="classNames">
    <div class="container__wrapper">
      <slot />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  fullScreen: {
    type: Boolean,
    default: false,
  },
});

const classNames = computed(() => {
  return {
    container: true,
    'container--full-screen': props.fullScreen,
  };
});
</script>

<style>
@import 'index.scss';
</style>
