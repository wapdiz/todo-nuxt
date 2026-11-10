<template>
  <svg :class="elementClass" aria-hidden="true">
    <use :xlink:href="`#${name}`" />
  </svg>
</template>

<script setup>
defineProps({
  name: {
    type: String,
    required: true,
  },
});

// Настройки по умолчанию для плагина nuxt-svg-sprite-icon
const elementClass = 'svg-icon';
// const spriteName = 'icons'; // Измените, если в nuxt.config настроен другой defaultSprite
</script>
