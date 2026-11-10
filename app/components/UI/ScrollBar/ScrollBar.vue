<script setup>
// npm i overlayscrollbars-vue
import { OverlayScrollbarsComponent } from 'overlayscrollbars-vue';

const emmit = defineEmits(['scroll', 'initialized']);

const initialized = (instance) => {
  emmit('initialized', instance.elements().content);
};
const scroll = (instance, e) => {
  emmit('scroll', instance.elements().content, e);
};
</script>

<template>
  <OverlayScrollbarsComponent
    class="scroll-bar"
    data-lenis-prevent
    defer
    :events="{ scroll, initialized, updated: initialized }"
  >
    <slot />
  </OverlayScrollbarsComponent>
</template>

<style>
@import '../../../../node_modules/overlayscrollbars/styles/overlayscrollbars.min.css';
@import './index.scss';
</style>
